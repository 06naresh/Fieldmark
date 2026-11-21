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
