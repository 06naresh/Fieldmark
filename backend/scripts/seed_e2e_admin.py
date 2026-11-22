"""Seed a deterministic administrator account for local end-to-end tests.

The public signup endpoint intentionally creates only INSPECTOR accounts, so
browser tests need a controlled way to provision an administrator. This script
is test-only: it refuses non-test email addresses and never prints credentials.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.database.models import User


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    return parser.parse_args()


def main() -> None:
    if settings.APP_ENV.lower() == "production":
        raise SystemExit("Refusing to seed E2E accounts in a production environment.")

    args = parse_args()
    email = args.email.strip().lower()
    if not email.endswith(".test") or "e2e" not in email:
        raise SystemExit("Refusing to seed a non-test email address.")

    engine = create_engine(settings.DATABASE_URL)
    with Session(engine) as db:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            user = User(
                full_name="Fieldmark E2E Administrator",
                email=email,
                password_hash=hash_password(args.password),
                role="ADMIN",
                is_active=True,
            )
            db.add(user)
        else:
            # The address is reserved for E2E, so refreshing its password and
            # permissions keeps repeated local runs deterministic.
            user.full_name = "Fieldmark E2E Administrator"
            user.password_hash = hash_password(args.password)
            user.role = "ADMIN"
            user.is_active = True
        db.commit()

    engine.dispose()
    print(f"Seeded E2E administrator: {email}")


if __name__ == "__main__":
    main()
