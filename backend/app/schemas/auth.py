from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

Role = Literal["ADMIN", "INSPECTOR"]


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class SignupRequest(BaseModel):
    """Public self-registration request.

    Role is deliberately absent: public signup can only create INSPECTOR
    accounts. Administrative accounts remain administrator-created.
    """

    model_config = ConfigDict(extra="forbid")

    full_name: str = Field(min_length=1, max_length=150)
    email: str = Field(max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)

    @field_validator("full_name", "email")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("The value must not be blank.")
        return normalized.lower() if "@" in normalized else normalized


class LogoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    logout_all_devices: bool = False


class TokenUser(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: Role


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class LoginResponse(TokenResponse):
    user: TokenUser


class CurrentUserResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: Role
    is_active: bool
