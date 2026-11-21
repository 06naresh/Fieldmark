from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.models import SyncDevice
from app.database.session import get_db
from app.dependencies.authentication import get_current_user
from app.dependencies.sync import require_active_device
from app.schemas.auth import CurrentUserResponse
from app.schemas.common import DataResponse
from app.schemas.sync import (
    SyncPullResponse,
    SyncPushRequest,
    SyncPushResponse,
    SyncStatusResponse,
)
from app.services.device_service import DeviceService
from app.services.sync_service import SyncService

router = APIRouter(prefix="/sync", tags=["Synchronization"])


@router.post("/push", response_model=DataResponse[SyncPushResponse])
def push_operations(
    payload: SyncPushRequest,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DataResponse[SyncPushResponse]:
    devices = DeviceService(db)
    device = devices.require_active(payload.device_id, current_user.id)
    results = SyncService(db).push(device, current_user, payload.operations)
    return DataResponse(data=SyncPushResponse(results=results))


@router.get("/pull", response_model=DataResponse[SyncPullResponse])
def pull_changes(
    device: SyncDevice = Depends(require_active_device),
    current_user: CurrentUserResponse = Depends(get_current_user),
    cursor: str | None = Query(default=None),
    limit: int | None = Query(
        default=None, ge=1, le=settings.SYNC_MAX_PULL_LIMIT
    ),
    db: Session = Depends(get_db),
) -> DataResponse[SyncPullResponse]:
    response = SyncService(db).pull(current_user, cursor, limit)
    DeviceService(db).touch(device)
    return DataResponse(data=response)


@router.get("/status", response_model=DataResponse[SyncStatusResponse])
def sync_status(
    device: SyncDevice = Depends(require_active_device),
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DataResponse[SyncStatusResponse]:
    response = SyncService(db).status(device, current_user)
    DeviceService(db).touch(device)
    return DataResponse(data=response)
