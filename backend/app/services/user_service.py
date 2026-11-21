from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.core.security import hash_password, utc_now
from app.database.models import User
from app.repositories import UserRepository
from app.schemas.users import UserCreate, UserResponse, UserStatusUpdate, UserUpdate
from app.core.db_errors import commit_transaction
from app.services.change_log import log_change


class UserService:
    def __init__(self, db: Session) -> None:
        self.repository = UserRepository(db)

    def create(self, payload: UserCreate) -> User:
        if self.repository.get_by_email(payload.email) is not None:
            raise ConflictError("A user with this email already exists.")

        user = User(
            full_name=payload.full_name,
            email=payload.email,
            password_hash=hash_password(payload.password),
            role=payload.role,
            is_active=True,
        )
        self.repository.create(user)
        self._log_user(user, "CREATE")
        self._commit()
        return user

    def list(self, search: str | None, skip: int, limit: int) -> tuple[list[User], int]:
        return self.repository.list(search, skip, limit)

    def get(self, user_id: UUID) -> User:
        user = self.repository.get_by_id(user_id)
        if user is None:
            raise NotFoundError("The requested user was not found.")
        return user

    def update(self, user_id: UUID, actor_id: UUID, payload: UserUpdate) -> User:
        user = self.get(user_id)

        if user_id == actor_id:
            if payload.role is not None and payload.role != user.role:
                raise ForbiddenError("You cannot change your own role.")
            if payload.is_active is False:
                raise ForbiddenError("You cannot deactivate your own account.")

        if payload.full_name is not None:
            user.full_name = payload.full_name
        if payload.role is not None:
            user.role = payload.role
        if payload.is_active is not None:
            user.is_active = payload.is_active
            if not payload.is_active:
                self.repository.revoke_sessions(user_id, utc_now())

        self._log_user(user, "UPDATE")
        self._commit()
        return user

    def set_status(
        self, user_id: UUID, actor_id: UUID, payload: UserStatusUpdate
    ) -> User:
        if user_id == actor_id and not payload.is_active:
            raise ForbiddenError("You cannot deactivate your own account.")

        user = self.get(user_id)
        user.is_active = payload.is_active
        if not payload.is_active:
            self.repository.revoke_sessions(user_id, utc_now())
        self._log_user(user, "UPDATE")
        self._commit()
        return user

    def _log_user(self, user: User, change_type: str) -> None:
        # Never expose the password hash through the change feed.
        log_change(
            self.repository.db,
            entity_type="user",
            entity_id=user.id,
            change_type=change_type,
            entity_version=None,
            payload=user_response(user).model_dump(mode="json"),
            authorized_user_ids=[user.id],
        )

    def _commit(self) -> None:
        commit_transaction(self.repository.db)


def user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
    )
