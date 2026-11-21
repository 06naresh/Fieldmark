"""Add client submission identifier to inspection results.

Revision ID: 0002_submission_id
Revises: 0001_initial_schema
Create Date: 2026-11-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002_submission_id"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "inspection_results",
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    # Existing results predate client-generated identifiers.
    op.execute(
        "UPDATE inspection_results SET submission_id = gen_random_uuid() "
        "WHERE submission_id IS NULL"
    )
    op.alter_column("inspection_results", "submission_id", nullable=False)
    op.create_unique_constraint(
        "uq_inspection_results_submission_id",
        "inspection_results",
        ["submission_id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_inspection_results_submission_id",
        "inspection_results",
        type_="unique",
    )
    op.drop_column("inspection_results", "submission_id")
