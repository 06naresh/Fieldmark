from fastapi import APIRouter

from app.core.config import settings

# Authentication, user, site, checklist, inspection, and sync routers are added
# in their respective development phases.
api_router = APIRouter(prefix=settings.API_PREFIX)
