from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.exceptions import ServiceUnavailableError
from app.database.session import get_db

router = APIRouter(tags=["Health"])


@router.get("/health")
def basic_health() -> dict[str, str]:
    return {"status": "healthy"}


@router.get("/health/ready")
def readiness_health(db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise ServiceUnavailableError("Database is unavailable.") from exc

    return {"status": "ready", "database": "connected"}
