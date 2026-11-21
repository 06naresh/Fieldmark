from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints.health import router as health_router
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import setup_logging
from app.middleware import RequestContextMiddleware


def create_app() -> FastAPI:
    setup_logging(settings.LOG_LEVEL)

    application = FastAPI(
        title=settings.APP_NAME,
        version="0.1.0",
        openapi_url=f"{settings.API_PREFIX}/openapi.json",
        docs_url=f"{settings.API_PREFIX}/docs",
        redoc_url=f"{settings.API_PREFIX}/redoc",
    )

    application.add_middleware(RequestContextMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[
            origin.strip() for origin in settings.FRONTEND_ORIGINS.split(",") if origin.strip()
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(application)
    application.include_router(api_router)
    application.include_router(health_router)

    return application


app = create_app()
