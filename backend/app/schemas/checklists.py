from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

ResponseType = Literal[
    "YES_NO", "TEXT", "NUMBER", "SINGLE_CHOICE", "MULTIPLE_CHOICE"
]


def extract_choices(options: dict[str, Any] | None) -> list[str]:
    if not options:
        return []
    source = options.get("choices", options.get("options"))
    if not isinstance(source, list):
        return []
    return [str(choice) for choice in source if str(choice).strip()]


class ChecklistItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str = Field(min_length=1)
    description: str | None = None
    response_type: ResponseType
    is_required: bool = True
    display_order: int = Field(ge=0)
    options: dict[str, Any] | None = None

    @field_validator("question")
    @classmethod
    def normalize_question(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("question must not be blank.")
        return normalized

    @model_validator(mode="after")
    def validate_choices(self) -> "ChecklistItemCreate":
        if self.response_type in {"SINGLE_CHOICE", "MULTIPLE_CHOICE"} and not extract_choices(
            self.options
        ):
            raise ValueError("Choice questions require non-empty options.")
        return self


class ChecklistItemUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    question: str | None = Field(default=None, min_length=1)
    description: str | None = None
    is_required: bool | None = None
    display_order: int | None = Field(default=None, ge=0)
    options: dict[str, Any] | None = None

    @field_validator("question")
    @classmethod
    def require_non_clearable_question(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("This field cannot be null.")
        normalized = value.strip()
        if not normalized:
            raise ValueError("question must not be blank.")
        return normalized

    @field_validator("is_required", "display_order")
    @classmethod
    def require_non_nullable_values(cls, value: bool | int | None) -> bool | int:
        if value is None:
            raise ValueError("This field cannot be null.")
        return value

    @model_validator(mode="after")
    def require_at_least_one_field(self) -> "ChecklistItemUpdate":
        editable = {
            "question",
            "description",
            "is_required",
            "display_order",
            "options",
        }
        if not self.model_fields_set.intersection(editable):
            raise ValueError("At least one field must be supplied.")
        return self


class ChecklistItemResponse(BaseModel):
    id: UUID
    question: str
    description: str | None
    response_type: ResponseType
    is_required: bool
    display_order: int
    options: dict[str, Any] | None


class ChecklistTemplateCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    items: list[ChecklistItemCreate] = Field(min_length=1)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("name must not be blank.")
        return normalized

    @model_validator(mode="after")
    def validate_display_order(self) -> "ChecklistTemplateCreate":
        orders = [item.display_order for item in self.items]
        if len(orders) != len(set(orders)):
            raise ValueError("display_order must be unique within a template.")
        return self


class TemplateRevisionCreate(ChecklistTemplateCreate):
    pass


class ChecklistTemplateStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_active: bool


class ChecklistTemplateResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    template_version: int
    is_active: bool
    version: int
    items: list[ChecklistItemResponse]
