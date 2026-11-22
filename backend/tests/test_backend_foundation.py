import json
import logging

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import NotFoundError
from app.core.logging import JsonFormatter
from app.database.session import get_db
from app.main import create_app


@pytest.fixture
def app() -> FastAPI:
    return create_app()


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def configured_origin() -> str:
    return next(
        origin.strip() for origin in settings.FRONTEND_ORIGINS.split(",") if origin.strip()
    )


def test_basic_health_response(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_readiness_check_verifies_postgres(migrated_engine, app: FastAPI) -> None:
    def override_get_db():
        with Session(migrated_engine) as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        response = client.get("/health/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "ready", "database": "connected"}


def test_api_version_prefix_and_documentation(client: TestClient) -> None:
    assert settings.API_PREFIX == "/api/v1"
    assert api_router.prefix == settings.API_PREFIX

    openapi_response = client.get(f"{settings.API_PREFIX}/openapi.json")
    assert openapi_response.status_code == 200
    paths = openapi_response.json()["paths"]
    assert "/health" in paths
    assert "/health/ready" in paths

    docs_response = client.get(f"{settings.API_PREFIX}/docs")
    assert docs_response.status_code == 200
    assert "swagger-ui" in docs_response.text.lower()


def test_cors_allows_configured_development_origin(client: TestClient) -> None:
    origin = configured_origin()
    response = client.options(
        "/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert response.headers["access-control-allow-credentials"] == "true"


def test_cors_allows_answer_save_preflight(client: TestClient) -> None:
    origin = configured_origin()
    response = client.options(
        f"{settings.API_PREFIX}/inspections/00000000-0000-0000-0000-000000000000/answers/00000000-0000-0000-0000-000000000000",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "PUT",
            "Access-Control-Request-Headers": (
                "accept,authorization,content-type,x-csrf-token"
            ),
        },
    )

    assert response.status_code == 200
    assert "PUT" in response.headers["access-control-allow-methods"]
    assert "X-CSRF-Token" in response.headers["access-control-allow-headers"]


def test_application_error_uses_standard_response(app: FastAPI) -> None:
    @app.get("/test/not-found")
    def not_found() -> None:
        raise NotFoundError("Test resource not found.")

    with TestClient(app) as client:
        response = client.get("/test/not-found", headers={"X-Request-ID": "request-123"})

    assert response.status_code == 404
    assert response.headers["X-Request-ID"] == "request-123"
    assert response.json() == {
        "error": {
            "code": "NOT_FOUND",
            "message": "Test resource not found.",
            "request_id": "request-123",
        }
    }


def test_request_validation_error_uses_standard_response(app: FastAPI) -> None:
    @app.get("/test/number/{value}")
    def get_number(value: int) -> dict[str, int]:
        return {"value": value}

    with TestClient(app) as client:
        response = client.get("/test/number/not-a-number")

    assert response.status_code == 422
    body = response.json()["error"]
    assert body["code"] == "VALIDATION_ERROR"
    assert body["message"] == "The supplied data is invalid."
    assert body["details"][0]["field"] == "value"
    assert body["request_id"]


def test_http_exception_uses_standard_response(app: FastAPI) -> None:
    @app.get("/test/forbidden")
    def forbidden() -> None:
        raise HTTPException(status_code=403, detail="Access denied.")

    with TestClient(app) as client:
        response = client.get("/test/forbidden")

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"
    assert response.json()["error"]["message"] == "Access denied."


def test_unexpected_error_does_not_expose_internal_details(
    app: FastAPI, capsys: pytest.CaptureFixture[str]
) -> None:
    @app.get("/test/unexpected")
    def unexpected() -> None:
        raise RuntimeError("secret database password")

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/test/unexpected")

    assert response.status_code == 500
    body = response.json()["error"]
    assert body["code"] == "INTERNAL_SERVER_ERROR"
    assert body["message"] == "An unexpected error occurred."
    assert "secret database password" not in response.text
    assert "secret database password" not in capsys.readouterr().out


def test_json_log_formatter_includes_utc_time_and_request_id() -> None:
    record = logging.LogRecord(
        name="fieldmark.test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="hello %s",
        args=("world",),
        exc_info=None,
    )
    record.request_id = "log-request-123"

    payload = json.loads(JsonFormatter().format(record))

    assert payload["timestamp"].endswith("Z")
    assert payload["level"] == "INFO"
    assert payload["message"] == "hello world"
    assert payload["request_id"] == "log-request-123"
