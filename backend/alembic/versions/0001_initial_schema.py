"""Create initial Fieldmark database schema.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-11-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


SYNC_CHANGE_LOCK_KEY = 7_274_651_559_335_833_600


def upgrade() -> None:
    # gen_random_uuid() is built into newer PostgreSQL releases; pgcrypto keeps
    # the migration compatible with earlier supported versions.
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # The advisory lock is held by the inserting transaction until commit.
    # Allocating the position while holding it makes allocation order equal to
    # commit order, preventing a later position from committing before an
    # earlier one and being skipped by a paginating client.
    op.execute("CREATE SEQUENCE IF NOT EXISTS sync_changes_cursor_seq AS BIGINT")
    op.execute(
        f"""
        CREATE OR REPLACE FUNCTION assign_sync_change_position()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
            PERFORM pg_advisory_xact_lock({SYNC_CHANGE_LOCK_KEY}::bigint);
            NEW.change_position := nextval('sync_changes_cursor_seq');
            RETURN NEW;
        END;
        $$
        """
    )

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("full_name", sa.String(length=150), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("role IN ('ADMIN', 'INSPECTOR')", name="ck_users_role"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )

    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_refresh_tokens_user_id", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_refresh_tokens_token_hash"),
    )
    op.create_index("idx_refresh_tokens_user_id", "refresh_tokens", ["user_id"], unique=False)
    op.create_index("idx_refresh_tokens_expires_at", "refresh_tokens", ["expires_at"], unique=False)

    op.create_table(
        "sites",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("site_code", sa.String(length=50), nullable=False),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("state", sa.String(length=100), nullable=True),
        sa.Column("postal_code", sa.String(length=20), nullable=True),
        sa.Column("country", sa.String(length=100), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("version > 0", name="ck_sites_version"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("site_code", name="uq_sites_site_code"),
    )
    op.create_index("idx_sites_is_active", "sites", ["is_active"], unique=False)

    op.create_table(
        "checklist_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("template_version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("template_version > 0", name="ck_checklist_templates_template_version"),
        sa.CheckConstraint("version > 0", name="ck_checklist_templates_version"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], name="fk_checklist_templates_created_by", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id", "template_version", name="uq_template_revision"),
    )

    op.create_table(
        "checklist_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("response_type", sa.String(length=30), nullable=False),
        sa.Column("is_required", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("display_order", sa.Integer(), nullable=False),
        sa.Column("options", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "response_type IN ('YES_NO', 'TEXT', 'NUMBER', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE')",
            name="ck_checklist_items_response_type",
        ),
        sa.CheckConstraint("display_order >= 0", name="ck_checklist_items_display_order"),
        sa.ForeignKeyConstraint(["template_id"], ["checklist_templates.id"], name="fk_checklist_items_template_id", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("template_id", "display_order", name="uq_template_item_order"),
        sa.UniqueConstraint("template_id", "id", name="uq_template_item_id"),
    )
    op.create_index("idx_checklist_items_template_id", "checklist_items", ["template_id"], unique=False)

    op.create_table(
        "inspections",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("site_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("template_version", sa.Integer(), nullable=False),
        sa.Column("assigned_to", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=30), server_default=sa.text("'ASSIGNED'"), nullable=False),
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "status IN ('ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED', 'CANCELLED')",
            name="ck_inspections_status",
        ),
        sa.CheckConstraint("version > 0", name="ck_inspections_version"),
        sa.CheckConstraint(
            "due_at IS NULL OR scheduled_at IS NULL OR due_at >= scheduled_at",
            name="chk_inspection_due_date",
        ),
        sa.ForeignKeyConstraint(["assigned_to"], ["users.id"], name="fk_inspections_assigned_to", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], name="fk_inspections_created_by", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["site_id"], ["sites.id"], name="fk_inspections_site_id", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(
            ["template_id", "template_version"],
            ["checklist_templates.id", "checklist_templates.template_version"],
            name="fk_inspection_template_revision",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_inspections_assigned_to", "inspections", ["assigned_to"], unique=False)
    op.create_index("idx_inspections_site_id", "inspections", ["site_id"], unique=False)
    op.create_index("idx_inspections_status", "inspections", ["status"], unique=False)
    op.create_index("idx_inspections_due_at", "inspections", ["due_at"], unique=False)

    op.create_table(
        "inspection_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("inspection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submitted_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_number", sa.Integer(), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("overall_status", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("submission_number > 0", name="ck_inspection_results_submission_number"),
        sa.CheckConstraint(
            "overall_status IN ('PASS', 'FAIL', 'NEEDS_REVIEW')",
            name="ck_inspection_results_overall_status",
        ),
        sa.ForeignKeyConstraint(["inspection_id"], ["inspections.id"], name="fk_inspection_results_inspection_id", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["submitted_by"], ["users.id"], name="fk_inspection_results_submitted_by", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("inspection_id", "submission_number", name="uq_inspection_submission"),
    )
    op.create_index("idx_inspection_results_inspection_id", "inspection_results", ["inspection_id"], unique=False)

    op.create_table(
        "inspection_answers",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("inspection_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("checklist_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("answer_value", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("version", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("last_modified_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("version > 0", name="ck_inspection_answers_version"),
        sa.ForeignKeyConstraint(["checklist_item_id"], ["checklist_items.id"], name="fk_inspection_answers_checklist_item_id", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["inspection_id"], ["inspections.id"], name="fk_inspection_answers_inspection_id", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["last_modified_by"], ["users.id"], name="fk_inspection_answers_last_modified_by", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("inspection_id", "checklist_item_id", name="uq_inspection_checklist_answer"),
    )
    op.create_index("idx_inspection_answers_inspection_id", "inspection_answers", ["inspection_id"], unique=False)

    op.create_table(
        "sync_devices",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("device_name", sa.String(length=150), nullable=True),
        sa.Column("device_fingerprint", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_sync_devices_user_id", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_sync_devices_user_id", "sync_devices", ["user_id"], unique=False)

    op.create_table(
        "sync_operations",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("operation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("device_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("operation_type", sa.String(length=30), nullable=False),
        sa.Column("request_hash", sa.Text(), nullable=False),
        sa.Column("result_status", sa.String(length=30), nullable=False),
        sa.Column("response_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "operation_type IN ('CREATE', 'UPDATE', 'DELETE', 'SUBMIT')",
            name="ck_sync_operations_operation_type",
        ),
        sa.CheckConstraint(
            "result_status IN ('ACCEPTED', 'CONFLICT', 'REJECTED')",
            name="ck_sync_operations_result_status",
        ),
        sa.ForeignKeyConstraint(["device_id"], ["sync_devices.id"], name="fk_sync_operations_device_id", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_sync_operations_user_id", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("operation_id", name="uq_sync_operations_operation_id"),
    )
    op.create_index("idx_sync_operations_user_id", "sync_operations", ["user_id"], unique=False)
    op.create_index("idx_sync_operations_device_id", "sync_operations", ["device_id"], unique=False)
    op.create_index("idx_sync_operations_entity", "sync_operations", ["entity_type", "entity_id"], unique=False)

    op.create_table(
        "sync_conflicts",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("operation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("local_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("server_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("base_version", sa.Integer(), nullable=True),
        sa.Column("server_version", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=30), server_default=sa.text("'OPEN'"), nullable=False),
        sa.Column("resolution_type", sa.String(length=30), nullable=True),
        sa.Column("resolved_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("status IN ('OPEN', 'RESOLVED', 'DISMISSED')", name="ck_sync_conflicts_status"),
        sa.CheckConstraint(
            "resolution_type IS NULL OR resolution_type IN "
            "('KEEP_SERVER', 'KEEP_LOCAL', 'MANUAL_MERGE', 'ADMIN_RESOLUTION')",
            name="ck_sync_conflicts_resolution_type",
        ),
        sa.CheckConstraint(
            "(status = 'OPEN' AND resolved_by IS NULL AND resolved_at IS NULL) OR "
            "(status IN ('RESOLVED', 'DISMISSED') AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL)",
            name="chk_conflict_resolution",
        ),
        sa.ForeignKeyConstraint(["operation_id"], ["sync_operations.id"], name="fk_sync_conflicts_operation_id", ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["resolved_by"], ["users.id"], name="fk_sync_conflicts_resolved_by", ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_sync_conflicts_status", "sync_conflicts", ["status"], unique=False)
    op.create_index("idx_sync_conflicts_entity", "sync_conflicts", ["entity_type", "entity_id"], unique=False)

    op.create_table(
        "sync_changes",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("change_type", sa.String(length=30), nullable=False),
        sa.Column("entity_version", sa.Integer(), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("change_position", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("change_type IN ('CREATE', 'UPDATE', 'DELETE')", name="ck_sync_changes_change_type"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("change_position", name="uq_sync_changes_position"),
    )
    op.create_index("idx_sync_changes_entity", "sync_changes", ["entity_type", "entity_id"], unique=False)
    op.create_index("idx_sync_changes_created_at", "sync_changes", ["created_at"], unique=False)

    op.execute(
        """
        CREATE TRIGGER trg_sync_changes_assign_position
        BEFORE INSERT ON sync_changes
        FOR EACH ROW
        EXECUTE FUNCTION assign_sync_change_position()
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_sync_changes_assign_position ON sync_changes")

    op.drop_index("idx_sync_changes_created_at", table_name="sync_changes")
    op.drop_index("idx_sync_changes_entity", table_name="sync_changes")
    op.drop_table("sync_changes")

    op.drop_index("idx_sync_conflicts_entity", table_name="sync_conflicts")
    op.drop_index("idx_sync_conflicts_status", table_name="sync_conflicts")
    op.drop_table("sync_conflicts")

    op.drop_index("idx_sync_operations_entity", table_name="sync_operations")
    op.drop_index("idx_sync_operations_device_id", table_name="sync_operations")
    op.drop_index("idx_sync_operations_user_id", table_name="sync_operations")
    op.drop_table("sync_operations")

    op.drop_index("idx_sync_devices_user_id", table_name="sync_devices")
    op.drop_table("sync_devices")

    op.drop_index("idx_inspection_answers_inspection_id", table_name="inspection_answers")
    op.drop_table("inspection_answers")

    op.drop_index("idx_inspection_results_inspection_id", table_name="inspection_results")
    op.drop_table("inspection_results")

    op.drop_index("idx_inspections_due_at", table_name="inspections")
    op.drop_index("idx_inspections_status", table_name="inspections")
    op.drop_index("idx_inspections_site_id", table_name="inspections")
    op.drop_index("idx_inspections_assigned_to", table_name="inspections")
    op.drop_table("inspections")

    op.drop_index("idx_checklist_items_template_id", table_name="checklist_items")
    op.drop_table("checklist_items")
    op.drop_table("checklist_templates")

    op.drop_index("idx_sites_is_active", table_name="sites")
    op.drop_table("sites")

    op.drop_index("idx_refresh_tokens_expires_at", table_name="refresh_tokens")
    op.drop_index("idx_refresh_tokens_user_id", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
    op.drop_table("users")

    op.execute("DROP FUNCTION IF EXISTS assign_sync_change_position()")
    op.execute("DROP SEQUENCE IF EXISTS sync_changes_cursor_seq")
