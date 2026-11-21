"""Persist the inspection version accepted by a submission.

Revision ID: 0003_submitted_version
Revises: 0002_submission_id
Create Date: 2026-11-21

"""
from alembic import op
import sqlalchemy as sa

revision = "0003_submitted_version"
down_revision = "0002_submission_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "inspection_results",
        sa.Column("submitted_version", sa.Integer(), nullable=True),
    )
    # Historical results used the inspection's current version at submission time.
    op.execute(
        """
        UPDATE inspection_results AS result
        SET submitted_version = COALESCE(inspection.version, 1)
        FROM inspections AS inspection
        WHERE inspection.id = result.inspection_id
          AND result.submitted_version IS NULL
        """
    )
    op.execute(
        "UPDATE inspection_results SET submitted_version = 1 "
        "WHERE submitted_version IS NULL"
    )
    op.alter_column("inspection_results", "submitted_version", nullable=False)
    op.create_check_constraint(
        "ck_inspection_results_submitted_version",
        "inspection_results",
        "submitted_version > 0",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_inspection_results_submitted_version",
        "inspection_results",
        type_="check",
    )
    op.drop_column("inspection_results", "submitted_version")
