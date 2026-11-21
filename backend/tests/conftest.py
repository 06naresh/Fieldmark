import uuid
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session
from sqlalchemy.pool import NullPool

from app.core.config import settings

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
