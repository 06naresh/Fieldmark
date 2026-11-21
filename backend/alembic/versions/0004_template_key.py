"""Add a durable checklist template lineage identifier.

Revision ID: 0004_template_key
Revises: 0003_submitted_version
Create Date: 2026-11-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0004_template_key"
down_revision = "0003_submitted_version"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "checklist_templates",
        sa.Column("template_key", postgresql.UUID(as_uuid=True), nullable=True),
    )
    # Existing standalone templates begin their own lineage. New revisions
    # inherit the key of the source template.
    op.execute(
        "UPDATE checklist_templates SET template_key = id WHERE template_key IS NULL"
    )
    op.alter_column(
        "checklist_templates",
        "template_key",
        nullable=False,
        server_default=sa.text("gen_random_uuid()"),
    )
    op.create_unique_constraint(
        "uq_template_lineage_revision",
        "checklist_templates",
        ["template_key", "template_version"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_template_lineage_revision",
        "checklist_templates",
        type_="unique",
    )
    op.drop_column("checklist_templates", "template_key")
