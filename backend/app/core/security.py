import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import jwt
from fastapi import Request, Response
from passlib.context import CryptContext

from app.core.config import settings
from app.core.exceptions import ForbiddenError, UnauthorizedError

_PASSWORD_CONTEXT = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__type="ID",
    argon2__time_cost=2,
    argon2__memory_cost=19_456,
    argon2__parallelism=1,
)


@dataclass(frozen=True)
class AccessTokenClaims:
    user_id: UUID
    role: str
    jti: str


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def hash_password(password: str) -> str:
    return _PASSWORD_CONTEXT.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return bool(_PASSWORD_CONTEXT.verify(password, password_hash))


def create_access_token(user_id: UUID, role: str) -> tuple[str, int]:
    expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    issued_at = utc_now()
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        "iat": int(issued_at.timestamp()),
        "exp": int((issued_at + timedelta(seconds=expires_in)).timestamp()),
        "jti": str(uuid4()),
    }
    return (
        jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM),
        expires_in,
    )


def decode_access_token(token: str) -> AccessTokenClaims:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            audience=settings.JWT_AUDIENCE,
            issuer=settings.JWT_ISSUER,
        )
        if payload.get("type") != "access":
            raise UnauthorizedError("Authentication is invalid.")

        return AccessTokenClaims(
            user_id=UUID(str(payload["sub"])),
            role=str(payload["role"]),
            jti=str(payload["jti"]),
        )
    except UnauthorizedError:
        raise
    except (jwt.PyJWTError, KeyError, TypeError, ValueError) as exc:
        raise UnauthorizedError("Authentication is invalid.") from exc


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        value=token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path=settings.REFRESH_COOKIE_PATH,
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.REFRESH_COOKIE_NAME,
        path=settings.REFRESH_COOKIE_PATH,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
    )


def set_csrf_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME,
        value=token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path=settings.CSRF_COOKIE_PATH,
        httponly=False,
        secure=settings.CSRF_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
    )


def clear_csrf_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.CSRF_COOKIE_NAME,
        path=settings.CSRF_COOKIE_PATH,
        secure=settings.CSRF_COOKIE_SECURE,
        samesite=settings.REFRESH_COOKIE_SAMESITE,
    )


def validate_csrf_request(request: Request) -> None:
    origin = request.headers.get("origin")
    if origin:
        allowed_origins = set(settings.frontend_origins)
        if origin.rstrip("/") not in allowed_origins:
            raise ForbiddenError("The request origin is not allowed.")

    cookie_token = request.cookies.get(settings.CSRF_COOKIE_NAME)
    header_token = request.headers.get(settings.CSRF_HEADER_NAME)
    if not cookie_token or not header_token:
        raise ForbiddenError("CSRF validation failed.")
    if not secrets.compare_digest(cookie_token, header_token):
        raise ForbiddenError("CSRF validation failed.")
