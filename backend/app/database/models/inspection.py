from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
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


class Inspection(Base):
    __tablename__ = "inspections"
    __table_args__ = (
        ForeignKeyConstraint(
            ["template_id", "template_version"],
            ["checklist_templates.id", "checklist_templates.template_version"],
            name="fk_inspection_template_revision",
            ondelete="RESTRICT",
        ),
        CheckConstraint(
            "status IN ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED', 'CANCELLED')",
            name="ck_inspections_status",
        ),
        CheckConstraint("version > 0", name="ck_inspections_version"),
        CheckConstraint(
            "due_at IS NULL OR scheduled_at IS NULL OR due_at >= scheduled_at",
            name="chk_inspection_due_date",
        ),
        Index("idx_inspections_assigned_to", "assigned_to"),
        Index("idx_inspections_site_id", "site_id"),
        Index("idx_inspections_status", "status"),
        Index("idx_inspections_due_at", "due_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sites.id", ondelete="RESTRICT", name="fk_inspections_site_id"),
        nullable=False,
    )
    template_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    template_version: Mapped[int] = mapped_column(Integer, nullable=False)
    assigned_to: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT", name="fk_inspections_assigned_to"),
        nullable=False,
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT", name="fk_inspections_created_by"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, server_default=text("'ASSIGNED'")
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    site: Mapped["Site"] = relationship(back_populates="inspections")
    template: Mapped["ChecklistTemplate"] = relationship(
        back_populates="inspections",
        foreign_keys=[template_id, template_version],
        primaryjoin=(
            "and_(Inspection.template_id == ChecklistTemplate.id, "
            "Inspection.template_version == ChecklistTemplate.template_version)"
        ),
    )
    assigned_user: Mapped["User"] = relationship(
        back_populates="assigned_inspections", foreign_keys=[assigned_to]
    )
    created_user: Mapped["User"] = relationship(
        back_populates="created_inspections", foreign_keys=[created_by]
    )
    results: Mapped[list["InspectionResult"]] = relationship(back_populates="inspection")
    answers: Mapped[list["InspectionAnswer"]] = relationship(back_populates="inspection")


class InspectionResult(Base):
    __tablename__ = "inspection_results"
    __table_args__ = (
        CheckConstraint("submission_number > 0", name="ck_inspection_results_submission_number"),
        CheckConstraint(
            "submitted_version > 0", name="ck_inspection_results_submitted_version"
        ),
        CheckConstraint(
            "overall_status IN ('PASS', 'FAIL', 'NEEDS_REVIEW')",
            name="ck_inspection_results_overall_status",
        ),
        UniqueConstraint("inspection_id", "submission_number", name="uq_inspection_submission"),
        UniqueConstraint(
            "submission_id", name="uq_inspection_results_submission_id"
        ),
        Index("idx_inspection_results_inspection_id", "inspection_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    inspection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inspections.id", ondelete="RESTRICT", name="fk_inspection_results_inspection_id"),
        nullable=False,
    )
    submitted_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT", name="fk_inspection_results_submitted_by"),
        nullable=False,
    )
    submission_number: Mapped[int] = mapped_column(Integer, nullable=False)
    submission_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    submitted_version: Mapped[int] = mapped_column(Integer, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    overall_status: Mapped[str] = mapped_column(String(30), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    inspection: Mapped["Inspection"] = relationship(back_populates="results")
    submitted_user: Mapped["User"] = relationship(
        back_populates="submitted_results", foreign_keys=[submitted_by]
    )


class InspectionAnswer(Base):
    __tablename__ = "inspection_answers"
    __table_args__ = (
        CheckConstraint("version > 0", name="ck_inspection_answers_version"),
        UniqueConstraint("inspection_id", "checklist_item_id", name="uq_inspection_checklist_answer"),
        Index("idx_inspection_answers_inspection_id", "inspection_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid()
    )
    inspection_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inspections.id", ondelete="RESTRICT", name="fk_inspection_answers_inspection_id"),
        nullable=False,
    )
    checklist_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("checklist_items.id", ondelete="RESTRICT", name="fk_inspection_answers_checklist_item_id"),
        nullable=False,
    )
    answer_value: Mapped[dict[str, object] | None] = mapped_column(JSONB, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    last_modified_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT", name="fk_inspection_answers_last_modified_by"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    inspection: Mapped["Inspection"] = relationship(back_populates="answers")
    checklist_item: Mapped["ChecklistItem"] = relationship(back_populates="answers")
    last_modified_user: Mapped["User"] = relationship(
        back_populates="modified_answers", foreign_keys=[last_modified_by]
    )
