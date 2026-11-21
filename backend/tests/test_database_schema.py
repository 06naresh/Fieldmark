from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest
from alembic import command
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

from app.database.models import (
    ChecklistItem,
    ChecklistTemplate,
    Inspection,
    InspectionAnswer,
    RefreshToken,
    Site,
    SyncConflict,
    SyncDevice,
    SyncOperation,
    User,
)

EXPECTED_TABLES = {
    "users",
    "refresh_tokens",
    "sites",
    "checklist_templates",
    "checklist_items",
    "inspections",
    "inspection_results",
    "inspection_answers",
    "sync_devices",
    "sync_operations",
    "sync_conflicts",
    "sync_changes",
}


@pytest.fixture
def seeded(db_session):
    admin = User(
        full_name="Admin User",
        email="admin@example.com",
        password_hash="argon2id-hash",
        role="ADMIN",
    )
    inspector = User(
        full_name="Field Inspector",
        email="inspector@example.com",
        password_hash="argon2id-hash",
        role="INSPECTOR",
    )
    db_session.add_all([admin, inspector])
    db_session.flush()

    site = Site(
        name="North Facility",
        site_code="NORTH-001",
        address="1 Industrial Road",
        city="Hyderabad",
    )
    template = ChecklistTemplate(
        name="Safety Inspection",
        description="Daily safety checklist",
        created_by=admin.id,
    )
    db_session.add_all([site, template])
    db_session.flush()

    item = ChecklistItem(
        template_id=template.id,
        question="Are exits clear?",
        response_type="YES_NO",
        display_order=0,
    )
    db_session.add(item)
    db_session.flush()

    inspection = Inspection(
        site_id=site.id,
        template_id=template.id,
        template_version=template.template_version,
        assigned_to=inspector.id,
        created_by=admin.id,
        title="North facility safety check",
    )
    db_session.add(inspection)
    db_session.flush()

    answer = InspectionAnswer(
        inspection_id=inspection.id,
        checklist_item_id=item.id,
        answer_value={"value": True},
        last_modified_by=inspector.id,
    )
    device = SyncDevice(user_id=inspector.id, device_name="Inspector tablet")
    db_session.add_all([answer, device])
    db_session.flush()

    operation = SyncOperation(
        operation_id=uuid4(),
        user_id=inspector.id,
        device_id=device.id,
        entity_type="INSPECTION_ANSWER",
        entity_id=answer.id,
        operation_type="UPDATE",
        request_hash="request-hash-1",
        result_status="ACCEPTED",
    )
    db_session.add(operation)
    db_session.flush()

    conflict = SyncConflict(
        operation_id=operation.id,
        entity_type="INSPECTION_ANSWER",
        entity_id=answer.id,
        local_payload={"value": True},
        server_payload={"value": False},
        base_version=1,
        server_version=2,
    )
    db_session.add(conflict)
    db_session.commit()

    return SimpleNamespace(
        admin=admin,
        inspector=inspector,
        site=site,
        template=template,
        item=item,
        inspection=inspection,
        answer=answer,
        device=device,
        operation=operation,
        conflict=conflict,
    )


def test_database_connection_and_initial_migration(migrated_engine):
    with migrated_engine.connect() as connection:
        assert connection.execute(text("SELECT 1")).scalar() == 1
        assert connection.execute(text("SELECT version_num FROM alembic_version")).scalar() == (
            "0001_initial_schema"
        )


def test_initial_schema_has_all_tables_keys_and_indexes(migrated_engine):
    inspector = inspect(migrated_engine)

    assert EXPECTED_TABLES <= set(inspector.get_table_names())

    for table_name in EXPECTED_TABLES:
        assert inspector.get_pk_constraint(table_name)["constrained_columns"] == ["id"]

    indexes = {
        table_name: {index["name"] for index in inspector.get_indexes(table_name)}
        for table_name in EXPECTED_TABLES
    }
    assert "idx_refresh_tokens_user_id" in indexes["refresh_tokens"]
    assert "idx_sites_is_active" in indexes["sites"]
    assert "idx_inspections_assigned_to" in indexes["inspections"]
    assert "idx_sync_operations_entity" in indexes["sync_operations"]
    assert "idx_sync_changes_created_at" in indexes["sync_changes"]

    inspection_fks = inspector.get_foreign_keys("inspections")
    assert any(
        set(foreign_key["constrained_columns"]) == {"template_id", "template_version"}
        and foreign_key["referred_table"] == "checklist_templates"
        and foreign_key["name"] == "fk_inspection_template_revision"
        for foreign_key in inspection_fks
    )

    sync_changes_columns = {column["name"] for column in inspector.get_columns("sync_changes")}
    assert "change_position" in sync_changes_columns


def test_alembic_metadata_matches_models(alembic_config):
    command.check(alembic_config)


def test_relationships_and_constraints_are_enforced(seeded, db_session):
    assert seeded.inspection.site.name == "North Facility"
    assert seeded.inspection.template.name == "Safety Inspection"
    assert seeded.answer.checklist_item.question == "Are exits clear?"
    assert seeded.conflict.operation.operation_id == seeded.operation.operation_id

    db_session.add(
        User(
            full_name="Duplicate Email",
            email="admin@example.com",
            password_hash="argon2id-hash",
            role="INSPECTOR",
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()

    db_session.add(
        User(
            full_name="Unsupported Role",
            email="manager@example.com",
            password_hash="argon2id-hash",
            role="MANAGER",
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()

    db_session.add(
        InspectionAnswer(
            inspection_id=seeded.inspection.id,
            checklist_item_id=seeded.item.id,
            answer_value={"value": False},
            last_modified_by=seeded.inspector.id,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()

    now = datetime.now(timezone.utc)
    db_session.add(
        Inspection(
            site_id=seeded.site.id,
            template_id=seeded.template.id,
            template_version=seeded.template.template_version,
            assigned_to=seeded.inspector.id,
            created_by=seeded.admin.id,
            title="Invalid date order",
            scheduled_at=now,
            due_at=now - timedelta(days=1),
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()

    db_session.add(
        SyncConflict(
            operation_id=seeded.operation.id,
            entity_type="INSPECTION_ANSWER",
            entity_id=seeded.answer.id,
            local_payload={"value": True},
            server_payload={"value": False},
            status="OPEN",
            resolved_by=seeded.admin.id,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()

    db_session.add(
        RefreshToken(
            user_id=seeded.inspector.id,
            token_hash="token-hash",
            expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        )
    )
    db_session.commit()
