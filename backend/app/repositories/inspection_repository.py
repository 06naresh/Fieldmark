from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.db_errors import flush_changes
from app.database.models import Inspection, InspectionAnswer, InspectionResult
from app.schemas.inspections import InspectionStatus


class InspectionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, inspection_id: UUID) -> Inspection | None:
        return self.db.get(Inspection, inspection_id)

    def get_for_update(self, inspection_id: UUID) -> Inspection | None:
        return self.db.scalar(
            select(Inspection)
            .where(Inspection.id == inspection_id)
            .with_for_update()
        )

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
        query = select(Inspection)
        if not is_admin:
            query = query.where(Inspection.assigned_to == user_id)
        if status is not None:
            query = query.where(Inspection.status == status)
        if site_id is not None:
            query = query.where(Inspection.site_id == site_id)
        if search:
            pattern = f"%{search.strip().lower()}%"
            query = query.where(func.lower(Inspection.title).like(pattern))

        total = self.db.scalar(
            select(func.count()).select_from(query.order_by(None).subquery())
        ) or 0
        inspections = list(
            self.db.scalars(
                query.options(selectinload(Inspection.site), selectinload(Inspection.template))
                .order_by(Inspection.created_at.desc())
                .offset(skip)
                .limit(limit)
            )
        )
        return inspections, total

    def create(self, inspection: Inspection) -> Inspection:
        self.db.add(inspection)
        flush_changes(self.db)
        return inspection

    def get_answers(self, inspection_id: UUID) -> list[InspectionAnswer]:
        return list(
            self.db.scalars(
                select(InspectionAnswer)
                .where(InspectionAnswer.inspection_id == inspection_id)
                .order_by(InspectionAnswer.checklist_item_id)
            )
        )

    def get_answer_for_update(
        self, inspection_id: UUID, checklist_item_id: UUID
    ) -> InspectionAnswer | None:
        return self.db.scalar(
            select(InspectionAnswer)
            .where(
                InspectionAnswer.inspection_id == inspection_id,
                InspectionAnswer.checklist_item_id == checklist_item_id,
            )
            .with_for_update()
        )

    def create_answer(self, answer: InspectionAnswer) -> InspectionAnswer:
        self.db.add(answer)
        flush_changes(self.db)
        return answer

    def get_result_by_submission_id(self, submission_id: UUID) -> InspectionResult | None:
        return self.db.scalar(
            select(InspectionResult).where(InspectionResult.submission_id == submission_id)
        )

    def next_submission_number(self, inspection_id: UUID) -> int:
        current = self.db.scalar(
            select(func.coalesce(func.max(InspectionResult.submission_number), 0)).where(
                InspectionResult.inspection_id == inspection_id
            )
        )
        return int(current or 0) + 1

    def create_result(self, result: InspectionResult) -> InspectionResult:
        self.db.add(result)
        flush_changes(self.db)
        return result
