from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database.models import (
    Inspection,
    Site,
    SyncConflict,
    SyncOperation,
    User,
)


class DashboardRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def inspection_counts(self, user_id: UUID | None) -> dict[str, int]:
        query = select(Inspection.status, func.count()).group_by(Inspection.status)
        if user_id is not None:
            query = query.where(Inspection.assigned_to == user_id)
        counts = {str(status): int(total) for status, total in self.db.execute(query)}
        return {
            "total_inspections": sum(counts.values()),
            "assigned_inspections": counts.get("ASSIGNED", 0),
            "in_progress_inspections": counts.get("IN_PROGRESS", 0),
            "submitted_inspections": counts.get("SUBMITTED", 0),
            "reviewed_inspections": counts.get("REVIEWED", 0),
        }

    def user_counts(self) -> tuple[int, int]:
        total = self.db.scalar(select(func.count()).select_from(User)) or 0
        active_inspectors = self.db.scalar(
            select(func.count()).select_from(User).where(
                User.role == "INSPECTOR",
                User.is_active.is_(True),
            )
        ) or 0
        return int(total), int(active_inspectors)

    def site_count(self, user_id: UUID | None) -> int:
        query = select(func.count(func.distinct(Site.id))).select_from(Site)
        if user_id is not None:
            query = query.join(Inspection, Inspection.site_id == Site.id).where(
                Inspection.assigned_to == user_id
            )
        return int(self.db.scalar(query) or 0)

    def sync_counts(self, user_id: UUID | None) -> tuple[int, int, int]:
        operation_query = select(SyncOperation.result_status, func.count()).group_by(
            SyncOperation.result_status
        )
        conflict_query = (
            select(func.count())
            .select_from(SyncConflict)
            .join(SyncOperation, SyncConflict.operation_id == SyncOperation.id)
            .where(SyncConflict.status == "OPEN")
        )
        if user_id is not None:
            operation_query = operation_query.where(SyncOperation.user_id == user_id)
            conflict_query = conflict_query.where(SyncOperation.user_id == user_id)

        counts = {
            str(status): int(total) for status, total in self.db.execute(operation_query)
        }
        return (
            counts.get("CONFLICT", 0),
            counts.get("REJECTED", 0),
            int(self.db.scalar(conflict_query) or 0),
        )
