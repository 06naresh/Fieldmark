from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi import status as http_status
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.core.permissions import is_admin
from app.database.models import Inspection
from app.database.session import get_db
from app.dependencies.authorization import require_admin, require_inspection_access
from app.dependencies.authentication import get_current_user
from app.schemas.auth import CurrentUserResponse
from app.schemas.common import DataResponse, ListResponse, Pagination, PaginationParams
from app.schemas.inspections import (
    AnswerResponse,
    AnswerSaveRequest,
    InspectionCreate,
    InspectionDetailResponse,
    InspectionResponse,
    InspectionStatus,
    InspectionUpdate,
    StartRequest,
    StartResponse,
    SubmitRequest,
    SubmitResponse,
)
from app.services.inspection_service import (
    InspectionService,
    answer_response,
    inspection_response,
)

router = APIRouter(prefix="/inspections", tags=["Inspections"])


@router.post(
    "",
    status_code=http_status.HTTP_201_CREATED,
    response_model=DataResponse[InspectionResponse],
)
def create_inspection(
    payload: InspectionCreate,
    admin: CurrentUserResponse = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DataResponse[InspectionResponse]:
    inspection = InspectionService(db).create(payload, admin.id)
    return DataResponse(data=inspection_response(inspection))


@router.get("", response_model=ListResponse[InspectionResponse])
def list_inspections(
    pagination: PaginationParams = Depends(),
    status: InspectionStatus | None = Query(default=None),
    site_id: UUID | None = Query(default=None),
    search: str | None = Query(default=None, max_length=100),
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ListResponse[InspectionResponse]:
    inspections, total = InspectionService(db).list(
        is_admin=is_admin(current_user),
        user_id=current_user.id,
        status=status,
        site_id=site_id,
        search=search,
        skip=pagination.offset,
        limit=pagination.page_size,
    )
    total_pages = (total + pagination.page_size - 1) // pagination.page_size
    return ListResponse(
        data=[inspection_response(item) for item in inspections],
        pagination=Pagination(
            page=pagination.page,
            page_size=pagination.page_size,
            total=total,
            total_pages=total_pages,
        ),
    )


@router.get("/{inspection_id}", response_model=DataResponse[InspectionDetailResponse])
def get_inspection(
    inspection: Inspection = Depends(require_inspection_access),
    db: Session = Depends(get_db),
) -> DataResponse[InspectionDetailResponse]:
    return DataResponse(data=InspectionService(db).detail(inspection))


@router.patch("/{inspection_id}", response_model=DataResponse[InspectionResponse])
def update_inspection(
    inspection_id: UUID,
    payload: InspectionUpdate,
    _: CurrentUserResponse = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DataResponse[InspectionResponse]:
    service = InspectionService(db)
    inspection = service.repository.get_for_update(inspection_id)
    if inspection is None:
        raise NotFoundError("The requested inspection was not found.")
    service.update(inspection, payload)
    return DataResponse(data=inspection_response(inspection))


@router.post("/{inspection_id}/start", response_model=DataResponse[StartResponse])
def start_inspection(
    payload: StartRequest,
    inspection: Inspection = Depends(require_inspection_access),
    db: Session = Depends(get_db),
) -> DataResponse[StartResponse]:
    service = InspectionService(db)
    locked = service.repository.get_for_update(inspection.id)
    if locked is None:
        raise NotFoundError("The requested inspection was not found.")
    return DataResponse(data=service.start(locked, payload))


@router.get("/{inspection_id}/answers", response_model=DataResponse[list[AnswerResponse]])
def get_answers(
    inspection: Inspection = Depends(require_inspection_access),
    db: Session = Depends(get_db),
) -> DataResponse[list[AnswerResponse]]:
    answers = InspectionService(db).get_answers(inspection.id)
    return DataResponse(data=[answer_response(answer) for answer in answers])


@router.put(
    "/{inspection_id}/answers/{checklist_item_id}",
    response_model=DataResponse[AnswerResponse],
)
def save_answer(
    checklist_item_id: UUID,
    payload: AnswerSaveRequest,
    inspection: Inspection = Depends(require_inspection_access),
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DataResponse[AnswerResponse]:
    service = InspectionService(db)
    locked = service.repository.get_for_update(inspection.id)
    if locked is None:
        raise NotFoundError("The requested inspection was not found.")
    answer = service.save_answer(
        locked, checklist_item_id, payload, current_user.id
    )
    return DataResponse(data=answer_response(answer))


@router.post(
    "/{inspection_id}/submit",
    status_code=http_status.HTTP_201_CREATED,
    response_model=DataResponse[SubmitResponse],
)
def submit_inspection(
    payload: SubmitRequest,
    inspection: Inspection = Depends(require_inspection_access),
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DataResponse[SubmitResponse]:
    service = InspectionService(db)
    locked = service.repository.get_for_update(inspection.id)
    if locked is None:
        raise NotFoundError("The requested inspection was not found.")
    return DataResponse(data=service.submit(locked, payload, current_user.id))


def _base_fields(inspection: Inspection) -> dict[str, object]:
    return {
        "id": inspection.id,
        "site_id": inspection.site_id,
        "template_id": inspection.template_id,
        "template_version": inspection.template_version,
        "assigned_to": inspection.assigned_to,
        "title": inspection.title,
        "instructions": inspection.instructions,
        "scheduled_at": inspection.scheduled_at,
        "due_at": inspection.due_at,
        "status": inspection.status,
        "version": inspection.version,
    }
