"""Add sync change authorization scope and retryable operation status.

Revision ID: 0005_sync_scope_and_retry
Revises: 0004_template_key
Create Date: 2026-11-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0005_sync_scope_and_retry"
down_revision = "0004_template_key"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "sync_changes",
        sa.Column(
            "authorized_user_ids",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "sync_changes",
        sa.Column(
            "is_global",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )

    op.drop_constraint(
        "ck_sync_operations_result_status",
        "sync_operations",
        type_="check",
    )
    op.create_check_constraint(
        "ck_sync_operations_result_status",
        "sync_operations",
        "result_status IN ('ACCEPTED', 'CONFLICT', 'REJECTED', 'RETRYABLE_ERROR')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_sync_operations_result_status",
        "sync_operations",
        type_="check",
    )
    op.create_check_constraint(
        "ck_sync_operations_result_status",
        "sync_operations",
        "result_status IN ('ACCEPTED', 'CONFLICT', 'REJECTED')",
    )
    op.drop_column("sync_changes", "is_global")
    op.drop_column("sync_changes", "authorized_user_ids")
