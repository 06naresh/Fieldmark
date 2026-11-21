from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.checklist_templates import router as checklist_templates_router
from app.api.v1.endpoints.conflicts import router as conflicts_router
from app.api.v1.endpoints.dashboard import router as dashboard_router
from app.api.v1.endpoints.devices import router as devices_router
from app.api.v1.endpoints.inspections import router as inspections_router
from app.api.v1.endpoints.sites import router as sites_router
from app.api.v1.endpoints.sync import router as sync_router
from app.api.v1.endpoints.users import router as users_router
from app.core.config import settings

api_router = APIRouter(prefix=settings.API_PREFIX)
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(sites_router)
api_router.include_router(checklist_templates_router)
api_router.include_router(inspections_router)
api_router.include_router(dashboard_router)
api_router.include_router(devices_router)
api_router.include_router(sync_router)
api_router.include_router(conflicts_router)
