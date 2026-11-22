import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.core.config import DEFAULT_SECRET_KEY, Settings, settings
from app.main import create_app


PRODUCTION_SECRET = "a-unique-production-secret-with-more-than-32-characters"


def test_managed_postgres_url_is_normalized_to_psycopg() -> None:
    config = Settings(DATABASE_URL="postgresql://user:password@db.example.com:5432/fieldmark")

    assert config.DATABASE_URL == (
        "postgresql+psycopg://user:password@db.example.com:5432/fieldmark"
    )


def test_production_requires_a_unique_secret_key() -> None:
    with pytest.raises(ValidationError, match="SECRET_KEY"):
        Settings(
            APP_ENV="production",
            SECRET_KEY=DEFAULT_SECRET_KEY,
            VERCEL_URL="fieldmark.vercel.app",
        )


def test_production_derives_https_origins_and_secures_cookies() -> None:
    config = Settings(
        APP_ENV="production",
        SECRET_KEY=PRODUCTION_SECRET,
        FRONTEND_ORIGINS="http://localhost:5173",
        VERCEL_URL="fieldmark-git-main.vercel.app",
        PUBLIC_APP_URL="https://fieldmark.example.com/",
    )

    assert config.frontend_origins == [
        "https://fieldmark-git-main.vercel.app",
        "https://fieldmark.example.com",
    ]
    assert config.REFRESH_COOKIE_SECURE is True
    assert config.CSRF_COOKIE_SECURE is True


def test_production_rejects_http_custom_origins() -> None:
    with pytest.raises(ValidationError, match="HTTPS"):
        Settings(
            APP_ENV="production",
            SECRET_KEY=PRODUCTION_SECRET,
            PUBLIC_APP_URL="http://fieldmark.example.com",
        )


def test_production_app_disables_interactive_api_docs(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "APP_ENV", "production")
    app = create_app()

    with TestClient(app) as client:
        assert client.get("/api/v1/openapi.json").status_code == 404
        assert client.get("/api/v1/docs").status_code == 404
        assert client.get("/health").status_code == 200
