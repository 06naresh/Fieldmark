from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Role = Literal["ADMIN", "INSPECTOR"]


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str = Field(min_length=1, max_length=150)
    email: str = Field(max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)
    role: Role

    @field_validator("full_name", "email")
    @classmethod
    def normalize_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("The value must not be blank.")
        return normalized.lower() if "@" in normalized else normalized


class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(default=None, min_length=1, max_length=150)
    role: Role | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def require_at_least_one_field(self) -> "UserUpdate":
        if self.full_name is None and self.role is None and self.is_active is None:
            raise ValueError("At least one field must be supplied.")
        return self

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("full_name must not be blank.")
        return normalized


class UserStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_active: bool


class UserResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: Role
    is_active: bool
