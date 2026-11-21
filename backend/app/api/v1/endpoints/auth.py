from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import UnauthorizedError
from app.core.rate_limit import login_rate_limiter
from app.core.security import (
    clear_csrf_cookie,
    clear_refresh_cookie,
    set_csrf_cookie,
    set_refresh_cookie,
)
from app.database.session import get_db
from app.dependencies.authentication import get_current_user, verify_csrf
from app.schemas.auth import (
    CurrentUserResponse,
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    TokenResponse,
    TokenUser,
)
from app.schemas.common import DataResponse, MessageResponse
from app.services.auth_service import AuthService, InvalidCredentials

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.post("/login", response_model=DataResponse[LoginResponse])
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> DataResponse[LoginResponse]:
    rate_limit_key = f"{_client_ip(request)}:{payload.email}"
    login_rate_limiter.check(rate_limit_key)

    try:
        result = AuthService(db).login(payload.email, payload.password)
    except InvalidCredentials as exc:
        login_rate_limiter.record_failure(rate_limit_key)
        raise UnauthorizedError("Email or password is incorrect.") from exc

    login_rate_limiter.reset(rate_limit_key)
    set_refresh_cookie(response, result.refresh_token)
    set_csrf_cookie(response, result.csrf_token)

    return DataResponse(
        data=LoginResponse(
            access_token=result.access_token,
            token_type="bearer",
            expires_in=result.expires_in,
            user=TokenUser(
                id=result.user.id,
                full_name=result.user.full_name,
                email=result.user.email,
                role=result.user.role,
            ),
        )
    )


@router.post("/refresh", response_model=DataResponse[TokenResponse])
def refresh(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    _: None = Depends(verify_csrf),
) -> DataResponse[TokenResponse]:
    raw_refresh_token = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    if not raw_refresh_token:
        raise UnauthorizedError("Refresh token is required.")

    result = AuthService(db).refresh(raw_refresh_token)
    set_refresh_cookie(response, result.refresh_token)
    set_csrf_cookie(response, result.csrf_token)

    return DataResponse(
        data=TokenResponse(
            access_token=result.access_token,
            token_type="bearer",
            expires_in=result.expires_in,
        )
    )


@router.get("/me", response_model=DataResponse[CurrentUserResponse])
def me(
    current_user: CurrentUserResponse = Depends(get_current_user),
) -> DataResponse[CurrentUserResponse]:
    return DataResponse(data=current_user)


@router.post("/logout", response_model=MessageResponse)
def logout(
    payload: LogoutRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: CurrentUserResponse = Depends(get_current_user),
    _: None = Depends(verify_csrf),
) -> MessageResponse:
    raw_refresh_token = request.cookies.get(settings.REFRESH_COOKIE_NAME)
    AuthService(db).logout(
        user_id=current_user.id,
        raw_refresh_token=raw_refresh_token,
        logout_all_devices=payload.logout_all_devices,
    )

    clear_refresh_cookie(response)
    clear_csrf_cookie(response)
    return MessageResponse(message="Logged out successfully.")
