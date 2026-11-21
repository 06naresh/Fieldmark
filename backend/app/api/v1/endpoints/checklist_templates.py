from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.permissions import is_admin
from app.database.models import ChecklistTemplate
from app.database.session import get_db
from app.dependencies.authorization import (
    require_admin,
    require_template_access,
)
from app.dependencies.authentication import get_current_user
from app.repositories import ChecklistRepository
from app.schemas.auth import CurrentUserResponse
from app.schemas.checklists import (
    ChecklistItemCreate,
    ChecklistItemResponse,
    ChecklistItemUpdate,
    ChecklistTemplateCreate,
    ChecklistTemplateResponse,
    ChecklistTemplateStatusUpdate,
    TemplateRevisionCreate,
)
from app.schemas.common import DataResponse, ListResponse, Pagination, PaginationParams
from app.services.checklist_service import (
    ChecklistService,
    item_response,
    template_response,
)

router = APIRouter(prefix="/checklist-templates", tags=["Checklist Templates"])


@router.post(
    "", status_code=status.HTTP_201_CREATED, response_model=DataResponse[ChecklistTemplateResponse]
)
def create_template(
    payload: ChecklistTemplateCreate,
    admin: CurrentUserResponse = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DataResponse[ChecklistTemplateResponse]:
    template = ChecklistService(db).create(payload, admin.id)
    return DataResponse(data=template_response(template))


@router.get("", response_model=ListResponse[ChecklistTemplateResponse])
def list_templates(
    pagination: PaginationParams = Depends(),
    is_active: bool | None = Query(default=None),
    search: str | None = Query(default=None, max_length=100),
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ListResponse[ChecklistTemplateResponse]:
    repository = ChecklistRepository(db)
    authorized_ids = (
        None if is_admin(current_user) else repository.authorized_template_ids(current_user.id)
    )
    templates, total = ChecklistService(db).list(
        is_active=is_active,
        search=search,
        authorized_template_ids=authorized_ids,
        skip=pagination.offset,
        limit=pagination.page_size,
    )
    total_pages = (total + pagination.page_size - 1) // pagination.page_size
    return ListResponse(
        data=[template_response(template) for template in templates],
        pagination=Pagination(
            page=pagination.page,
            page_size=pagination.page_size,
            total=total,
            total_pages=total_pages,
        ),
    )


@router.get("/{template_id}", response_model=DataResponse[ChecklistTemplateResponse])
def get_template(
    template_id: UUID,
    template_version: int | None = Query(default=None, ge=1),
    template: ChecklistTemplate = Depends(require_template_access),
) -> DataResponse[ChecklistTemplateResponse]:
    return DataResponse(data=template_response(template))


@router.post(
    "/{template_id}/revisions",
    status_code=status.HTTP_201_CREATED,
    response_model=DataResponse[ChecklistTemplateResponse],
)
def create_revision(
    template_id: UUID,
    payload: TemplateRevisionCreate,
    admin: CurrentUserResponse = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DataResponse[ChecklistTemplateResponse]:
    template = ChecklistService(db).create_revision(template_id, payload, admin.id)
    return DataResponse(data=template_response(template))


@router.patch("/{template_id}/status", response_model=DataResponse[ChecklistTemplateResponse])
def set_template_status(
    template_id: UUID,
    payload: ChecklistTemplateStatusUpdate,
    _: CurrentUserResponse = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DataResponse[ChecklistTemplateResponse]:
    template = ChecklistService(db).set_status(template_id, payload)
    return DataResponse(data=template_response(template))


@router.post(
    "/{template_id}/items",
    status_code=status.HTTP_201_CREATED,
    response_model=DataResponse[ChecklistItemResponse],
)
def add_item(
    template_id: UUID,
    payload: ChecklistItemCreate,
    _: CurrentUserResponse = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DataResponse[ChecklistItemResponse]:
    return DataResponse(data=item_response(ChecklistService(db).add_item(template_id, payload)))


@router.patch(
    "/{template_id}/items/{item_id}", response_model=DataResponse[ChecklistItemResponse]
)
def update_item(
    template_id: UUID,
    item_id: UUID,
    payload: ChecklistItemUpdate,
    _: CurrentUserResponse = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DataResponse[ChecklistItemResponse]:
    item = ChecklistService(db).update_item(template_id, item_id, payload)
    return DataResponse(data=item_response(item))
