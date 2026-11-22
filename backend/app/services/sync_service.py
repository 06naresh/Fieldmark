"""Backend synchronization engine.

Push operations are processed in independent savepoints so one rejected
operation cannot roll back unrelated work. The business change, its change-feed
event and the idempotency ledger row are always committed together.
"""

from __future__ import annotations

import uuid
from typing import Any

from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db_errors import commit_transaction
from app.core.exceptions import (
    AppError,
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ServiceUnavailableError,
    UnprocessableEntityError,
    VersionConflictError,
)
from app.core.permissions import is_admin
from app.core.security import utc_now
from app.core.sync_identity import canonical_request_hash, decode_cursor, encode_cursor
from app.database.models import (
    Inspection,
    InspectionAnswer,
    InspectionResult,
    SyncConflict,
    SyncDevice,
    SyncOperation,
)
from app.repositories import ChecklistRepository, InspectionRepository, SyncRepository
from app.schemas.auth import CurrentUserResponse
from app.schemas.inspections import SubmitRequest
from app.schemas.sync import (
    PushResult,
    SyncChangeItem,
    SyncOperationRequest,
    SyncPullResponse,
    SyncStatusResponse,
)
from app.services.change_log import jsonable, log_change
from app.services.concurrency import check_version
from app.services.inspection_service import validate_answer_value

_EDITABLE_STATUSES = {"ASSIGNED", "IN_PROGRESS"}
_SUPPORTED_OPERATIONS = {
    ("inspection_answer", "CREATE"),
    ("inspection_answer", "UPDATE"),
    ("inspection_answer", "DELETE"),
    ("inspection", "UPDATE"),
    ("inspection", "SUBMIT"),
}


class SyncService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = SyncRepository(db)
        self.inspections = InspectionRepository(db)
        self.templates = ChecklistRepository(db)

    # ------------------------------------------------------------------ push

    def push(
        self,
        device: SyncDevice,
        current_user: CurrentUserResponse,
        operations: list[SyncOperationRequest],
    ) -> list[PushResult]:
        results = [
            self._process_operation(operation, device, current_user)
            for operation in operations
        ]
        device.last_seen_at = utc_now()
        commit_transaction(self.db)
        return results

    def _process_operation(
        self,
        operation: SyncOperationRequest,
        device: SyncDevice,
        current_user: CurrentUserResponse,
    ) -> PushResult:
        request_hash = canonical_request_hash(
            {
                "operation_id": str(operation.operation_id),
                "operation_type": operation.operation_type,
                "entity_type": operation.entity_type,
                "entity_id": str(operation.entity_id),
                "base_version": operation.base_version,
                "payload": operation.payload,
            }
        )

        existing = self.repository.get_operation(operation.operation_id)
        if existing is not None:
            if existing.request_hash != request_hash:
                return self._rejection(
                    operation,
                    "IDEMPOTENCY_VIOLATION",
                    "This operation ID was already used with a different payload.",
                )
            return self._replay(existing)

        try:
            with self.db.begin_nested():
                result = self._apply_operation(operation, current_user)
                self.db.add(
                    self._ledger(operation, device, current_user, request_hash, result)
                )
                self.db.flush()
            return result
        except IntegrityError:
            return self._resolve_race(operation, request_hash)
        except VersionConflictError as exc:
            return self._record_conflict(operation, device, current_user, request_hash, exc)
        except ServiceUnavailableError as exc:
            # Temporary failures are not terminal idempotency outcomes. The
            # savepoint rollback leaves no ledger row, so a retry with the same
            # operation ID can still be processed.
            return PushResult(
                operation_id=operation.operation_id,
                status="RETRYABLE_ERROR",
                entity_id=operation.entity_id,
                base_version=operation.base_version,
                message=exc.message,
            )
        except AppError as exc:
            # The push contract uses PERMISSION_DENIED for authorization
            # failures inside a batch, distinct from the HTTP error envelope.
            code = "PERMISSION_DENIED" if isinstance(exc, ForbiddenError) else exc.code
            return self._persist_outcome(
                operation,
                device,
                current_user,
                request_hash,
                self._rejection(operation, code, exc.message),
            )
        except ValidationError:
            return self._persist_outcome(
                operation,
                device,
                current_user,
                request_hash,
                self._rejection(operation, "VALIDATION_ERROR", "The operation payload is invalid."),
            )

    def _apply_operation(
        self, operation: SyncOperationRequest, current_user: CurrentUserResponse
    ) -> PushResult:
        key = (operation.entity_type, operation.operation_type)
        if key not in _SUPPORTED_OPERATIONS:
            raise UnprocessableEntityError(
                "This entity type and operation combination is not supported."
            )

        if operation.entity_type == "inspection_answer":
            return self._apply_answer(operation, current_user)
        if operation.operation_type == "SUBMIT":
            return self._apply_submission(operation, current_user)
        return self._apply_inspection_start(operation, current_user)

    def _apply_answer(
        self, operation: SyncOperationRequest, current_user: CurrentUserResponse
    ) -> PushResult:
        inspection_id = _as_uuid(
            _required(operation.payload, "inspection_id"), "inspection_id"
        )
        checklist_item_id = _as_uuid(
            _required(operation.payload, "checklist_item_id"), "checklist_item_id"
        )

        inspection = self.inspections.get_for_update(inspection_id)
        if inspection is None:
            raise NotFoundError("The requested inspection was not found.")
        self._require_inspection_access(inspection, current_user)
        self._require_editable(inspection)

        item = self.templates.get_item(checklist_item_id)
        if item is None or item.template_id != inspection.template_id:
            raise UnprocessableEntityError(
                "The checklist item does not belong to the assigned template revision."
            )

        value = operation.payload.get("answer_value")
        validate_answer_value(item, value)
        notes = operation.payload.get("notes")
        if notes is not None and not isinstance(notes, str):
            raise UnprocessableEntityError("notes must be text.")

        if operation.operation_type == "DELETE":
            answer = self.inspections.get_answer_for_update(inspection_id, checklist_item_id)
            if answer is None:
                raise NotFoundError("The requested answer was not found.")
            self._require_base_version(answer.version, operation.base_version, required=True)
            deleted_payload = _answer_payload(answer)
            tombstone_version = answer.version + 1
            self.db.delete(answer)
            log_change(
                self.db,
                entity_type="inspection_answer",
                entity_id=answer.id,
                change_type="DELETE",
                entity_version=tombstone_version,
                payload=deleted_payload,
                authorized_user_ids=[inspection.assigned_to],
            )
            return PushResult(
                operation_id=operation.operation_id,
                status="ACCEPTED",
                entity_id=answer.id,
                base_version=operation.base_version,
                server_version=tombstone_version,
                message="Operation synchronized successfully",
            )

        answer = self.inspections.get_answer_for_update(inspection_id, checklist_item_id)
        is_create = answer is None
        self._require_base_version(1 if is_create else answer.version, operation.base_version)

        if is_create:
            answer = InspectionAnswer(
                id=operation.entity_id,
                inspection_id=inspection_id,
                checklist_item_id=checklist_item_id,
                answer_value=value,
                notes=notes,
                version=1,
                last_modified_by=current_user.id,
            )
            self.db.add(answer)
        else:
            answer.answer_value = value
            answer.notes = notes
            answer.version += 1
            answer.last_modified_by = current_user.id

        self.db.flush()
        log_change(
            self.db,
            entity_type="inspection_answer",
            entity_id=answer.id,
            change_type="CREATE" if is_create else "UPDATE",
            entity_version=answer.version,
            payload=_answer_payload(answer),
            authorized_user_ids=[inspection.assigned_to],
        )
        return PushResult(
            operation_id=operation.operation_id,
            status="ACCEPTED",
            entity_id=answer.id,
            base_version=operation.base_version,
            server_version=answer.version,
            message="Operation synchronized successfully",
        )

    def _apply_inspection_start(
        self, operation: SyncOperationRequest, current_user: CurrentUserResponse
    ) -> PushResult:
        inspection = self.inspections.get_for_update(operation.entity_id)
        if inspection is None:
            raise NotFoundError("The requested inspection was not found.")
        self._require_inspection_access(inspection, current_user)
        self._require_base_version(inspection.version, operation.base_version, required=True)
        if inspection.status != "ASSIGNED":
            raise ConflictError("Only assigned inspections can be started.")

        inspection.status = "IN_PROGRESS"
        inspection.version += 1
        self.db.flush()
        log_change(
            self.db,
            entity_type="inspection",
            entity_id=inspection.id,
            change_type="UPDATE",
            entity_version=inspection.version,
            payload=_inspection_payload(inspection),
            authorized_user_ids=[inspection.assigned_to],
        )
        return PushResult(
            operation_id=operation.operation_id,
            status="ACCEPTED",
            entity_id=inspection.id,
            base_version=operation.base_version,
            server_version=inspection.version,
            message="Operation synchronized successfully",
        )

    def _apply_submission(
        self, operation: SyncOperationRequest, current_user: CurrentUserResponse
    ) -> PushResult:
        inspection = self.inspections.get_for_update(operation.entity_id)
        if inspection is None:
            raise NotFoundError("The requested inspection was not found.")
        self._require_inspection_access(inspection, current_user)
        self._require_base_version(inspection.version, operation.base_version, required=True)
        if inspection.status != "IN_PROGRESS":
            raise ConflictError("The inspection must be started before submission.")

        submission_id = _as_uuid(
            _required(operation.payload, "submission_id"), "submission_id"
        )
        submit = SubmitRequest(
            submission_id=submission_id,
            summary=operation.payload.get("summary"),
            overall_status=operation.payload.get("overall_status"),
            version=operation.base_version or 1,
        )

        answers = {
            answer.checklist_item_id: answer
            for answer in self.inspections.get_answers(inspection.id)
        }
        for item in self.templates.list_items(inspection.template_id):
            answer = answers.get(item.id)
            if item.is_required and (answer is None or answer.answer_value is None):
                raise UnprocessableEntityError(
                    f"A required answer is missing for: {item.question}"
                )
            if answer is not None:
                validate_answer_value(item, answer.answer_value)

        existing = self.inspections.get_result_by_submission_id(submission_id)
        if existing is not None:
            if (
                existing.inspection_id != inspection.id
                or existing.summary != submit.summary
                or existing.overall_status != submit.overall_status
                or existing.submitted_version != submit.version
            ):
                raise ConflictError("This submission_id was already used with different data.")
            return PushResult(
                operation_id=operation.operation_id,
                status="ACCEPTED",
                entity_id=inspection.id,
                base_version=operation.base_version,
                server_version=inspection.version,
                message="Operation synchronized successfully",
            )

        result = InspectionResult(
            inspection_id=inspection.id,
            submitted_by=current_user.id,
            submission_number=self.inspections.next_submission_number(inspection.id),
            submission_id=submit.submission_id,
            submitted_version=submit.version,
            submitted_at=utc_now(),
            summary=submit.summary,
            overall_status=submit.overall_status,
        )
        self.db.add(result)
        inspection.status = "SUBMITTED"
        inspection.version += 1
        self.db.flush()

        log_change(
            self.db,
            entity_type="inspection",
            entity_id=inspection.id,
            change_type="UPDATE",
            entity_version=inspection.version,
            payload=_inspection_payload(inspection),
            authorized_user_ids=[inspection.assigned_to],
        )
        log_change(
            self.db,
            entity_type="inspection_result",
            entity_id=result.id,
            change_type="CREATE",
            entity_version=1,
            payload=jsonable(
                {
                    "id": result.id,
                    "inspection_id": result.inspection_id,
                    "submission_id": result.submission_id,
                    "submission_number": result.submission_number,
                    "submitted_version": result.submitted_version,
                    "overall_status": result.overall_status,
                    "summary": result.summary,
                    "submitted_at": result.submitted_at,
                }
            ),
            authorized_user_ids=[inspection.assigned_to],
        )
        return PushResult(
            operation_id=operation.operation_id,
            status="ACCEPTED",
            entity_id=inspection.id,
            base_version=operation.base_version,
            server_version=inspection.version,
            message="Operation synchronized successfully",
        )

    # -------------------------------------------------------- idempotency

    @staticmethod
    def _replay(ledger: SyncOperation) -> PushResult:
        original = ledger.response_payload or {}
        return PushResult(
            operation_id=ledger.operation_id,
            status=ledger.result_status,  # type: ignore[arg-type]
            entity_id=uuid.UUID(str(original.get("entity_id", ledger.entity_id))),
            base_version=original.get("base_version"),
            server_version=original.get("server_version"),
            message=original.get("message"),
            error=original.get("error"),
        )

    def _resolve_race(
        self, operation: SyncOperationRequest, request_hash: str
    ) -> PushResult:
        winner = self.repository.get_operation(operation.operation_id)
        if winner is not None and winner.request_hash == request_hash:
            return self._replay(winner)
        return self._rejection(
            operation, "CONFLICT", "The request conflicts with existing data."
        )

    def _persist_outcome(
        self,
        operation: SyncOperationRequest,
        device: SyncDevice,
        current_user: CurrentUserResponse,
        request_hash: str,
        result: PushResult,
        *,
        conflict_data: dict[str, object] | None = None,
    ) -> PushResult:
        try:
            with self.db.begin_nested():
                ledger = self._ledger(operation, device, current_user, request_hash, result)
                self.db.add(ledger)
                self.db.flush()
                if conflict_data is not None:
                    self.db.add(SyncConflict(operation_id=ledger.id, **conflict_data))
                    self.db.flush()
            return result
        except IntegrityError:
            return self._resolve_race(operation, request_hash)

    def _record_conflict(
        self,
        operation: SyncOperationRequest,
        device: SyncDevice,
        current_user: CurrentUserResponse,
        request_hash: str,
        exc: VersionConflictError,
    ) -> PushResult:
        server_payload, server_version, entity_id = self._current_state(operation)
        result = PushResult(
            operation_id=operation.operation_id,
            status="CONFLICT",
            entity_id=entity_id,
            base_version=operation.base_version,
            server_version=server_version,
            message=exc.message,
        )
        conflict_data: dict[str, object] = {
            "entity_type": operation.entity_type,
            "entity_id": entity_id,
            "local_payload": operation.payload,
            "server_payload": server_payload,
            "base_version": operation.base_version,
            "server_version": server_version,
            "status": "OPEN",
        }
        return self._persist_outcome(
            operation, device, current_user, request_hash, result, conflict_data=conflict_data
        )

    @staticmethod
    def _rejection(operation: SyncOperationRequest, code: str, message: str) -> PushResult:
        return PushResult(
            operation_id=operation.operation_id,
            status="REJECTED",
            entity_id=operation.entity_id,
            base_version=operation.base_version,
            error={"code": code, "message": message},
        )

    @staticmethod
    def _ledger(
        operation: SyncOperationRequest,
        device: SyncDevice,
        current_user: CurrentUserResponse,
        request_hash: str,
        result: PushResult,
    ) -> SyncOperation:
        return SyncOperation(
            operation_id=operation.operation_id,
            user_id=current_user.id,
            device_id=device.id,
            entity_type=operation.entity_type,
            entity_id=operation.entity_id,
            operation_type=operation.operation_type,
            request_hash=request_hash,
            result_status=result.status,
            response_payload=result.model_dump(mode="json"),
        )

    # -------------------------------------------------------------- helpers

    @staticmethod
    def _require_inspection_access(
        inspection: Inspection, current_user: CurrentUserResponse
    ) -> None:
        if not is_admin(current_user) and inspection.assigned_to != current_user.id:
            raise ForbiddenError("You are not permitted to update this inspection.")

    @staticmethod
    def _require_editable(inspection: Inspection) -> None:
        if inspection.status not in _EDITABLE_STATUSES:
            raise ConflictError("The inspection is not in an editable state.")

    @staticmethod
    def _require_base_version(
        current: int, expected: int | None, *, required: bool = False
    ) -> None:
        if expected is None:
            if required:
                raise UnprocessableEntityError("base_version is required for this operation.")
            return
        check_version(current, expected, "record")

    def _current_state(
        self, operation: SyncOperationRequest
    ) -> tuple[dict[str, Any], int | None, uuid.UUID]:
        fallback = operation.entity_id
        if operation.entity_type == "inspection_answer":
            try:
                inspection_id = _as_uuid(operation.payload.get("inspection_id"), "inspection_id")
                item_id = _as_uuid(
                    operation.payload.get("checklist_item_id"), "checklist_item_id"
                )
            except UnprocessableEntityError:
                return {}, None, fallback
            answer = self.inspections.get_answer_for_update(inspection_id, item_id)
            if answer is None:
                return {}, 1, fallback
            return _answer_payload(answer), answer.version, answer.id

        if operation.entity_type == "inspection":
            inspection = self.inspections.get(operation.entity_id)
            if inspection is None:
                return {}, None, fallback
            return _inspection_payload(inspection), inspection.version, inspection.id

        return {}, None, fallback

    # ------------------------------------------------------------ pull/status

    def pull(
        self,
        current_user: CurrentUserResponse,
        cursor: str | None,
        limit: int | None,
    ) -> SyncPullResponse:
        position = decode_cursor(cursor)
        page_size = min(
            settings.SYNC_MAX_PULL_LIMIT,
            settings.SYNC_MAX_PULL_LIMIT if limit is None else max(1, limit),
        )
        changes = self.repository.list_changes(
            position=position,
            limit=page_size + 1,
            is_admin=is_admin(current_user),
            user_id=current_user.id,
        )
        has_more = len(changes) > page_size
        page = changes[:page_size]
        next_position = page[-1].change_position if page else position
        return SyncPullResponse(
            changes=[
                SyncChangeItem(
                    change_id=change.id,
                    entity_type=change.entity_type,
                    entity_id=change.entity_id,
                    change_type=change.change_type,  # type: ignore[arg-type]
                    entity_version=change.entity_version,
                    payload=change.payload,
                )
                for change in page
            ],
            next_cursor=encode_cursor(next_position),
            has_more=has_more,
        )

    def status(
        self, device: SyncDevice, current_user: CurrentUserResponse
    ) -> SyncStatusResponse:
        return SyncStatusResponse(
            device_id=device.id,
            is_active=device.is_active,
            last_seen_at=device.last_seen_at,
            open_conflicts=self.repository.count_open_conflicts(
                is_admin=is_admin(current_user), user_id=current_user.id
            ),
        )


def _required(payload: dict[str, Any], field: str) -> Any:
    if field not in payload:
        raise UnprocessableEntityError(f"payload.{field} is required.")
    return payload[field]


def _as_uuid(value: Any, field: str) -> uuid.UUID:
    if isinstance(value, uuid.UUID):
        return value
    try:
        return uuid.UUID(str(value))
    except (ValueError, TypeError, AttributeError) as exc:
        raise UnprocessableEntityError(f"{field} must be a UUID.") from exc


def _inspection_payload(inspection: Inspection) -> dict[str, Any]:
    return jsonable(
        {
            "id": inspection.id,
            "site_id": inspection.site_id,
            "template_id": inspection.template_id,
            "template_version": inspection.template_version,
            "assigned_to": inspection.assigned_to,
            "title": inspection.title,
            "instructions": inspection.instructions,
            "status": inspection.status,
            "version": inspection.version,
        }
    )


def _answer_payload(answer: InspectionAnswer) -> dict[str, Any]:
    return jsonable(
        {
            "id": answer.id,
            "inspection_id": answer.inspection_id,
            "checklist_item_id": answer.checklist_item_id,
            "answer_value": answer.answer_value,
            "notes": answer.notes,
            "version": answer.version,
        }
    )
