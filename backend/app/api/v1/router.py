from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.core.config import settings

api_router = APIRouter(prefix=settings.API_PREFIX)
api_router.include_router(auth_router)

# User, site, checklist, inspection, and sync routers are added in later phases.
