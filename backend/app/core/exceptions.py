from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette import status

from app.core.logging import get_logger
from app.schemas.common import ErrorDetail, ErrorResponse

logger = get_logger(__name__)

HTTP_422 = 422

_STATUS_ERROR_CODES = {
    status.HTTP_400_BAD_REQUEST: "BAD_REQUEST",
    status.HTTP_401_UNAUTHORIZED: "UNAUTHORIZED",
    status.HTTP_403_FORBIDDEN: "FORBIDDEN",
    status.HTTP_404_NOT_FOUND: "NOT_FOUND",
    status.HTTP_405_METHOD_NOT_ALLOWED: "METHOD_NOT_ALLOWED",
    status.HTTP_409_CONFLICT: "CONFLICT",
    HTTP_422: "VALIDATION_ERROR",
    status.HTTP_429_TOO_MANY_REQUESTS: "RATE_LIMIT_EXCEEDED",
    status.HTTP_500_INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
    status.HTTP_503_SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
}


class AppError(Exception):
    """Base class for expected application errors with a stable API code."""

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    code: str = "INTERNAL_SERVER_ERROR"
    default_message: str = "An unexpected error occurred."

    def __init__(
        self,
        message: str | None = None,
        details: list[ErrorDetail] | None = None,
    ) -> None:
        self.message = message or self.default_message
        self.details = details
        super().__init__(self.message)


class BadRequestError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "BAD_REQUEST"
    default_message = "The request could not be processed."


class UnauthorizedError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "UNAUTHORIZED"
    default_message = "Authentication is required."


class ForbiddenError(AppError):
    status_code = status.HTTP_403_FORBIDDEN
    code = "FORBIDDEN"
    default_message = "You do not have permission to perform this action."


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "NOT_FOUND"
    default_message = "The requested resource was not found."


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "CONFLICT"
    default_message = "The request conflicts with the current resource state."


class UnprocessableEntityError(AppError):
    status_code = HTTP_422
    code = "VALIDATION_ERROR"
    default_message = "The supplied data is invalid."


class RateLimitError(AppError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    code = "RATE_LIMIT_EXCEEDED"
    default_message = "Too many requests. Please try again later."


class ServiceUnavailableError(AppError):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    code = "SERVICE_UNAVAILABLE"
    default_message = "The service is temporarily unavailable."


def get_request_id(request: Request) -> str:
    return str(getattr(request.state, "request_id", "unknown"))


def error_response(
    *,
    request: Request,
    status_code: int,
    code: str,
    message: str,
    details: list[ErrorDetail] | None = None,
) -> JSONResponse:
    payload = ErrorResponse(
        error={
            "code": code,
            "message": message,
            "details": details,
            "request_id": get_request_id(request),
        }
    ).model_dump(exclude_none=True)
    return JSONResponse(status_code=status_code, content=payload)


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return error_response(
        request=request,
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        details=exc.details,
    )


async def request_validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    details = []
    for error in exc.errors():
        location = error.get("loc", ())
        field = ".".join(str(part) for part in location[1:]) or "body"
        details.append(ErrorDetail(field=field, message=str(error.get("msg", "Invalid value."))))

    return error_response(
        request=request,
        status_code=HTTP_422,
        code="VALIDATION_ERROR",
        message="The supplied data is invalid.",
        details=details,
    )


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    if exc.status_code >= status.HTTP_500_INTERNAL_SERVER_ERROR:
        message = "An unexpected error occurred."
    elif isinstance(exc.detail, str) and exc.detail:
        message = exc.detail
    else:
        message = "The request could not be processed."

    return error_response(
        request=request,
        status_code=exc.status_code,
        code=_STATUS_ERROR_CODES.get(exc.status_code, "HTTP_ERROR"),
        message=message,
    )


async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
    # Do not log the raw exception message; it may contain credentials or tokens.
    logger.error(
        "unhandled_request_error",
        extra={
            "request_id": get_request_id(request),
            "method": request.method,
            "path": request.url.path,
            "exception_type": type(exc).__name__,
        },
    )
    return error_response(
        request=request,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected error occurred.",
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(RequestValidationError, request_validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, unexpected_error_handler)
