from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.authentication import get_current_user
from app.schemas.auth import CurrentUserResponse
from app.schemas.common import DataResponse
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DataResponse[DashboardSummary])
def get_dashboard_summary(
    current_user: CurrentUserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DataResponse[DashboardSummary]:
    return DataResponse(data=DashboardService(db).summary(current_user))
