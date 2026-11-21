from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError


def flush_changes(db: Session) -> None:
    """Flush pending changes, translating constraint violations to API errors."""

    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError("The request conflicts with existing data.") from exc


def commit_transaction(db: Session) -> None:
    """Commit business changes without exposing database errors to clients."""

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ConflictError("The request conflicts with existing data.") from exc
    except Exception:
        db.rollback()
        raise
