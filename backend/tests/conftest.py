import uuid
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.security import hash_password
from app.database.models import User
from app.database.session import get_db
from app.main import create_app

BACKEND_DIR = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session")
def temporary_schema_name() -> str:
    # A unique schema isolates tests without creating or dropping a database.
    return f"fieldmark_test_{uuid.uuid4().hex[:12]}"


@pytest.fixture(scope="session")
def test_database_url(temporary_schema_name: str) -> str:
    url = make_url(settings.TEST_DATABASE_URL)
    query = dict(url.query)
    query["options"] = f"-csearch_path={temporary_schema_name}"
    return url.set(query=query).render_as_string(hide_password=False)


@pytest.fixture(scope="session")
def alembic_config(test_database_url: str) -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.attributes["database_url"] = test_database_url
    return config


@pytest.fixture(scope="session")
def migrated_engine(
    temporary_schema_name: str,
    test_database_url: str,
    alembic_config: Config,
):
    admin_engine = create_engine(
        settings.TEST_DATABASE_URL,
        isolation_level="AUTOCOMMIT",
        poolclass=NullPool,
    )

    with admin_engine.connect() as connection:
        connection.execute(text(f'CREATE SCHEMA "{temporary_schema_name}"'))

    engine = None
    try:
        command.upgrade(alembic_config, "head")
        engine = create_engine(test_database_url, poolclass=NullPool)
        yield engine
    finally:
        if engine is not None:
            engine.dispose()
        with admin_engine.connect() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{temporary_schema_name}" CASCADE'))
        admin_engine.dispose()


@pytest.fixture
def db_session(migrated_engine):
    with Session(migrated_engine) as session:
        yield session


@pytest.fixture
def api_app(migrated_engine):
    application = create_app()

    def override_get_db():
        with Session(migrated_engine) as session:
            yield session

    application.dependency_overrides[get_db] = override_get_db
    try:
        yield application
    finally:
        application.dependency_overrides.clear()


@pytest.fixture
def api_client(api_app: FastAPI):
    with TestClient(api_app) as client:
        yield client


@pytest.fixture
def create_test_user(migrated_engine):
    def create(
        *,
        role: str = "INSPECTOR",
        password: str = "TestPassword123!",
        is_active: bool = True,
        email: str | None = None,
    ) -> tuple[User, str]:
        user = User(
            full_name=f"Test {role.title}",
            email=email or f"user-{uuid.uuid4().hex}@example.com",
            password_hash=hash_password(password),
            role=role,
            is_active=is_active,
        )
        with Session(migrated_engine) as session:
            session.add(user)
            session.commit()
            session.refresh(user)
        return user, password

    return create
