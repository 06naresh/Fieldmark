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

    documentation_urls = (
        {
            "openapi_url": None,
            "docs_url": None,
            "redoc_url": None,
        }
        if settings.is_production
        else {
            "openapi_url": f"{settings.API_PREFIX}/openapi.json",
            "docs_url": f"{settings.API_PREFIX}/docs",
            "redoc_url": f"{settings.API_PREFIX}/redoc",
        }
    )
    application = FastAPI(
        title=settings.APP_NAME,
        version="0.1.0",
        **documentation_urls,
    )

    application.add_middleware(RequestContextMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.frontend_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", settings.CSRF_HEADER_NAME],
    )

    register_exception_handlers(application)
    application.include_router(api_router)
    application.include_router(health_router)

    return application


app = create_app()
