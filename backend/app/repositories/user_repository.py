from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from app.core.db_errors import flush_changes
from app.database.models import RefreshToken, SyncDevice, User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(self, user_id: UUID) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        return self.db.scalar(select(User).where(User.email == email))

    def list(self, search: str | None, skip: int, limit: int) -> tuple[list[User], int]:
        query = select(User)
        if search:
            pattern = f"%{search.strip().lower()}%"
            query = query.where(
                or_(
                    func.lower(User.full_name).like(pattern),
                    func.lower(User.email).like(pattern),
                )
            )

        total = self.db.scalar(
            select(func.count()).select_from(query.order_by(None).subquery())
        ) or 0
        users = list(self.db.scalars(query.order_by(User.full_name, User.email).offset(skip).limit(limit)))
        return users, total

    def create(self, user: User) -> User:
        self.db.add(user)
        flush_changes(self.db)
        return user

    def revoke_sessions(self, user_id: UUID, revoked_at: datetime) -> None:
        self.db.execute(
            update(RefreshToken)
            .where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
            )
            .values(revoked_at=revoked_at)
        )
        self.db.execute(
            update(SyncDevice)
            .where(
                SyncDevice.user_id == user_id,
                SyncDevice.is_active.is_(True),
            )
            .values(is_active=False)
        )
