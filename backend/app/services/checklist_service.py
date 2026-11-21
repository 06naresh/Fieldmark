from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    UnprocessableEntityError,
)
from app.database.models import ChecklistItem, ChecklistTemplate
from app.repositories import ChecklistRepository
from app.schemas.checklists import (
    ChecklistItemCreate,
    ChecklistItemResponse,
    ChecklistItemUpdate,
    ChecklistTemplateCreate,
    ChecklistTemplateResponse,
    ChecklistTemplateStatusUpdate,
    TemplateRevisionCreate,
    extract_choices,
)
from app.core.db_errors import commit_transaction
from app.services.change_log import log_change


class ChecklistService:
    def __init__(self, db: Session) -> None:
        self.repository = ChecklistRepository(db)

    def create(self, payload: ChecklistTemplateCreate, created_by: UUID) -> ChecklistTemplate:
        template = self.repository.create_template(
            name=payload.name,
            description=payload.description,
            created_by=created_by,
            template_version=1,
            items=payload.items,
        )
        self._log_template_change(template, "CREATE")
        self._commit()
        return template

    def list(
        self,
        *,
        is_active: bool | None,
        search: str | None,
        authorized_template_ids: list[UUID] | None,
        skip: int,
        limit: int,
    ) -> tuple[list[ChecklistTemplate], int]:
        return self.repository.list_templates(
            is_active=is_active,
            search=search,
            authorized_template_ids=authorized_template_ids,
            skip=skip,
            limit=limit,
        )

    def get(
        self,
        template_id: UUID,
        template_version: int | None = None,
        *,
        for_update: bool = False,
    ) -> ChecklistTemplate:
        template = self.repository.get_template(
            template_id, template_version, for_update=for_update
        )
        if template is None:
            raise NotFoundError("The requested checklist template was not found.")
        return template

    def create_revision(
        self, template_id: UUID, payload: TemplateRevisionCreate, created_by: UUID
    ) -> ChecklistTemplate:
        source = self.get(template_id)
        template_version = self.repository.next_template_version(source)
        revision = self.repository.create_template(
            name=payload.name,
            description=payload.description,
            created_by=created_by,
            template_version=template_version,
            items=payload.items,
            template_key=source.template_key,
        )
        self._log_template_change(revision, "CREATE")
        self._commit()
        return revision

    def add_item(
        self, template_id: UUID, payload: ChecklistItemCreate
    ) -> ChecklistItem:
        template = self.get(template_id, for_update=True)
        self._require_editable(template)

        if self._has_display_order(template_id, payload.display_order):
            raise ConflictError("display_order is already used in this template.")

        item = self.repository.add_item(template, payload)
        template.version += 1
        self._log_template_change(template, "UPDATE")
        log_change(
            self.repository.db,
            entity_type="checklist_item",
            entity_id=item.id,
            change_type="CREATE",
            entity_version=template.version,
            payload=item_response(item).model_dump(mode="json"),
            is_global=True,
        )
        self._commit()
        return item

    def update_item(
        self, template_id: UUID, item_id: UUID, payload: ChecklistItemUpdate
    ) -> ChecklistItem:
        template = self.get(template_id, for_update=True)
        self._require_editable(template)

        item = self.repository.get_item(item_id)
        if item is None or item.template_id != template_id:
            raise NotFoundError("The requested checklist item was not found.")

        if (
            payload.display_order is not None
            and payload.display_order != item.display_order
            and self._has_display_order(template_id, payload.display_order)
        ):
            raise ConflictError("display_order is already used in this template.")

        updates = payload.model_dump(exclude_unset=True)
        final_options = updates.get("options", item.options)
        if item.response_type in {"SINGLE_CHOICE", "MULTIPLE_CHOICE"} and not extract_choices(
            final_options
        ):
            raise UnprocessableEntityError("Choice questions require non-empty options.")

        for field in ("question", "description", "is_required", "display_order", "options"):
            if field in updates:
                setattr(item, field, updates[field])
        template.version += 1
        self._log_template_change(template, "UPDATE")
        log_change(
            self.repository.db,
            entity_type="checklist_item",
            entity_id=item.id,
            change_type="UPDATE",
            entity_version=template.version,
            payload=item_response(item).model_dump(mode="json"),
            is_global=True,
        )
        self._commit()
        return item

    def set_status(
        self, template_id: UUID, payload: ChecklistTemplateStatusUpdate
    ) -> ChecklistTemplate:
        template = self.get(template_id, for_update=True)
        template.is_active = payload.is_active
        template.version += 1
        self._log_template_change(template, "UPDATE")
        self._commit()
        return template

    def _require_editable(self, template: ChecklistTemplate) -> None:
        if self.repository.revision_has_inspections(template.id, template.template_version):
            raise ConflictError("A published template revision cannot be modified.")

    def _has_display_order(self, template_id: UUID, display_order: int) -> bool:
        return any(item.display_order == display_order for item in self.get(template_id).items)

    def _log_template_change(
        self, template: ChecklistTemplate, change_type: str
    ) -> None:
        log_change(
            self.repository.db,
            entity_type="checklist_template",
            entity_id=template.id,
            change_type=change_type,
            entity_version=template.version,
            payload=template_response(template).model_dump(mode="json"),
            is_global=True,
        )

    def _commit(self) -> None:
        commit_transaction(self.repository.db)


def item_response(item: ChecklistItem) -> ChecklistItemResponse:
    return ChecklistItemResponse(
        id=item.id,
        question=item.question,
        description=item.description,
        response_type=item.response_type,
        is_required=item.is_required,
        display_order=item.display_order,
        options=item.options,
    )


def template_response(template: ChecklistTemplate) -> ChecklistTemplateResponse:
    return ChecklistTemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        template_version=template.template_version,
        is_active=template.is_active,
        version=template.version,
        items=[item_response(item) for item in sorted(template.items, key=lambda x: x.display_order)],
    )
