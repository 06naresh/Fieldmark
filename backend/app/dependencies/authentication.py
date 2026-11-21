from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import UnauthorizedError
from app.core.security import decode_access_token, validate_csrf_request
from app.database.session import get_db
from app.repositories import AuthRepository
from app.schemas.auth import CurrentUserResponse

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> CurrentUserResponse:
    claims = decode_access_token(token)
    user = AuthRepository(db).get_user_by_id(claims.user_id)

    if user is None or not user.is_active:
        raise UnauthorizedError("Authentication is invalid.")

    return CurrentUserResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
    )


def verify_csrf(request: Request) -> None:
    validate_csrf_request(request)
