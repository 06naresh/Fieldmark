from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
        CheckConstraint("role IN ('ADMIN', 'INSPECTOR')", name="ck_users_role"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    created_checklist_templates: Mapped[list["ChecklistTemplate"]] = relationship(
        back_populates="created_by_user", foreign_keys="ChecklistTemplate.created_by"
    )
    assigned_inspections: Mapped[list["Inspection"]] = relationship(
        back_populates="assigned_user", foreign_keys="Inspection.assigned_to"
    )
    created_inspections: Mapped[list["Inspection"]] = relationship(
        back_populates="created_user", foreign_keys="Inspection.created_by"
    )
    submitted_results: Mapped[list["InspectionResult"]] = relationship(
        back_populates="submitted_user", foreign_keys="InspectionResult.submitted_by"
    )
    modified_answers: Mapped[list["InspectionAnswer"]] = relationship(
        back_populates="last_modified_user", foreign_keys="InspectionAnswer.last_modified_by"
    )
    sync_devices: Mapped[list["SyncDevice"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    sync_operations: Mapped[list["SyncOperation"]] = relationship(
        back_populates="user", foreign_keys="SyncOperation.user_id"
    )
    resolved_conflicts: Mapped[list["SyncConflict"]] = relationship(
        back_populates="resolved_user", foreign_keys="SyncConflict.resolved_by"
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = (
        UniqueConstraint("token_hash", name="uq_refresh_tokens_token_hash"),
        Index("idx_refresh_tokens_user_id", "user_id"),
        Index("idx_refresh_tokens_expires_at", "expires_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE", name="fk_refresh_tokens_user_id"),
        nullable=False,
    )
    token_hash: Mapped[str] = mapped_column(Text, nullable=False)
    device_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")
