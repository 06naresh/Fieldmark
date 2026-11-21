from datetime import timedelta
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_refresh_token, utc_now
from app.database.models import RefreshToken


def set_cookie(client: TestClient, name: str, value: str, path: str) -> None:
    # httpx matches cookies without an explicit domain to the TestClient host.
    client.cookies.set(name, value, path=path)


def login(client: TestClient, email: str, password: str) -> TestClient:
    return client.post(
        f"{settings.API_PREFIX}/auth/login",
        json={"email": email, "password": password},
    )


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def csrf_header(token: str) -> dict[str, str]:
    return {settings.CSRF_HEADER_NAME: token}


def active_token_count(db: Session, user_id) -> int:
    return len(
        db.scalars(
            select(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked_at.is_(None),
            )
        ).all()
    )


def test_valid_login_returns_access_token_and_secure_cookies(
    api_client: TestClient,
    create_test_user,
    migrated_engine,
    capsys: pytest.CaptureFixture[str],
) -> None:
    user, password = create_test_user(role="INSPECTOR")

    response = login(api_client, user.email, password)

    assert response.status_code == 200
    body = response.json()["data"]
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    assert body["user"] == {
        "id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "role": "INSPECTOR",
    }
    assert settings.REFRESH_COOKIE_NAME in response.cookies
    assert settings.CSRF_COOKIE_NAME in response.cookies
    assert "httponly" in response.headers.get("set-cookie", "").lower()
    assert "password_hash" not in response.text
    assert response.cookies.get(settings.REFRESH_COOKIE_NAME) not in response.text
    assert password not in capsys.readouterr().out

    with Session(migrated_engine) as db:
        stored = db.get(type(user), user.id)
        assert stored is not None
        assert stored.password_hash.startswith("$argon2id$")


@pytest.mark.parametrize("case", ["wrong_password", "unknown_email", "inactive_user"])
def test_invalid_credentials_are_rejected_generically(
    api_client: TestClient,
    create_test_user,
    case: str,
) -> None:
    email = f"invalid-{uuid4().hex}@example.com"
    password = "WrongPassword123!"

    if case == "wrong_password":
        user, _ = create_test_user(password="CorrectPassword123!")
        email = user.email
    elif case == "inactive_user":
        user, _ = create_test_user(is_active=False)
        email = user.email

    response = login(api_client, email, password)

    assert response.status_code == 401
    assert response.json() == {
        "error": {
            "code": "UNAUTHORIZED",
            "message": "Email or password is incorrect.",
            "request_id": response.json()["error"]["request_id"],
        }
    }


def test_expired_access_token_is_rejected(api_client: TestClient, create_test_user) -> None:
    user, _ = create_test_user()
    now = utc_now()
    expired_token = jwt.encode(
        {
            "sub": str(user.id),
            "role": user.role,
            "type": "access",
            "iss": settings.JWT_ISSUER,
            "aud": settings.JWT_AUDIENCE,
            "iat": int((now - timedelta(minutes=30)).timestamp()),
            "exp": int((now - timedelta(minutes=15)).timestamp()),
            "jti": uuid4().hex,
        },
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )

    response = api_client.get(
        f"{settings.API_PREFIX}/auth/me", headers=bearer(expired_token)
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


def test_current_user_requires_valid_access_token(
    api_client: TestClient, create_test_user
) -> None:
    user, password = create_test_user(role="ADMIN")
    login_response = login(api_client, user.email, password)
    token = login_response.json()["data"]["access_token"]

    authenticated = api_client.get(
        f"{settings.API_PREFIX}/auth/me", headers=bearer(token)
    )
    assert authenticated.status_code == 200
    assert authenticated.json()["data"] == {
        "id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "role": "ADMIN",
        "is_active": True,
    }

    missing = api_client.get(f"{settings.API_PREFIX}/auth/me")
    assert missing.status_code == 401
    assert missing.json()["error"]["code"] == "UNAUTHORIZED"

    malformed = api_client.get(
        f"{settings.API_PREFIX}/auth/me", headers=bearer("not-a-jwt")
    )
    assert malformed.status_code == 401
    assert malformed.json()["error"]["code"] == "UNAUTHORIZED"


def test_refresh_rotates_token_and_revokes_previous_session(
    api_client: TestClient,
    create_test_user,
    migrated_engine,
) -> None:
    user, password = create_test_user()
    login_response = login(api_client, user.email, password)
    old_refresh = login_response.cookies.get(settings.REFRESH_COOKIE_NAME)
    old_csrf = login_response.cookies.get(settings.CSRF_COOKIE_NAME)
    old_access = login_response.json()["data"]["access_token"]

    response = api_client.post(
        f"{settings.API_PREFIX}/auth/refresh",
        headers=csrf_header(old_csrf),
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["access_token"]
    assert data["access_token"] != old_access
    new_refresh = response.cookies.get(settings.REFRESH_COOKIE_NAME)
    assert new_refresh and new_refresh != old_refresh

    with Session(migrated_engine) as db:
        assert active_token_count(db, user.id) == 1
        old_token = db.scalar(
            select(RefreshToken).where(
                RefreshToken.token_hash == hash_refresh_token(old_refresh)
            )
        )
        assert old_token is not None
        assert old_token.revoked_at is not None


def test_reusing_rotated_refresh_token_revokes_user_sessions(
    api_client: TestClient,
    create_test_user,
    migrated_engine,
) -> None:
    user, password = create_test_user()
    login_response = login(api_client, user.email, password)
    old_refresh = login_response.cookies.get(settings.REFRESH_COOKIE_NAME)

    rotated = api_client.post(
        f"{settings.API_PREFIX}/auth/refresh",
        headers=csrf_header(login_response.cookies.get(settings.CSRF_COOKIE_NAME)),
    )
    assert rotated.status_code == 200
    csrf = rotated.cookies.get(settings.CSRF_COOKIE_NAME)

    set_cookie(api_client, settings.REFRESH_COOKIE_NAME, old_refresh, settings.REFRESH_COOKIE_PATH)
    reuse_response = api_client.post(
        f"{settings.API_PREFIX}/auth/refresh",
        headers=csrf_header(csrf),
    )

    assert reuse_response.status_code == 401
    assert reuse_response.json()["error"]["message"] == "Refresh token reuse detected."
    with Session(migrated_engine) as db:
        assert active_token_count(db, user.id) == 0


def test_expired_refresh_token_is_rejected(
    api_client: TestClient, create_test_user, migrated_engine
) -> None:
    user, _ = create_test_user()
    raw_token = f"expired-{uuid4().hex}"
    csrf = "expired-csrf-token"
    with Session(migrated_engine) as db:
        db.add(
            RefreshToken(
                user_id=user.id,
                token_hash=hash_refresh_token(raw_token),
                expires_at=utc_now() - timedelta(days=1),
            )
        )
        db.commit()

    set_cookie(api_client, settings.REFRESH_COOKIE_NAME, raw_token, settings.REFRESH_COOKIE_PATH)
    set_cookie(api_client, settings.CSRF_COOKIE_NAME, csrf, settings.CSRF_COOKIE_PATH)
    response = api_client.post(
        f"{settings.API_PREFIX}/auth/refresh",
        headers=csrf_header(csrf),
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Refresh token has expired."


def test_logout_revokes_current_session_and_is_idempotent(
    api_client: TestClient,
    create_test_user,
    migrated_engine,
) -> None:
    user, password = create_test_user()
    login_response = login(api_client, user.email, password)
    access_token = login_response.json()["data"]["access_token"]
    refresh_token = login_response.cookies.get(settings.REFRESH_COOKIE_NAME)
    csrf = login_response.cookies.get(settings.CSRF_COOKIE_NAME)

    logout_response = api_client.post(
        f"{settings.API_PREFIX}/auth/logout",
        json={"logout_all_devices": False},
        headers={**bearer(access_token), **csrf_header(csrf)},
    )
    assert logout_response.status_code == 200
    assert logout_response.json() == {"message": "Logged out successfully."}

    with Session(migrated_engine) as db:
        token = db.scalar(
            select(RefreshToken).where(
                RefreshToken.token_hash == hash_refresh_token(refresh_token)
            )
        )
        assert token is not None
        assert token.revoked_at is not None

    # A stale client can repeat logout with the same cookies after revocation.
    set_cookie(api_client, settings.REFRESH_COOKIE_NAME, refresh_token, settings.REFRESH_COOKIE_PATH)
    set_cookie(api_client, settings.CSRF_COOKIE_NAME, csrf, settings.CSRF_COOKIE_PATH)
    repeated = api_client.post(
        f"{settings.API_PREFIX}/auth/logout",
        json={"logout_all_devices": False},
        headers={**bearer(access_token), **csrf_header(csrf)},
    )
    assert repeated.status_code == 200


def test_logout_all_devices_revokes_every_active_session(
    api_client: TestClient,
    create_test_user,
    migrated_engine,
) -> None:
    user, password = create_test_user()
    first = login(api_client, user.email, password)
    second = login(api_client, user.email, password)

    set_cookie(
        api_client,
        settings.CSRF_COOKIE_NAME,
        first.cookies.get(settings.CSRF_COOKIE_NAME),
        settings.CSRF_COOKIE_PATH,
    )
    response = api_client.post(
        f"{settings.API_PREFIX}/auth/logout",
        json={"logout_all_devices": True},
        headers={
            **bearer(first.json()["data"]["access_token"]),
            **csrf_header(first.cookies.get(settings.CSRF_COOKIE_NAME)),
        },
    )

    assert response.status_code == 200
    with Session(migrated_engine) as db:
        assert active_token_count(db, user.id) == 0
    assert second.status_code == 200


@pytest.mark.parametrize("csrf_mode", ["missing", "wrong", "bad_origin"])
def test_refresh_requires_csrf_protection(
    api_client: TestClient,
    create_test_user,
    csrf_mode: str,
) -> None:
    user, password = create_test_user()
    login_response = login(api_client, user.email, password)
    csrf = login_response.cookies.get(settings.CSRF_COOKIE_NAME)

    headers = {}
    if csrf_mode == "wrong":
        headers = csrf_header("wrong-csrf-token")
    elif csrf_mode == "bad_origin":
        headers = {**csrf_header(csrf), "Origin": "https://malicious.example"}

    response = api_client.post(f"{settings.API_PREFIX}/auth/refresh", headers=headers)

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


def test_login_rate_limit_rejects_repeated_failures(api_client: TestClient) -> None:
    email = f"rate-limit-{uuid4().hex}@example.com"
    max_attempts = settings.LOGIN_RATE_LIMIT_MAX_ATTEMPTS

    for _ in range(max_attempts):
        response = login(api_client, email, "WrongPassword123!")
        assert response.status_code == 401

    limited = login(api_client, email, "WrongPassword123!")

    assert limited.status_code == 429
    assert limited.json()["error"]["code"] == "RATE_LIMIT_EXCEEDED"
