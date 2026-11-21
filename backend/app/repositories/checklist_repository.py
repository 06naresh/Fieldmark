from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.db_errors import flush_changes
from app.database.models import ChecklistItem, ChecklistTemplate, Inspection
from app.schemas.checklists import ChecklistItemCreate


class ChecklistRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_template(
        self,
        template_id: UUID,
        template_version: int | None = None,
        *,
        for_update: bool = False,
    ) -> ChecklistTemplate | None:
        query = (
            select(ChecklistTemplate)
            .options(selectinload(ChecklistTemplate.items))
            .where(ChecklistTemplate.id == template_id)
        )
        if template_version is not None:
            query = query.where(ChecklistTemplate.template_version == template_version)
        if for_update:
            query = query.with_for_update()
        return self.db.scalar(query)

    def list_templates(
        self,
        *,
        is_active: bool | None,
        search: str | None,
        authorized_template_ids: list[UUID] | None,
        skip: int,
        limit: int,
    ) -> tuple[list[ChecklistTemplate], int]:
        query = select(ChecklistTemplate).options(selectinload(ChecklistTemplate.items))

        if authorized_template_ids is not None:
            if not authorized_template_ids:
                return [], 0
            query = query.where(ChecklistTemplate.id.in_(authorized_template_ids))
        if is_active is not None:
            query = query.where(ChecklistTemplate.is_active.is_(is_active))
        if search:
            query = query.where(func.lower(ChecklistTemplate.name).like(f"%{search.strip().lower()}%"))

        total = self.db.scalar(
            select(func.count()).select_from(query.order_by(None).subquery())
        ) or 0
        templates = list(
            self.db.scalars(query.order_by(ChecklistTemplate.name).offset(skip).limit(limit))
        )
        return templates, total

    def authorized_template_ids(self, user_id: UUID) -> list[UUID]:
        return list(
            self.db.scalars(
                select(Inspection.template_id)
                .where(Inspection.assigned_to == user_id)
                .distinct()
            )
        )

    def next_template_version(self, source: ChecklistTemplate) -> int:
        # A revision is a separate row, so locking only the source would still
        # allow a second request to read the same source version. Lock every
        # row in the lineage, then allocate from committed state.
        self.db.execute(
            select(ChecklistTemplate.id)
            .where(ChecklistTemplate.template_key == source.template_key)
            .with_for_update()
        ).all()
        next_version = self.db.scalar(
            select(func.coalesce(func.max(ChecklistTemplate.template_version), 0) + 1).where(
                ChecklistTemplate.template_key == source.template_key
            )
        )
        return int(next_version)

    def create_template(
        self,
        *,
        name: str,
        description: str | None,
        created_by: UUID,
        template_version: int,
        items: list[ChecklistItemCreate],
        template_key: UUID | None = None,
    ) -> ChecklistTemplate:
        values: dict[str, object] = {
            "name": name,
            "description": description,
            "created_by": created_by,
            "template_version": template_version,
            "is_active": True,
            "version": 1,
        }
        if template_key is not None:
            values["template_key"] = template_key
        template = ChecklistTemplate(**values)
        self.db.add(template)
        flush_changes(self.db)
        self._add_items(template, items)
        return template

    def _add_items(self, template: ChecklistTemplate, items: list[ChecklistItemCreate]) -> None:
        for item in items:
            self.db.add(
                ChecklistItem(
                    template_id=template.id,
                    question=item.question,
                    description=item.description,
                    response_type=item.response_type,
                    is_required=item.is_required,
                    display_order=item.display_order,
                    options=item.options,
                )
            )
        flush_changes(self.db)

    def get_item(self, item_id: UUID) -> ChecklistItem | None:
        return self.db.get(ChecklistItem, item_id)

    def list_items(self, template_id: UUID) -> list[ChecklistItem]:
        return list(
            self.db.scalars(
                select(ChecklistItem)
                .where(ChecklistItem.template_id == template_id)
                .order_by(ChecklistItem.display_order)
            )
        )

    def add_item(self, template: ChecklistTemplate, item: ChecklistItemCreate) -> ChecklistItem:
        checklist_item = ChecklistItem(
            template_id=template.id,
            question=item.question,
            description=item.description,
            response_type=item.response_type,
            is_required=item.is_required,
            display_order=item.display_order,
            options=item.options,
        )
        self.db.add(checklist_item)
        flush_changes(self.db)
        return checklist_item

    def revision_has_inspections(self, template_id: UUID, template_version: int) -> bool:
        return (
            self.db.scalar(
                select(Inspection.id)
                .where(
                    Inspection.template_id == template_id,
                    Inspection.template_version == template_version,
                )
                .limit(1)
            )
            is not None
        )
