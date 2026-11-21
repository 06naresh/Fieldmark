"""Transactional change-feed writes.

Every server-side business write that offline clients need must insert a
``SyncChange`` row in the same transaction as the business change. The database
trigger assigns the commit-ordered ``change_position`` when the row is flushed.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.database.models import SyncChange


def jsonable(value: Any) -> Any:
    """Convert model values into JSONB-safe primitives for change payloads."""

    if isinstance(value, uuid.UUID):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {str(key): jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [jsonable(item) for item in value]
    return value


def log_change(
    db: Session,
    *,
    entity_type: str,
    entity_id: uuid.UUID,
    change_type: str,
    entity_version: int | None,
    payload: dict[str, Any] | None,
    authorized_user_ids: list[uuid.UUID] | None = None,
    is_global: bool = False,
) -> SyncChange:
    """Stage a change-feed event. The caller commits it with the business write."""

    change = SyncChange(
        entity_type=entity_type,
        entity_id=entity_id,
        change_type=change_type,
        entity_version=entity_version,
        payload=jsonable(payload) if payload is not None else None,
        authorized_user_ids=[str(user_id) for user_id in (authorized_user_ids or [])],
        is_global=is_global,
    )
    db.add(change)
    return change
