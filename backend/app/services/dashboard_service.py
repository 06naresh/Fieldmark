from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.permissions import is_admin
from app.repositories import DashboardRepository
from app.schemas.auth import CurrentUserResponse
from app.schemas.dashboard import DashboardSummary


class DashboardService:
    def __init__(self, db: Session) -> None:
        self.repository = DashboardRepository(db)

    def summary(self, current_user: CurrentUserResponse) -> DashboardSummary:
        admin = is_admin(current_user)
        user_id: UUID | None = None if admin else current_user.id

        counts = self.repository.inspection_counts(user_id)
        pending, failed, conflicts = self.repository.sync_counts(user_id)

        total_users: int | None = None
        active_inspectors: int | None = None
        if admin:
            total_users, active_inspectors = self.repository.user_counts()

        total_sites = self.repository.site_count(user_id)

        return DashboardSummary(
            **counts,
            total_users=total_users,
            active_inspectors=active_inspectors,
            total_sites=total_sites,
            pending_operations=pending,
            failed_operations=failed,
            open_conflicts=conflicts,
        )
