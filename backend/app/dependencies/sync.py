from uuid import UUID

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError
from app.database.models import SyncDevice
from app.database.session import get_db
from app.dependencies.authentication import get_current_user
from app.repositories import DeviceRepository
from app.schemas.auth import CurrentUserResponse


def require_active_device(
    device_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUserResponse = Depends(get_current_user),
) -> SyncDevice:
    """A device ID is context, not credentials: it must belong to the user."""

    device = DeviceRepository(db).get_active_for_user(device_id, current_user.id)
    if device is None:
        raise ForbiddenError("The device is not registered or is inactive.")
    return device
