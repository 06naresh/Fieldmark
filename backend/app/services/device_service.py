from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.db_errors import commit_transaction
from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.security import utc_now
from app.database.models import SyncDevice
from app.repositories import DeviceRepository
from app.schemas.auth import CurrentUserResponse
from app.schemas.sync import DeviceCreate
from app.core.permissions import is_admin


class DeviceService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = DeviceRepository(db)

    def register(self, payload: DeviceCreate, user_id: UUID) -> SyncDevice:
        device = SyncDevice(
            user_id=user_id,
            device_name=payload.device_name,
            device_fingerprint=payload.device_fingerprint,
        )
        self.repository.create(device)
        commit_transaction(self.db)
        return device

    def list_devices(self, user_id: UUID) -> list[SyncDevice]:
        return self.repository.list_for_user(user_id)

    def require_active(self, device_id: UUID, user_id: UUID) -> SyncDevice:
        """Validate a device ID supplied inside a request body."""

        device = self.repository.get_active_for_user(device_id, user_id)
        if device is None:
            raise ForbiddenError("The device is not registered or is inactive.")
        return device

    def revoke(
        self, device_id: UUID, current_user: CurrentUserResponse
    ) -> SyncDevice:
        device = self.repository.get(device_id)
        if device is None:
            raise NotFoundError("The requested device was not found.")
        if not is_admin(current_user) and device.user_id != current_user.id:
            raise ForbiddenError("You do not have permission to revoke this device.")
        device.is_active = False
        commit_transaction(self.db)
        return device

    def touch(self, device: SyncDevice) -> None:
        """Record device activity. Called by sync endpoints after validation."""

        device.last_seen_at = utc_now()
        commit_transaction(self.db)
