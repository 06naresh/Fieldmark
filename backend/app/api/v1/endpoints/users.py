from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.authorization import require_admin
from app.schemas.auth import CurrentUserResponse
from app.schemas.common import DataResponse, ListResponse, Pagination, PaginationParams
from app.schemas.users import UserCreate, UserResponse, UserStatusUpdate, UserUpdate
from app.services.user_service import UserService, user_response

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=DataResponse[UserResponse])
def create_user(
    payload: UserCreate,
    _: CurrentUserResponse = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DataResponse[UserResponse]:
    user = UserService(db).create(payload)
    return DataResponse(data=user_response(user))


@router.get("", response_model=ListResponse[UserResponse])
def list_users(
    pagination: PaginationParams = Depends(),
    search: str | None = Query(default=None, max_length=100),
    _: CurrentUserResponse = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ListResponse[UserResponse]:
    users, total = UserService(db).list(
        search, pagination.offset, pagination.page_size
    )
    total_pages = (total + pagination.page_size - 1) // pagination.page_size
    return ListResponse(
        data=[user_response(user) for user in users],
        pagination=Pagination(
            page=pagination.page,
            page_size=pagination.page_size,
            total=total,
            total_pages=total_pages,
        ),
    )


@router.get("/{user_id}", response_model=DataResponse[UserResponse])
def get_user(
    user_id: UUID,
    _: CurrentUserResponse = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DataResponse[UserResponse]:
    return DataResponse(data=user_response(UserService(db).get(user_id)))


@router.patch("/{user_id}", response_model=DataResponse[UserResponse])
def update_user(
    user_id: UUID,
    payload: UserUpdate,
    admin: CurrentUserResponse = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DataResponse[UserResponse]:
    user = UserService(db).update(user_id, admin.id, payload)
    return DataResponse(data=user_response(user))


@router.patch("/{user_id}/status", response_model=DataResponse[UserResponse])
def set_user_status(
    user_id: UUID,
    payload: UserStatusUpdate,
    admin: CurrentUserResponse = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DataResponse[UserResponse]:
    user = UserService(db).set_status(user_id, admin.id, payload)
    return DataResponse(data=user_response(user))
