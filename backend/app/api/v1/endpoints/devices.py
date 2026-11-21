from uuid import UUID

from fastapi import APIRouter, Depends, status as http_status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.authentication import get_current_user
from app.schemas.auth import CurrentUserResponse
from app.schemas.common import DataResponse, MessageResponse
from app.schemas.sync import DeviceCreate, DeviceResponse
from app.services.device_service import DeviceService

router = APIRouter(tags=["Devices"])


@router.post(
    "/devices",
    status_code=http_status.HTTP_201_CREATED,
    response_model=DataResponse[DeviceResponse],
)
@router.post(
    "/sync/devices",
    status_code=http_status.HTTP_201_CREATED,
    response_model=DataResponse[DeviceResponse],
    include_in_schema=False,
)
def register_device(
    payload: DeviceCreate,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DataResponse[DeviceResponse]:
    device = DeviceService(db).register(payload, current_user.id)
    return DataResponse(
        data=DeviceResponse(
            id=device.id,
            device_name=device.device_name,
            is_active=device.is_active,
            created_at=device.created_at,
        )
    )


@router.get("/devices", response_model=DataResponse[list[DeviceResponse]])
@router.get("/sync/devices", response_model=DataResponse[list[DeviceResponse]], include_in_schema=False)
def list_devices(
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DataResponse[list[DeviceResponse]]:
    devices = DeviceService(db).list_devices(current_user.id)
    return DataResponse(
        data=[
            DeviceResponse(
                id=device.id,
                device_name=device.device_name,
                is_active=device.is_active,
                created_at=device.created_at,
            )
            for device in devices
        ]
    )


@router.post("/devices/{device_id}/revoke", response_model=MessageResponse)
@router.post(
    "/sync/devices/{device_id}/revoke",
    response_model=MessageResponse,
    include_in_schema=False,
)
def revoke_device(
    device_id: UUID,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MessageResponse:
    DeviceService(db).revoke(device_id, current_user)
    return MessageResponse(message="Device revoked successfully.")
