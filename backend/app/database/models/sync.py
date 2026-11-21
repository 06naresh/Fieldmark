from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class SyncDevice(Base):
    __tablename__ = "sync_devices"
    __table_args__ = (Index("idx_sync_devices_user_id", "user_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE", name="fk_sync_devices_user_id"),
        nullable=False,
    )
    device_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    device_fingerprint: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="sync_devices")
    operations: Mapped[list["SyncOperation"]] = relationship(back_populates="device")


class SyncOperation(Base):
    __tablename__ = "sync_operations"
    __table_args__ = (
        UniqueConstraint("operation_id", name="uq_sync_operations_operation_id"),
        CheckConstraint(
            "operation_type IN ('CREATE', 'UPDATE', 'DELETE', 'SUBMIT')",
            name="ck_sync_operations_operation_type",
        ),
        CheckConstraint(
            "result_status IN ('ACCEPTED', 'CONFLICT', 'REJECTED', 'RETRYABLE_ERROR')",
            name="ck_sync_operations_result_status",
        ),
        Index("idx_sync_operations_user_id", "user_id"),
        Index("idx_sync_operations_device_id", "device_id"),
        Index("idx_sync_operations_entity", "entity_type", "entity_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    operation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT", name="fk_sync_operations_user_id"),
        nullable=False,
    )
    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sync_devices.id", ondelete="RESTRICT", name="fk_sync_operations_device_id"),
        nullable=False,
    )
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    operation_type: Mapped[str] = mapped_column(String(30), nullable=False)
    request_hash: Mapped[str] = mapped_column(Text, nullable=False)
    result_status: Mapped[str] = mapped_column(String(30), nullable=False)
    response_payload: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)
    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="sync_operations", foreign_keys=[user_id])
    device: Mapped["SyncDevice"] = relationship(back_populates="operations")
    conflicts: Mapped[list["SyncConflict"]] = relationship(back_populates="operation")


class SyncConflict(Base):
    __tablename__ = "sync_conflicts"
    __table_args__ = (
        CheckConstraint(
            "status IN ('OPEN', 'RESOLVED', 'DISMISSED')",
            name="ck_sync_conflicts_status",
        ),
        CheckConstraint(
            "resolution_type IS NULL OR resolution_type IN "
            "('KEEP_SERVER', 'KEEP_LOCAL', 'MANUAL_MERGE', 'ADMIN_RESOLUTION')",
            name="ck_sync_conflicts_resolution_type",
        ),
        CheckConstraint(
            "(status = 'OPEN' AND resolved_by IS NULL AND resolved_at IS NULL) OR "
            "(status IN ('RESOLVED', 'DISMISSED') AND resolved_by IS NOT NULL "
            "AND resolved_at IS NOT NULL)",
            name="chk_conflict_resolution",
        ),
        Index("idx_sync_conflicts_status", "status"),
        Index("idx_sync_conflicts_entity", "entity_type", "entity_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    operation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sync_operations.id", ondelete="RESTRICT", name="fk_sync_conflicts_operation_id"),
        nullable=False,
    )
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    local_payload: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    server_payload: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    base_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    server_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, server_default=text("'OPEN'")
    )
    resolution_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT", name="fk_sync_conflicts_resolved_by"),
        nullable=True,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    operation: Mapped["SyncOperation"] = relationship(back_populates="conflicts")
    resolved_user: Mapped["User"] = relationship(
        back_populates="resolved_conflicts", foreign_keys=[resolved_by]
    )


class SyncChange(Base):
    __tablename__ = "sync_changes"
    __table_args__ = (
        CheckConstraint(
            "change_type IN ('CREATE', 'UPDATE', 'DELETE')",
            name="ck_sync_changes_change_type",
        ),
        UniqueConstraint("change_position", name="uq_sync_changes_position"),
        Index("idx_sync_changes_entity", "entity_type", "entity_id"),
        Index("idx_sync_changes_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    change_type: Mapped[str] = mapped_column(String(30), nullable=False)
    entity_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payload: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)
    authorized_user_ids: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    is_global: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    change_position: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
