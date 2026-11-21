from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.database.models import SyncChange, SyncConflict, SyncOperation
from app.schemas.sync import ConflictStatus


class SyncRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_operation(self, operation_id: UUID) -> SyncOperation | None:
        return self.db.scalar(
            select(SyncOperation).where(SyncOperation.operation_id == operation_id)
        )

    def list_changes(
        self,
        *,
        position: int,
        limit: int,
        is_admin: bool,
        user_id: UUID,
    ) -> list[SyncChange]:
        query = select(SyncChange).where(SyncChange.change_position > position)
        if not is_admin:
            query = query.where(
                or_(
                    SyncChange.is_global.is_(True),
                    SyncChange.authorized_user_ids.contains([str(user_id)]),
                )
            )
        return list(
            self.db.scalars(
                query.order_by(SyncChange.change_position.asc()).limit(limit)
            ).all()
        )

    def list_conflicts(
        self,
        *,
        is_admin: bool,
        user_id: UUID,
        status: ConflictStatus | None,
        skip: int,
        limit: int,
    ) -> tuple[list[SyncConflict], int]:
        base = select(SyncConflict).join(
            SyncOperation, SyncConflict.operation_id == SyncOperation.id
        )
        count_query = (
            select(func.count())
            .select_from(SyncConflict)
            .join(SyncOperation, SyncConflict.operation_id == SyncOperation.id)
        )

        if not is_admin:
            base = base.where(SyncOperation.user_id == user_id)
            count_query = count_query.where(SyncOperation.user_id == user_id)
        if status is not None:
            base = base.where(SyncConflict.status == status)
            count_query = count_query.where(SyncConflict.status == status)

        total = int(self.db.scalar(count_query) or 0)
        conflicts = list(
            self.db.scalars(
                base.order_by(SyncConflict.created_at.desc(), SyncConflict.id).offset(skip).limit(limit)
            ).all()
        )
        return conflicts, total

    def get_conflict(self, conflict_id: UUID) -> SyncConflict | None:
        return self.db.scalar(
            select(SyncConflict)
            .join(SyncOperation, SyncConflict.operation_id == SyncOperation.id)
            .where(SyncConflict.id == conflict_id)
        )

    def count_open_conflicts(self, *, is_admin: bool, user_id: UUID) -> int:
        query = (
            select(func.count())
            .select_from(SyncConflict)
            .join(SyncOperation, SyncConflict.operation_id == SyncOperation.id)
            .where(SyncConflict.status == "OPEN")
        )
        if not is_admin:
            query = query.where(SyncOperation.user_id == user_id)
        return int(self.db.scalar(query) or 0)
