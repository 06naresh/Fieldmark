from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.authentication import get_current_user
from app.schemas.auth import CurrentUserResponse
from app.schemas.common import DataResponse, ListResponse, Pagination, PaginationParams
from app.schemas.sync import (
    ConflictResolveRequest,
    ConflictResolveResponse,
    ConflictStatus,
    ConflictSummary,
    ConflictDetail,
)
from app.services.conflict_service import (
    ConflictService,
    conflict_detail,
    conflict_summary,
)

router = APIRouter(prefix="/sync/conflicts", tags=["Conflicts"])


@router.get("", response_model=ListResponse[ConflictSummary])
def list_conflicts(
    pagination: PaginationParams = Depends(),
    status: ConflictStatus | None = Query(default=None),
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ListResponse[ConflictSummary]:
    conflicts, total = ConflictService(db).list(
        current_user=current_user,
        status=status,
        skip=pagination.offset,
        limit=pagination.page_size,
    )
    total_pages = (total + pagination.page_size - 1) // pagination.page_size
    return ListResponse(
        data=[conflict_summary(conflict) for conflict in conflicts],
        pagination=Pagination(
            page=pagination.page,
            page_size=pagination.page_size,
            total=total,
            total_pages=total_pages,
        ),
    )


@router.get("/{conflict_id}", response_model=DataResponse[ConflictDetail])
def get_conflict(
    conflict_id: UUID,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DataResponse[ConflictDetail]:
    conflict = ConflictService(db).detail(conflict_id, current_user)
    return DataResponse(data=conflict_detail(conflict))


@router.post("/{conflict_id}/resolve", response_model=DataResponse[ConflictResolveResponse])
def resolve_conflict(
    conflict_id: UUID,
    payload: ConflictResolveRequest,
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DataResponse[ConflictResolveResponse]:
    response = ConflictService(db).resolve(conflict_id, current_user, payload)
    return DataResponse(data=response)
