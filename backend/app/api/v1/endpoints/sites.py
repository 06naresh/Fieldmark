from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.permissions import is_admin
from app.database.models import Site
from app.database.session import get_db
from app.dependencies.authorization import require_admin, require_site_access
from app.dependencies.authentication import get_current_user
from app.repositories import SiteRepository
from app.schemas.auth import CurrentUserResponse
from app.schemas.common import DataResponse, ListResponse, Pagination, PaginationParams
from app.schemas.sites import SiteCreate, SiteResponse, SiteStatusUpdate, SiteUpdate
from app.services.site_service import SiteService, site_response

router = APIRouter(prefix="/sites", tags=["Sites"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=DataResponse[SiteResponse])
def create_site(
    payload: SiteCreate,
    _: CurrentUserResponse = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DataResponse[SiteResponse]:
    return DataResponse(data=site_response(SiteService(db).create(payload)))


@router.get("", response_model=ListResponse[SiteResponse])
def list_sites(
    pagination: PaginationParams = Depends(),
    is_active: bool | None = Query(default=None),
    search: str | None = Query(default=None, max_length=100),
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ListResponse[SiteResponse]:
    repository = SiteRepository(db)
    authorized_ids = None if is_admin(current_user) else repository.authorized_site_ids(current_user.id)
    sites, total = SiteService(db).list(
        is_active=is_active,
        search=search,
        authorized_site_ids=authorized_ids,
        skip=pagination.offset,
        limit=pagination.page_size,
    )
    total_pages = (total + pagination.page_size - 1) // pagination.page_size
    return ListResponse(
        data=[site_response(site) for site in sites],
        pagination=Pagination(
            page=pagination.page,
            page_size=pagination.page_size,
            total=total,
            total_pages=total_pages,
        ),
    )


@router.get("/{site_id}", response_model=DataResponse[SiteResponse])
def get_site(
    site: Site = Depends(require_site_access),
) -> DataResponse[SiteResponse]:
    return DataResponse(data=site_response(site))


@router.patch("/{site_id}", response_model=DataResponse[SiteResponse])
def update_site(
    site_id: UUID,
    payload: SiteUpdate,
    _: CurrentUserResponse = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DataResponse[SiteResponse]:
    return DataResponse(data=site_response(SiteService(db).update(site_id, payload)))


@router.patch("/{site_id}/status", response_model=DataResponse[SiteResponse])
def set_site_status(
    site_id: UUID,
    payload: SiteStatusUpdate,
    _: CurrentUserResponse = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DataResponse[SiteResponse]:
    return DataResponse(data=site_response(SiteService(db).set_status(site_id, payload)))
