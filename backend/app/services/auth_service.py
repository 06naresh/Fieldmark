import hashlib
from dataclasses import dataclass
from datetime import timedelta
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import UnauthorizedError
from app.core.logging import get_logger
from app.core.security import (
    create_access_token,
    generate_csrf_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    utc_now,
    verify_password,
)
from app.database.models import User
from app.repositories import AuthRepository

logger = get_logger(__name__)

_DUMMY_PASSWORD_HASH = hash_password("fieldmark-invalid-credential-placeholder")


class InvalidCredentials(Exception):
    pass


@dataclass(frozen=True)
class SessionResult:
    user: User
    access_token: str
    expires_in: int
    refresh_token: str
    csrf_token: str


class AuthService:
    def __init__(self, db: Session) -> None:
        self.repository = AuthRepository(db)

    def login(self, email: str, password: str) -> SessionResult:
        user = self.authenticate(email, password)
        result = self._issue_session(user)
        logger.info(
            "login_succeeded",
            extra={"user_id": str(user.id), "role": user.role},
        )
        return result

    def authenticate(self, email: str, password: str) -> User:
        normalized_email = email.strip().lower()
        user = self.repository.get_user_by_email(normalized_email)

        if user is None:
            # Equalize timing for unknown accounts and wrong passwords.
            verify_password(password, _DUMMY_PASSWORD_HASH)
            self._log_login_failure(normalized_email, "unknown_account")
            raise InvalidCredentials

        if not verify_password(password, user.password_hash):
            self._log_login_failure(normalized_email, "invalid_password")
            raise InvalidCredentials

        if not user.is_active:
            self._log_login_failure(normalized_email, "inactive_account")
            raise InvalidCredentials

        return user

    def refresh(self, raw_refresh_token: str) -> SessionResult:
        token_hash = hash_refresh_token(raw_refresh_token)
        token = self.repository.get_refresh_token_by_hash(token_hash)
        now = utc_now()

        if token is None:
            logger.warning("refresh_rejected", extra={"reason": "unknown_token"})
            raise UnauthorizedError("Refresh token is invalid.")

        if token.revoked_at is not None:
            self.repository.revoke_all_active_tokens(token.user_id, now)
            self.repository.commit()
            logger.warning(
                "refresh_token_reuse_detected",
                extra={"user_id": str(token.user_id)},
            )
            raise UnauthorizedError("Refresh token reuse detected.")

        if token.expires_at <= now:
            token.revoked_at = now
            self.repository.commit()
            logger.warning(
                "refresh_rejected",
                extra={"reason": "expired", "user_id": str(token.user_id)},
            )
            raise UnauthorizedError("Refresh token has expired.")

        user = self.repository.get_user_by_id(token.user_id)
        if user is None or not user.is_active:
            self.repository.revoke_all_active_tokens(token.user_id, now)
            self.repository.commit()
            logger.warning(
                "refresh_rejected",
                extra={"reason": "inactive_account", "user_id": str(token.user_id)},
            )
            raise UnauthorizedError("Refresh token is invalid.")

        token.last_used_at = now
        token.revoked_at = now
        result = self._issue_session(user)
        logger.info("refresh_token_rotated", extra={"user_id": str(user.id)})
        return result

    def logout(
        self,
        *,
        user_id: UUID,
        raw_refresh_token: str | None,
        logout_all_devices: bool,
    ) -> None:
        now = utc_now()

        if logout_all_devices:
            self.repository.revoke_all_active_tokens(user_id, now)
        elif raw_refresh_token:
            token_hash = hash_refresh_token(raw_refresh_token)
            token = self.repository.get_refresh_token_by_hash(token_hash)
            if token is not None and token.user_id == user_id and token.revoked_at is None:
                token.revoked_at = now
                token.last_used_at = now

        self.repository.commit()
        logger.info(
            "logout_completed",
            extra={"user_id": str(user_id), "all_devices": logout_all_devices},
        )

    def _issue_session(self, user: User) -> SessionResult:
        access_token, expires_in = create_access_token(user.id, user.role)
        raw_refresh_token = generate_refresh_token()
        expires_at = utc_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        try:
            self.repository.create_refresh_token(
                user_id=user.id,
                token_hash=hash_refresh_token(raw_refresh_token),
                expires_at=expires_at,
            )
            self.repository.commit()
        except Exception:
            self.repository.rollback()
            raise

        return SessionResult(
            user=user,
            access_token=access_token,
            expires_in=expires_in,
            refresh_token=raw_refresh_token,
            csrf_token=generate_csrf_token(),
        )

    @staticmethod
    def _log_login_failure(email: str, reason: str) -> None:
        email_fingerprint = hashlib.sha256(email.encode("utf-8")).hexdigest()[:16]
        logger.warning(
            "login_failed",
            extra={"reason": reason, "email_fingerprint": email_fingerprint},
        )
