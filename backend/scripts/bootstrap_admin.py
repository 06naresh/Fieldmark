"""Create or verify the initial administrator from protected environment values.

The public signup endpoint intentionally creates only INSPECTOR accounts. This
one-time deployment helper never prints credentials and never changes the
password of an existing account.
"""

from pathlib import Path
import os
import sys

from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.orm import Session

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.security import hash_password  # noqa: E402
from app.database.models import User  # noqa: E402
from app.database.session import engine  # noqa: E402
from app.schemas.users import UserCreate  # noqa: E402

ADMIN_LOCK_KEY = 0x41444D494E303031


def load_credentials() -> UserCreate:
    try:
        return UserCreate(
            full_name=os.environ.get("BOOTSTRAP_ADMIN_NAME", "Fieldmark Administrator"),
            email=os.environ.get("BOOTSTRAP_ADMIN_EMAIL", ""),
            password=os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", ""),
            role="ADMIN",
        )
    except ValidationError as exc:
        raise SystemExit(
            "BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD must be valid credentials."
        ) from exc


def bootstrap() -> None:
    credentials = load_credentials()

    with engine.connect() as lock_connection:
        lock_connection.execute(
            text("SELECT pg_advisory_lock(:lock_key)"),
            {"lock_key": ADMIN_LOCK_KEY},
        )
        try:
            with Session(engine) as db:
                user = db.query(User).filter(User.email == credentials.email).first()
                if user is None:
                    db.add(
                        User(
                            full_name=credentials.full_name,
                            email=credentials.email,
                            password_hash=hash_password(credentials.password),
                            role="ADMIN",
                            is_active=True,
                        )
                    )
                    action = "created"
                else:
                    action = "verified"
                    user.role = "ADMIN"
                    user.is_active = True
                db.commit()
        finally:
            lock_connection.execute(
                text("SELECT pg_advisory_unlock(:lock_key)"),
                {"lock_key": ADMIN_LOCK_KEY},
            )

    print(f"Initial administrator {action}; credentials were not printed.")


if __name__ == "__main__":
    bootstrap()
