from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.models import SyncDevice


class DeviceRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, device: SyncDevice) -> None:
        self.db.add(device)

    def get(self, device_id: UUID) -> SyncDevice | None:
        return self.db.get(SyncDevice, device_id)

    def get_active_for_user(self, device_id: UUID, user_id: UUID) -> SyncDevice | None:
        return self.db.scalar(
            select(SyncDevice).where(
                SyncDevice.id == device_id,
                SyncDevice.user_id == user_id,
                SyncDevice.is_active.is_(True),
            )
        )

    def list_for_user(self, user_id: UUID) -> list[SyncDevice]:
        return list(
            self.db.scalars(
                select(SyncDevice)
                .where(SyncDevice.user_id == user_id)
                .order_by(SyncDevice.created_at.desc(), SyncDevice.id)
            ).all()
        )
