from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.db_errors import commit_transaction
from app.core.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    VersionConflictError,
)
from app.core.permissions import is_admin
from app.core.security import utc_now
from app.database.models import Inspection, InspectionAnswer, SyncConflict
from app.repositories import SyncRepository
from app.schemas.auth import CurrentUserResponse
from app.schemas.sync import (
    ConflictDetail,
    ConflictResolveRequest,
    ConflictResolveResponse,
    ConflictStatus,
    ConflictSummary,
)


class ConflictService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = SyncRepository(db)

    def list(
        self,
        *,
        current_user: CurrentUserResponse,
        status: ConflictStatus | None,
        skip: int,
        limit: int,
    ) -> tuple[list[SyncConflict], int]:
        return self.repository.list_conflicts(
            is_admin=is_admin(current_user),
            user_id=current_user.id,
            status=status,
            skip=skip,
            limit=limit,
        )

    def detail(
        self, conflict_id: UUID, current_user: CurrentUserResponse
    ) -> SyncConflict:
        conflict = self.repository.get_conflict(conflict_id)
        if conflict is None:
            raise NotFoundError("The requested conflict was not found.")
        self._require_access(conflict, current_user)
        return conflict

    def resolve(
        self,
        conflict_id: UUID,
        current_user: CurrentUserResponse,
        payload: ConflictResolveRequest,
    ) -> ConflictResolveResponse:
        conflict = self.detail(conflict_id, current_user)
        if conflict.status != "OPEN":
            raise ConflictError("The conflict has already been resolved.")

        if payload.resolution_type == "ADMIN_RESOLUTION" and not is_admin(current_user):
            raise ForbiddenError("Only an administrator may apply an administrative resolution.")

        expected = payload.expected_server_version
        if conflict.server_version is not None and expected != conflict.server_version:
            raise VersionConflictError("The conflict resolution is based on a stale server version.")

        current_version = self._current_entity_version(
            conflict.entity_type, conflict.entity_id
        )
        if current_version is not None and current_version != expected:
            raise VersionConflictError("The record has changed since the conflict was detected.")

        resolved_at = utc_now()
        conflict.status = "RESOLVED"
        conflict.resolution_type = payload.resolution_type
        conflict.resolved_by = current_user.id
        conflict.resolved_at = resolved_at
        commit_transaction(self.db)

        return ConflictResolveResponse(
            conflict_id=conflict.id,
            status="RESOLVED",
            resolution_type=payload.resolution_type,
            resolved_at=resolved_at,
        )

    def _require_access(
        self, conflict: SyncConflict, current_user: CurrentUserResponse
    ) -> None:
        if is_admin(current_user):
            return
        if conflict.operation.user_id != current_user.id:
            raise ForbiddenError("You do not have permission to access this conflict.")

    def _current_entity_version(self, entity_type: str, entity_id: UUID) -> int | None:
        model = {
            "inspection": Inspection,
            "inspection_answer": InspectionAnswer,
        }.get(entity_type.lower())
        if model is None:
            return None
        entity = self.db.get(model, entity_id)
        return None if entity is None else int(entity.version)


def conflict_summary(conflict: SyncConflict) -> ConflictSummary:
    return ConflictSummary(
        id=conflict.id,
        operation_id=conflict.operation.operation_id,
        entity_type=conflict.entity_type,
        entity_id=conflict.entity_id,
        base_version=conflict.base_version,
        server_version=conflict.server_version,
        status=conflict.status,  # type: ignore[arg-type]
        resolution_type=conflict.resolution_type,  # type: ignore[arg-type]
        resolved_by=conflict.resolved_by,
        resolved_at=conflict.resolved_at,
        created_at=conflict.created_at,
    )


def conflict_detail(conflict: SyncConflict) -> ConflictDetail:
    summary = conflict_summary(conflict)
    return ConflictDetail(
        **summary.model_dump(),
        local_payload=conflict.local_payload,
        server_payload=conflict.server_payload,
    )
