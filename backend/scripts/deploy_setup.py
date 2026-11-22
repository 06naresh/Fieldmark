"""Apply pending Alembic migrations during a deployment build.

The advisory lock prevents concurrent Vercel builds from running migrations
against the same PostgreSQL database at the same time.
"""

import os
from pathlib import Path
import sys

from alembic import command
from alembic.config import Config
from sqlalchemy import text

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import settings  # noqa: E402
from app.database.session import engine  # noqa: E402

# Arbitrary, stable application-level lock key.
MIGRATION_LOCK_KEY = 0x46494C444D41524B


def apply_migrations() -> None:
    alembic_config = Config(str(BACKEND_ROOT / "alembic.ini"))
    alembic_config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    alembic_config.attributes["database_url"] = settings.DATABASE_URL

    with engine.connect() as lock_connection:
        lock_connection.execute(
            text("SELECT pg_advisory_lock(:lock_key)"),
            {"lock_key": MIGRATION_LOCK_KEY},
        )
        try:
            command.upgrade(alembic_config, "head")
        finally:
            lock_connection.execute(
                text("SELECT pg_advisory_unlock(:lock_key)"),
                {"lock_key": MIGRATION_LOCK_KEY},
            )

    if os.environ.get("BOOTSTRAP_ADMIN_EMAIL") or os.environ.get("BOOTSTRAP_ADMIN_PASSWORD"):
        from scripts.bootstrap_admin import bootstrap

        bootstrap()


if __name__ == "__main__":
    apply_migrations()
