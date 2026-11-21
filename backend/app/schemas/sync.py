from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.config import settings

EntityType = Literal[
    "user",
    "site",
    "checklist_template",
    "checklist_item",
    "inspection",
    "inspection_answer",
    "inspection_result",
]
OperationType = Literal["CREATE", "UPDATE", "DELETE", "SUBMIT"]
OperationStatus = Literal["ACCEPTED", "CONFLICT", "REJECTED", "RETRYABLE_ERROR"]
ChangeType = Literal["CREATE", "UPDATE", "DELETE"]
ResolutionType = Literal["KEEP_SERVER", "KEEP_LOCAL", "MANUAL_MERGE", "ADMIN_RESOLUTION"]
ConflictStatus = Literal["OPEN", "RESOLVED", "DISMISSED"]


class DeviceCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    device_name: str | None = Field(default=None, max_length=150)
    device_fingerprint: str | None = None


class DeviceResponse(BaseModel):
    id: UUID
    device_name: str | None
    is_active: bool
    created_at: datetime


class SyncOperationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    operation_id: UUID
    operation_type: OperationType
    entity_type: EntityType
    entity_id: UUID
    base_version: int | None = Field(default=None, ge=1)
    payload: dict[str, Any]


class SyncPushRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    device_id: UUID
    operations: list[SyncOperationRequest] = Field(
        min_length=1, max_length=settings.SYNC_MAX_BATCH_SIZE
    )


class PushResult(BaseModel):
    operation_id: UUID
    status: OperationStatus
    entity_id: UUID
    base_version: int | None = None
    server_version: int | None = None
    message: str | None = None
    error: dict[str, str] | None = None


class SyncPushResponse(BaseModel):
    results: list[PushResult]


class SyncChangeItem(BaseModel):
    change_id: UUID
    # Older change rows may use the legacy uppercase entity names. Responses
    # stay permissive while new writes use the lowercase contract names.
    entity_type: str
    entity_id: UUID
    change_type: ChangeType
    entity_version: int | None = None
    payload: dict[str, Any] | None = None


class SyncPullResponse(BaseModel):
    changes: list[SyncChangeItem]
    next_cursor: str
    has_more: bool


class SyncStatusResponse(BaseModel):
    device_id: UUID
    is_active: bool
    last_seen_at: datetime | None
    open_conflicts: int


class ConflictSummary(BaseModel):
    id: UUID
    entity_type: str
    entity_id: UUID
    base_version: int | None
    server_version: int | None
    status: ConflictStatus
    created_at: datetime


class ConflictDetail(ConflictSummary):
    local_payload: dict[str, Any]
    server_payload: dict[str, Any]
    resolution_type: ResolutionType | None
    resolved_at: datetime | None


class ConflictResolveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    resolution_type: ResolutionType
    expected_server_version: int = Field(ge=1)


class ConflictResolveResponse(BaseModel):
    conflict_id: UUID
    status: ConflictStatus
    resolution_type: ResolutionType
    resolved_at: datetime
