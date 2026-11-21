from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
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


class ChecklistTemplate(Base):
    __tablename__ = "checklist_templates"
    __table_args__ = (
        UniqueConstraint("id", "template_version", name="uq_template_revision"),
        CheckConstraint("template_version > 0", name="ck_checklist_templates_template_version"),
        CheckConstraint("version > 0", name="ck_checklist_templates_version"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    template_version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("1")
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT", name="fk_checklist_templates_created_by"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    created_by_user: Mapped["User"] = relationship(back_populates="created_checklist_templates")
    items: Mapped[list["ChecklistItem"]] = relationship(
        back_populates="template", cascade="all, delete-orphan", passive_deletes=True
    )
    inspections: Mapped[list["Inspection"]] = relationship(
        back_populates="template",
        foreign_keys="[Inspection.template_id, Inspection.template_version]",
        primaryjoin=(
            "and_(ChecklistTemplate.id == Inspection.template_id, "
            "ChecklistTemplate.template_version == Inspection.template_version)"
        ),
    )


class ChecklistItem(Base):
    __tablename__ = "checklist_items"
    __table_args__ = (
        CheckConstraint(
            "response_type IN ('YES_NO', 'TEXT', 'NUMBER', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE')",
            name="ck_checklist_items_response_type",
        ),
        CheckConstraint("display_order >= 0", name="ck_checklist_items_display_order"),
        UniqueConstraint("template_id", "display_order", name="uq_template_item_order"),
        UniqueConstraint("template_id", "id", name="uq_template_item_id"),
        Index("idx_checklist_items_template_id", "template_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("checklist_templates.id", ondelete="RESTRICT", name="fk_checklist_items_template_id"),
        nullable=False,
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    response_type: Mapped[str] = mapped_column(String(30), nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    display_order: Mapped[int] = mapped_column(Integer, nullable=False)
    options: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    template: Mapped["ChecklistTemplate"] = relationship(back_populates="items")
    answers: Mapped[list["InspectionAnswer"]] = relationship(back_populates="checklist_item")
