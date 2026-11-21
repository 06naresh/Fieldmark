from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import (
    ConflictError,
    NotFoundError,
    UnprocessableEntityError,
    VersionConflictError,
)
from app.core.security import utc_now
from app.database.models import ChecklistItem, Inspection, InspectionAnswer, InspectionResult
from app.repositories import ChecklistRepository, InspectionRepository, SiteRepository
from app.repositories import UserRepository
from app.schemas.checklists import extract_choices
from app.schemas.inspections import (
    AnswerResponse,
    AnswerSaveRequest,
    InspectionCreate,
    InspectionDetailResponse,
    InspectionResponse,
    InspectionStatus,
    InspectionUpdate,
    StartRequest,
    StartResponse,
    SubmitRequest,
    SubmitResponse,
)
from app.services.checklist_service import item_response, template_response
from app.core.db_errors import commit_transaction
from app.services.change_log import jsonable, log_change
from app.services.concurrency import check_version
from app.services.site_service import site_response

_EDITABLE_STATUSES = {"ASSIGNED", "IN_PROGRESS"}


class InspectionService:
    def __init__(self, db: Session) -> None:
        self.repository = InspectionRepository(db)
        self.sites = SiteRepository(db)
        self.templates = ChecklistRepository(db)
        self.users = UserRepository(db)

    def create(self, payload: InspectionCreate, created_by: UUID) -> Inspection:
        site = self.sites.get(payload.site_id)
        if site is None or not site.is_active:
            raise UnprocessableEntityError("The site must exist and be active.")

        template = self.templates.get_template(payload.template_id, payload.template_version)
        if template is None or not template.is_active:
            raise UnprocessableEntityError("The template revision must exist and be active.")

        assigned_user = self.users.get_by_id(payload.assigned_to)
        if assigned_user is None or not assigned_user.is_active or assigned_user.role != "INSPECTOR":
            raise UnprocessableEntityError(
                "The assigned user must be an active inspector."
            )

        inspection = Inspection(
            site_id=payload.site_id,
            template_id=payload.template_id,
            template_version=payload.template_version,
            assigned_to=payload.assigned_to,
            created_by=created_by,
            title=payload.title,
            instructions=payload.instructions,
            scheduled_at=payload.scheduled_at,
            due_at=payload.due_at,
            status="ASSIGNED",
            version=1,
        )
        self.repository.create(inspection)
        self._log_inspection(inspection, "CREATE")
        self._commit()
        return inspection

    def list(
        self,
        *,
        is_admin: bool,
        user_id: UUID,
        status: InspectionStatus | None,
        site_id: UUID | None,
        search: str | None,
        skip: int,
        limit: int,
    ) -> tuple[list[Inspection], int]:
        return self.repository.list(
            is_admin=is_admin,
            user_id=user_id,
            status=status,
            site_id=site_id,
            search=search,
            skip=skip,
            limit=limit,
        )

    def get(self, inspection_id: UUID) -> Inspection:
        inspection = self.repository.get(inspection_id)
        if inspection is None:
            raise NotFoundError("The requested inspection was not found.")
        return inspection

    def detail(self, inspection: Inspection) -> InspectionDetailResponse:
        site = self.sites.get(inspection.site_id)
        template = self.templates.get_template(inspection.template_id, inspection.template_version)
        if site is None or template is None:
            raise NotFoundError("The inspection references a missing resource.")

        return InspectionDetailResponse(
            **_base_fields(inspection),
            site=site_response(site).model_dump(mode="json"),
            template=template_response(template).model_dump(mode="json"),
            checklist_items=[
                item_response(item).model_dump(mode="json")
                for item in self.templates.list_items(template.id)
            ],
            answers=[answer_response(answer) for answer in self.repository.get_answers(inspection.id)],
        )

    def update(self, inspection: Inspection, payload: InspectionUpdate) -> Inspection:
        check_version(inspection.version, payload.version, "inspection")
        self._require_editable(inspection)

        updates = payload.model_dump(exclude_unset=True, exclude={"version"})
        for field in ("title", "instructions", "scheduled_at", "due_at"):
            if field in updates:
                setattr(inspection, field, updates[field])
        if (
            inspection.scheduled_at is not None
            and inspection.due_at is not None
            and inspection.due_at < inspection.scheduled_at
        ):
            raise UnprocessableEntityError("due_at must not be earlier than scheduled_at.")

        inspection.version += 1
        self._log_inspection(inspection, "UPDATE")
        self._commit()
        return inspection

    def start(self, inspection: Inspection, payload: StartRequest) -> StartResponse:
        check_version(inspection.version, payload.version, "inspection")
        if inspection.status != "ASSIGNED":
            raise ConflictError("Only assigned inspections can be started.")

        inspection.status = "IN_PROGRESS"
        inspection.version += 1
        self._log_inspection(inspection, "UPDATE")
        self._commit()
        return StartResponse(
            id=inspection.id, status=inspection.status, version=inspection.version
        )

    def save_answer(
        self,
        inspection: Inspection,
        checklist_item_id: UUID,
        payload: AnswerSaveRequest,
        actor_id: UUID,
    ) -> InspectionAnswer:
        self._require_editable(inspection)

        item = self.templates.get_item(checklist_item_id)
        if item is None or item.template_id != inspection.template_id:
            raise UnprocessableEntityError(
                "The checklist item does not belong to the assigned template revision."
            )
        validate_answer_value(item, payload.answer_value)

        answer = self.repository.get_answer_for_update(inspection.id, checklist_item_id)
        expected_base_version = 1 if answer is None else answer.version
        if payload.base_version != expected_base_version:
            raise VersionConflictError("The answer has changed. Reload it before saving again.")

        is_new = answer is None
        if is_new:
            answer = InspectionAnswer(
                inspection_id=inspection.id,
                checklist_item_id=checklist_item_id,
                answer_value=payload.answer_value,
                notes=payload.notes,
                version=1,
                last_modified_by=actor_id,
            )
            self.repository.create_answer(answer)
        else:
            answer.answer_value = payload.answer_value
            answer.notes = payload.notes
            answer.version += 1
            answer.last_modified_by = actor_id

        log_change(
            self.repository.db,
            entity_type="inspection_answer",
            entity_id=answer.id,
            change_type="CREATE" if is_new else "UPDATE",
            entity_version=answer.version,
            payload=answer_response(answer).model_dump(mode="json"),
            authorized_user_ids=[inspection.assigned_to],
        )
        self._commit()
        return answer

    def get_answers(self, inspection_id: UUID) -> list[InspectionAnswer]:
        return self.repository.get_answers(inspection_id)

    def submit(
        self, inspection: Inspection, payload: SubmitRequest, actor_id: UUID
    ) -> SubmitResponse:
        existing = self.repository.get_result_by_submission_id(payload.submission_id)
        if existing is not None:
            if existing.inspection_id != inspection.id:
                raise ConflictError("This submission_id belongs to another inspection.")
            if (
                existing.summary != payload.summary
                or existing.overall_status != payload.overall_status
                or existing.submitted_version != payload.version
            ):
                raise ConflictError("This submission_id was already used with different data.")
            return _submit_response(existing)

        check_version(inspection.version, payload.version, "inspection")
        if inspection.status != "IN_PROGRESS":
            raise ConflictError("The inspection must be started before submission.")

        answers = {answer.checklist_item_id: answer for answer in self.repository.get_answers(inspection.id)}
        items = self.templates.list_items(inspection.template_id)
        for item in items:
            answer = answers.get(item.id)
            if item.is_required and (answer is None or answer.answer_value is None):
                raise UnprocessableEntityError(
                    f"A required answer is missing for: {item.question}"
                )
            if answer is not None:
                validate_answer_value(item, answer.answer_value)

        result = InspectionResult(
            inspection_id=inspection.id,
            submitted_by=actor_id,
            submission_number=self.repository.next_submission_number(inspection.id),
            submission_id=payload.submission_id,
            submitted_version=payload.version,
            submitted_at=utc_now(),
            summary=payload.summary,
            overall_status=payload.overall_status,
        )
        self.repository.create_result(result)
        inspection.status = "SUBMITTED"
        inspection.version += 1
        self._log_inspection(inspection, "UPDATE")
        log_change(
            self.repository.db,
            entity_type="inspection_result",
            entity_id=result.id,
            change_type="CREATE",
            entity_version=1,
            payload=jsonable(
                {
                    "id": result.id,
                    "inspection_id": result.inspection_id,
                    "submission_id": result.submission_id,
                    "overall_status": result.overall_status,
                    "summary": result.summary,
                    "submitted_at": result.submitted_at,
                }
            ),
            authorized_user_ids=[inspection.assigned_to],
        )
        try:
            self._commit()
        except ConflictError:
            # A concurrent request with the same submission_id won the unique
            # constraint race. Return its committed result for safe retries.
            committed = self.repository.get_result_by_submission_id(payload.submission_id)
            if (
                committed is not None
                and committed.inspection_id == inspection.id
                and committed.summary == payload.summary
                and committed.overall_status == payload.overall_status
                and committed.submitted_version == payload.version
            ):
                return _submit_response(committed)
            raise
        return _submit_response(result)

    def _require_editable(self, inspection: Inspection) -> None:
        if inspection.status not in _EDITABLE_STATUSES:
            raise ConflictError("The inspection is not in an editable state.")

    def _log_inspection(self, inspection: Inspection, change_type: str) -> None:
        log_change(
            self.repository.db,
            entity_type="inspection",
            entity_id=inspection.id,
            change_type=change_type,
            entity_version=inspection.version,
            payload=jsonable(_base_fields(inspection)),
            authorized_user_ids=[inspection.assigned_to],
        )

    def _commit(self) -> None:
        commit_transaction(self.repository.db)


def validate_answer_value(item: ChecklistItem, value: object) -> None:
    if value is None:
        return

    response_type = item.response_type
    if response_type == "YES_NO" and not isinstance(value, bool):
        raise UnprocessableEntityError("This answer must be a boolean.")
    if response_type == "TEXT" and not isinstance(value, str):
        raise UnprocessableEntityError("This answer must be text.")
    if response_type == "NUMBER" and (
        isinstance(value, bool) or not isinstance(value, (int, float))
    ):
        raise UnprocessableEntityError("This answer must be a number.")

    choices = extract_choices(item.options)
    if response_type == "SINGLE_CHOICE":
        if not isinstance(value, str) or value not in choices:
            raise UnprocessableEntityError("This answer must be one of the configured choices.")
    if response_type == "MULTIPLE_CHOICE":
        if not isinstance(value, list) or any(
            not isinstance(choice, str) or choice not in choices for choice in value
        ):
            raise UnprocessableEntityError("This answer must use configured choices.")


def _base_fields(inspection: Inspection) -> dict[str, object]:
    return {
        "id": inspection.id,
        "site_id": inspection.site_id,
        "template_id": inspection.template_id,
        "template_version": inspection.template_version,
        "assigned_to": inspection.assigned_to,
        "title": inspection.title,
        "instructions": inspection.instructions,
        "scheduled_at": inspection.scheduled_at,
        "due_at": inspection.due_at,
        "status": inspection.status,
        "version": inspection.version,
    }


def inspection_response(inspection: Inspection) -> InspectionResponse:
    return InspectionResponse(**_base_fields(inspection))


def answer_response(answer: InspectionAnswer) -> AnswerResponse:
    return AnswerResponse(
        id=answer.id,
        inspection_id=answer.inspection_id,
        checklist_item_id=answer.checklist_item_id,
        answer_value=answer.answer_value,
        notes=answer.notes,
        version=answer.version,
    )


def _submit_response(result: InspectionResult) -> SubmitResponse:
    return SubmitResponse(
        result_id=result.id,
        inspection_id=result.inspection_id,
        submission_number=result.submission_number,
        overall_status=result.overall_status,
        submitted_at=result.submitted_at,
        inspection_status="SUBMITTED",
    )
