from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

InspectionStatus = Literal["ASSIGNED", "IN_PROGRESS", "SUBMITTED", "REVIEWED", "CANCELLED"]
OverallStatus = Literal["PASS", "FAIL", "NEEDS_REVIEW"]


def validate_timezone(value: datetime | None) -> datetime | None:
    if value is not None and value.tzinfo is None:
        raise ValueError("Timestamps must include timezone information.")
    return value


class InspectionCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    site_id: UUID
    template_id: UUID
    template_version: int = Field(ge=1)
    assigned_to: UUID
    title: str = Field(min_length=1, max_length=200)
    instructions: str | None = None
    scheduled_at: datetime | None = None
    due_at: datetime | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("title must not be blank.")
        return normalized

    @field_validator("scheduled_at", "due_at")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        return validate_timezone(value)

    @model_validator(mode="after")
    def validate_dates(self) -> "InspectionCreate":
        if (
            self.scheduled_at is not None
            and self.due_at is not None
            and self.due_at < self.scheduled_at
        ):
            raise ValueError("due_at must not be earlier than scheduled_at.")
        return self


class InspectionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=200)
    instructions: str | None = None
    scheduled_at: datetime | None = None
    due_at: datetime | None = None
    version: int = Field(ge=1)

    @field_validator("title")
    @classmethod
    def require_non_clearable_title(cls, value: str | None) -> str:
        if value is None:
            raise ValueError("This field cannot be null.")
        normalized = value.strip()
        if not normalized:
            raise ValueError("title must not be blank.")
        return normalized

    @model_validator(mode="after")
    def require_at_least_one_editable_field(self) -> "InspectionUpdate":
        editable = {"title", "instructions", "scheduled_at", "due_at"}
        if not self.model_fields_set.intersection(editable):
            raise ValueError("At least one editable field must be supplied.")
        return self

    @field_validator("scheduled_at", "due_at")
    @classmethod
    def require_timezone(cls, value: datetime | None) -> datetime | None:
        return validate_timezone(value)


class StartRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: int = Field(ge=1)


class AnswerSaveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answer_value: Any = None
    notes: str | None = None
    base_version: int = Field(ge=1)


class SubmitRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: str | None = None
    overall_status: OverallStatus
    version: int = Field(ge=1)
    submission_id: UUID


class InspectionResponse(BaseModel):
    id: UUID
    site_id: UUID
    template_id: UUID
    template_version: int
    assigned_to: UUID
    title: str
    instructions: str | None
    scheduled_at: datetime | None
    due_at: datetime | None
    status: InspectionStatus
    version: int


class AnswerResponse(BaseModel):
    id: UUID
    inspection_id: UUID
    checklist_item_id: UUID
    answer_value: Any
    notes: str | None
    version: int


class InspectionResultResponse(BaseModel):
    id: UUID
    inspection_id: UUID
    submission_id: UUID
    submission_number: int
    submitted_version: int
    submitted_at: datetime
    summary: str | None
    overall_status: OverallStatus


class InspectionDetailResponse(InspectionResponse):
    site: dict[str, Any]
    template: dict[str, Any]
    checklist_items: list[dict[str, Any]]
    answers: list[AnswerResponse]
    result: InspectionResultResponse | None = None


class StartResponse(BaseModel):
    id: UUID
    status: InspectionStatus
    version: int


class SubmitResponse(BaseModel):
    result_id: UUID
    inspection_id: UUID
    submission_number: int
    overall_status: OverallStatus
    submitted_at: datetime
    inspection_status: InspectionStatus
