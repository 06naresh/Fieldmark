import time
from uuid import uuid4

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.core.logging import get_logger

logger = get_logger(__name__)


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Assign a request ID and emit one structured completion log entry."""

    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid4())
        request.state.request_id = request_id
        started_at = time.perf_counter()

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id

        log_extra = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": round((time.perf_counter() - started_at) * 1000, 2),
        }
        if response.status_code >= 500:
            logger.error("request_completed", extra=log_extra)
        else:
            logger.info("request_completed", extra=log_extra)

        return response
