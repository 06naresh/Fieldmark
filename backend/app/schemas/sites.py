from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class SiteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    site_code: str = Field(min_length=1, max_length=50)
    address: str = Field(min_length=1)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)
    country: str | None = Field(default=None, max_length=100)
    description: str | None = None

    @field_validator("name", "address")
    @classmethod
    def normalize_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("The value must not be blank.")
        return normalized

    @field_validator("site_code")
    @classmethod
    def normalize_site_code(cls, value: str) -> str:
        normalized = value.strip().upper()
        if not normalized:
            raise ValueError("site_code must not be blank.")
        return normalized

    @field_validator("city", "state", "postal_code", "country")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class SiteUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=200)
    address: str | None = Field(default=None, min_length=1)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)
    country: str | None = Field(default=None, max_length=100)
    description: str | None = None
    version: int = Field(ge=1)

    @field_validator("name", "address")
    @classmethod
    def require_non_clearable_text(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("This field cannot be null.")
        normalized = value.strip()
        if not normalized:
            raise ValueError("The value must not be blank.")
        return normalized

    @model_validator(mode="after")
    def require_at_least_one_editable_field(self) -> "SiteUpdate":
        editable = {
            "name",
            "address",
            "city",
            "state",
            "postal_code",
            "country",
            "description",
        }
        if not self.model_fields_set.intersection(editable):
            raise ValueError("At least one editable field must be supplied.")
        return self


class SiteStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_active: bool
    version: int = Field(ge=1)


class SiteResponse(BaseModel):
    id: UUID
    name: str
    site_code: str
    address: str
    city: str | None
    state: str | None
    postal_code: str | None
    country: str | None
    description: str | None
    is_active: bool
    version: int
