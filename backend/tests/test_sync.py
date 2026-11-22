"""Phase 5 backend synchronization integration tests.

All tests run against the real PostgreSQL test database through the API, using
the shared temporary-schema fixtures. No SQLite substitute is used.
"""

from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ServiceUnavailableError
from app.core.security import create_access_token
from app.database.models import (
    InspectionAnswer,
    SyncChange,
    SyncConflict,
    SyncOperation,
)
from app.services.sync_service import SyncService
API = settings.API_PREFIX


def auth_headers(user) -> dict[str, str]:
    token, _ = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


def assert_data(response, expected: int) -> dict:
    assert response.status_code == expected, response.text
    return response.json()["data"]


def assert_error(response, expected: int, code: str) -> None:
    assert response.status_code == expected, response.text
    assert response.json()["error"]["code"] == code


def create_site(client: TestClient, headers: dict[str, str]) -> dict:
    return assert_data(
        client.post(
            f"{API}/sites",
            json={
                "name": "Sync Test Site",
                "site_code": f"SYNC-{uuid4().hex[:10].upper()}",
                "address": "1 Sync Road",
                "city": "Hyderabad",
                "state": "Telangana",
                "postal_code": "500001",
                "country": "India",
            },
            headers=headers,
        ),
        201,
    )


def create_template(client: TestClient, headers: dict[str, str]) -> dict:
    return assert_data(
        client.post(
            f"{API}/checklist-templates",
            json={
                "name": "Sync Test Checklist",
                "description": "Checklist used by sync tests",
                "items": [
                    {
                        "question": "Is the exit clear?",
                        "response_type": "YES_NO",
                        "is_required": True,
                        "display_order": 1,
                    },
                    {
                        "question": "Observations",
                        "response_type": "TEXT",
                        "is_required": False,
                        "display_order": 2,
                    },
                ],
            },
            headers=headers,
        ),
        201,
    )


def register_device(client: TestClient, headers: dict[str, str], name: str) -> dict:
    return assert_data(
        client.post(f"{API}/sync/devices", json={"device_name": name}, headers=headers),
        201,
    )


def pull_page(
    client: TestClient,
    headers: dict[str, str],
    device_id: str,
    *,
    cursor: str | None = None,
    limit: int | None = None,
) -> dict:
    params: dict[str, object] = {"device_id": device_id}
    if cursor is not None:
        params["cursor"] = cursor
    if limit is not None:
        params["limit"] = limit
    return assert_data(client.get(f"{API}/sync/pull", params=params, headers=headers), 200)


def drain(
    client: TestClient, headers: dict[str, str], device_id: str
) -> tuple[list[dict], str]:
    changes: list[dict] = []
    cursor: str | None = None
    while True:
        page = pull_page(client, headers, device_id, cursor=cursor, limit=3)
        changes.extend(page["changes"])
        if not page["has_more"]:
            return changes, page["next_cursor"]
        cursor = page["next_cursor"]


def push(
    client: TestClient,
    headers: dict[str, str],
    device_id: str,
    operations: list[dict],
) -> list[dict]:
    data = assert_data(
        client.post(
            f"{API}/sync/push",
            json={"device_id": device_id, "operations": operations},
            headers=headers,
        ),
        200,
    )
    return data["results"]


def answer_operation(
    *,
    inspection_id: str,
    item_id: str,
    value: object,
    base_version: int = 1,
    operation_id: UUID | None = None,
    entity_id: UUID | None = None,
    notes: str | None = None,
    operation_type: str | None = None,
) -> dict:
    return {
        "operation_id": str(operation_id or uuid4()),
        "operation_type": operation_type or ("CREATE" if base_version == 1 else "UPDATE"),
        "entity_type": "inspection_answer",
        "entity_id": str(entity_id or uuid4()),
        "base_version": base_version,
        "payload": {
            "inspection_id": inspection_id,
            "checklist_item_id": item_id,
            "answer_value": value,
            "notes": notes,
        },
    }


@pytest.fixture
def scenario(api_client: TestClient, create_test_user):
    admin, _ = create_test_user(role="ADMIN")
    inspector, _ = create_test_user(role="INSPECTOR")
    other, _ = create_test_user(role="INSPECTOR")

    admin_headers = auth_headers(admin)
    inspector_headers = auth_headers(inspector)
    other_headers = auth_headers(other)

    site = create_site(api_client, admin_headers)
    template = create_template(api_client, admin_headers)
    inspection = assert_data(
        api_client.post(
            f"{API}/inspections",
            json={
                "site_id": site["id"],
                "template_id": template["id"],
                "template_version": template["template_version"],
                "assigned_to": str(inspector.id),
                "title": "Sync Scenario Inspection",
            },
            headers=admin_headers,
        ),
        201,
    )
    inspection_id = inspection["id"]
    required_item_id = template["items"][0]["id"]
    optional_item_id = template["items"][1]["id"]

    return SimpleNamespace(
        client=api_client,
        admin=admin,
        admin_headers=admin_headers,
        inspector=inspector,
        inspector_headers=inspector_headers,
        other=other,
        other_headers=other_headers,
        site=site,
        template=template,
        inspection=inspection,
        inspection_id=inspection_id,
        required_item_id=required_item_id,
        optional_item_id=optional_item_id,
        inspector_device=register_device(api_client, inspector_headers, "Inspector tablet"),
        admin_device=register_device(api_client, admin_headers, "Admin laptop"),
        other_device=register_device(api_client, other_headers, "Other tablet"),
    )


# --------------------------------------------------------------------- devices


def test_device_registration_list_revoke_and_path_aliases(scenario) -> None:
    client = scenario.client
    alias_device = assert_data(
        client.post(
            f"{API}/devices",
            json={"device_name": "Canonical path device"},
            headers=scenario.inspector_headers,
        ),
        201,
    )
    canonical_list = assert_data(client.get(f"{API}/devices", headers=scenario.inspector_headers), 200)
    alias_list = assert_data(
        client.get(f"{API}/sync/devices", headers=scenario.inspector_headers), 200
    )
    assert [item["id"] for item in canonical_list] == [item["id"] for item in alias_list]
    assert alias_device["id"] in {item["id"] for item in canonical_list}

    denied = client.post(
        f"{API}/sync/devices/{alias_device['id']}/revoke",
        headers=scenario.other_headers,
    )
    assert_error(denied, 403, "FORBIDDEN")

    revoke_response = client.post(
        f"{API}/devices/{alias_device['id']}/revoke",
        headers=scenario.inspector_headers,
    )
    assert revoke_response.status_code == 200, revoke_response.text
    assert revoke_response.json()["message"] == "Device revoked successfully."

    push_denied = client.post(
        f"{API}/sync/push",
        json={
            "device_id": alias_device["id"],
            "operations": [
                answer_operation(
                    inspection_id=scenario.inspection_id,
                    item_id=scenario.required_item_id,
                    value=True,
                )
            ],
        },
        headers=scenario.inspector_headers,
    )
    assert_error(push_denied, 403, "FORBIDDEN")


def test_unregistered_and_cross_user_devices_are_rejected(scenario) -> None:
    client = scenario.client
    unknown = client.get(
        f"{API}/sync/status",
        params={"device_id": str(uuid4())},
        headers=scenario.inspector_headers,
    )
    assert_error(unknown, 403, "FORBIDDEN")

    cross_user = client.get(
        f"{API}/sync/status",
        params={"device_id": scenario.other_device["id"]},
        headers=scenario.inspector_headers,
    )
    assert_error(cross_user, 403, "FORBIDDEN")


# ------------------------------------------------------------------------ push


def test_push_accepts_answer_and_logs_scoped_change(
    scenario, db_session: Session
) -> None:
    drain(scenario.client, scenario.inspector_headers, scenario.inspector_device["id"])

    operation = answer_operation(
        inspection_id=scenario.inspection_id,
        item_id=scenario.required_item_id,
        value=True,
        notes="Emergency exit is clear",
    )
    results = push(
        scenario.client,
        scenario.inspector_headers,
        scenario.inspector_device["id"],
        [operation],
    )
    assert results[0]["status"] == "ACCEPTED"
    assert results[0]["server_version"] == 1
    assert results[0]["entity_id"] == operation["entity_id"]

    ledger = db_session.scalar(
        select(SyncOperation).where(
            SyncOperation.operation_id == UUID(operation["operation_id"])
        )
    )
    assert ledger is not None
    assert ledger.result_status == "ACCEPTED"
    assert len(ledger.request_hash) == 64

    changes, _ = drain(
        scenario.client, scenario.inspector_headers, scenario.inspector_device["id"]
    )
    answer_changes = [c for c in changes if c["entity_type"] == "inspection_answer"]
    assert len(answer_changes) == 1
    assert answer_changes[0]["change_type"] == "CREATE"
    assert answer_changes[0]["entity_id"] == operation["entity_id"]
    assert answer_changes[0]["payload"]["answer_value"] is True

    other_changes, _ = drain(
        scenario.client, scenario.other_headers, scenario.other_device["id"]
    )
    assert all(c["entity_type"] != "inspection_answer" for c in other_changes)

    admin_changes, _ = drain(
        scenario.client, scenario.admin_headers, scenario.admin_device["id"]
    )
    assert any(c["entity_id"] == operation["entity_id"] for c in admin_changes)


def test_duplicate_operation_replays_original_result_without_duplicate_records(
    scenario, db_session: Session
) -> None:
    operation = answer_operation(
        inspection_id=scenario.inspection_id,
        item_id=scenario.required_item_id,
        value=True,
    )
    first = push(
        scenario.client,
        scenario.inspector_headers,
        scenario.inspector_device["id"],
        [operation],
    )[0]
    second = push(
        scenario.client,
        scenario.inspector_headers,
        scenario.inspector_device["id"],
        [operation],
    )[0]
    assert first == second

    ledger_count = db_session.scalar(
        select(func.count())
        .select_from(SyncOperation)
        .where(SyncOperation.operation_id == UUID(operation["operation_id"]))
    )
    answer_count = db_session.scalar(
        select(func.count())
        .select_from(InspectionAnswer)
        .where(InspectionAnswer.inspection_id == UUID(scenario.inspection_id))
    )
    change_count = db_session.scalar(
        select(func.count())
        .select_from(SyncChange)
        .where(SyncChange.entity_id == UUID(operation["entity_id"]))
    )
    assert ledger_count == 1
    assert answer_count == 1
    assert change_count == 1


def test_concurrent_duplicate_pushes_are_idempotent(
    scenario, db_session: Session
) -> None:
    operation = answer_operation(
        inspection_id=scenario.inspection_id,
        item_id=scenario.required_item_id,
        value=True,
    )

    def submit() -> dict:
        return push(
            scenario.client,
            scenario.inspector_headers,
            scenario.inspector_device["id"],
            [operation],
        )[0]

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(submit) for _ in range(2)]
        results = [future.result() for future in futures]

    assert all(result["status"] == "ACCEPTED" for result in results)
    assert results[0]["server_version"] == results[1]["server_version"]

    ledger_count = db_session.scalar(
        select(func.count())
        .select_from(SyncOperation)
        .where(SyncOperation.operation_id == UUID(operation["operation_id"]))
    )
    answer_count = db_session.scalar(
        select(func.count())
        .select_from(InspectionAnswer)
        .where(
            InspectionAnswer.inspection_id == UUID(scenario.inspection_id),
            InspectionAnswer.checklist_item_id == UUID(scenario.required_item_id),
        )
    )
    assert ledger_count == 1
    assert answer_count == 1


def test_retryable_error_can_be_retried_with_same_operation_id(
    scenario, db_session: Session, monkeypatch
) -> None:
    operation = answer_operation(
        inspection_id=scenario.inspection_id,
        item_id=scenario.required_item_id,
        value=True,
    )
    original_apply = SyncService._apply_operation
    attempted: list[UUID] = []

    def flaky_apply(self, current_operation, current_user):
        attempted.append(current_operation.operation_id)
        if len(attempted) == 1:
            raise ServiceUnavailableError()
        return original_apply(self, current_operation, current_user)

    monkeypatch.setattr(SyncService, "_apply_operation", flaky_apply)

    first = push(
        scenario.client,
        scenario.inspector_headers,
        scenario.inspector_device["id"],
        [operation],
    )[0]
    assert first["status"] == "RETRYABLE_ERROR"
    assert (
        db_session.scalar(
            select(func.count())
            .select_from(SyncOperation)
            .where(SyncOperation.operation_id == UUID(operation["operation_id"]))
        )
        == 0
    )

    second = push(
        scenario.client,
        scenario.inspector_headers,
        scenario.inspector_device["id"],
        [operation],
    )[0]
    assert second["status"] == "ACCEPTED"
    assert attempted == [UUID(operation["operation_id"])] * 2
    assert (
        db_session.scalar(
            select(func.count())
            .select_from(SyncOperation)
            .where(SyncOperation.operation_id == UUID(operation["operation_id"]))
        )
        == 1
    )


def test_reused_operation_id_with_different_payload_is_rejected(
    scenario, db_session: Session
) -> None:
    operation_id = uuid4()
    first = answer_operation(
        inspection_id=scenario.inspection_id,
        item_id=scenario.required_item_id,
        value=True,
        operation_id=operation_id,
        notes="first value",
    )
    changed = answer_operation(
        inspection_id=scenario.inspection_id,
        item_id=scenario.required_item_id,
        value=True,
        operation_id=operation_id,
        notes="different value",
    )

    assert push(
        scenario.client,
        scenario.inspector_headers,
        scenario.inspector_device["id"],
        [first],
    )[0]["status"] == "ACCEPTED"
    second = push(
        scenario.client,
        scenario.inspector_headers,
        scenario.inspector_device["id"],
        [changed],
    )[0]
    assert second["status"] == "REJECTED"
    assert second["error"]["code"] == "IDEMPOTENCY_VIOLATION"

    answer = db_session.scalar(
        select(InspectionAnswer).where(
            InspectionAnswer.inspection_id == UUID(scenario.inspection_id),
            InspectionAnswer.checklist_item_id == UUID(scenario.required_item_id),
        )
    )
    assert answer is not None
    assert answer.notes == "first value"


def test_stale_version_conflict_preserves_both_snapshots_and_isolates_batch(
    scenario, db_session: Session
) -> None:
    first_op = answer_operation(
        inspection_id=scenario.inspection_id,
        item_id=scenario.required_item_id,
        value=True,
    )
    second_op = answer_operation(
        inspection_id=scenario.inspection_id,
        item_id=scenario.required_item_id,
        value=False,
        base_version=1,
        operation_id=uuid4(),
        entity_id=UUID(first_op["entity_id"]),
        operation_type="UPDATE",
    )
    stale_op = answer_operation(
        inspection_id=scenario.inspection_id,
        item_id=scenario.required_item_id,
        value=False,
        base_version=1,
    )
    independent_op = answer_operation(
        inspection_id=scenario.inspection_id,
        item_id=scenario.optional_item_id,
        value="Looks fine",
    )

    results = push(
        scenario.client,
        scenario.inspector_headers,
        scenario.inspector_device["id"],
        [first_op, second_op, stale_op, independent_op],
    )
    assert [result["status"] for result in results] == [
        "ACCEPTED",
        "ACCEPTED",
        "CONFLICT",
        "ACCEPTED",
    ]
    assert results[2]["base_version"] == 1
    assert results[2]["server_version"] == 2

    conflicts = list(
        db_session.scalars(
            select(SyncConflict).where(
                SyncConflict.entity_id == UUID(first_op["entity_id"])
            )
        ).all()
    )
    assert len(conflicts) == 1
    conflict = conflicts[0]
    assert conflict.status == "OPEN"
    assert conflict.local_payload["answer_value"] is False
    assert conflict.server_payload["answer_value"] is False
    assert conflict.base_version == 1
    assert conflict.server_version == 2
    assert conflict.operation.result_status == "CONFLICT"

    optional_answer = db_session.scalar(
        select(InspectionAnswer).where(
            InspectionAnswer.checklist_item_id == UUID(scenario.optional_item_id)
        )
    )
    assert optional_answer is not None
    assert optional_answer.answer_value == "Looks fine"


def test_cross_user_operation_is_rejected(scenario) -> None:
    other_inspection = assert_data(
        scenario.client.post(
            f"{API}/inspections",
            json={
                "site_id": scenario.site["id"],
                "template_id": scenario.template["id"],
                "template_version": scenario.template["template_version"],
                "assigned_to": str(scenario.other.id),
                "title": "Other Inspector Inspection",
            },
            headers=scenario.admin_headers,
        ),
        201,
    )
    result = push(
        scenario.client,
        scenario.inspector_headers,
        scenario.inspector_device["id"],
        [
            answer_operation(
                inspection_id=other_inspection["id"],
                item_id=scenario.required_item_id,
                value=True,
            )
        ],
    )[0]
    assert result["status"] == "REJECTED"
    assert result["error"]["code"] == "PERMISSION_DENIED"


def test_unsupported_operation_is_rejected_without_blocking_batch(scenario) -> None:
    results = push(
        scenario.client,
        scenario.inspector_headers,
        scenario.inspector_device["id"],
        [
            {
                "operation_id": str(uuid4()),
                "operation_type": "CREATE",
                "entity_type": "site",
                "entity_id": str(uuid4()),
                "base_version": None,
                "payload": {"name": "Not allowed"},
            },
            answer_operation(
                inspection_id=scenario.inspection_id,
                item_id=scenario.required_item_id,
                value=True,
            ),
        ],
    )
    assert results[0]["status"] == "REJECTED"
    assert results[1]["status"] == "ACCEPTED"


def test_client_cannot_supply_payload_hash(scenario) -> None:
    operation = answer_operation(
        inspection_id=scenario.inspection_id,
        item_id=scenario.required_item_id,
        value=True,
    )
    operation["payload_hash"] = "client-chosen-hash"
    response = scenario.client.post(
        f"{API}/sync/push",
        json={
            "device_id": scenario.inspector_device["id"],
            "operations": [operation],
        },
        headers=scenario.inspector_headers,
    )
    assert_error(response, 422, "VALIDATION_ERROR")


# ------------------------------------------------------------------------- pull


def test_pull_pagination_never_skips_changes(scenario) -> None:
    _, cursor = drain(
        scenario.client, scenario.inspector_headers, scenario.inspector_device["id"]
    )
    created = [create_site(scenario.client, scenario.admin_headers) for _ in range(5)]

    seen: set[str] = set()
    delivered_sites: set[str] = set()
    pages = 0
    current = cursor
    while True:
        page = pull_page(
            scenario.client,
            scenario.inspector_headers,
            scenario.inspector_device["id"],
            cursor=current,
            limit=2,
        )
        pages += 1
        for change in page["changes"]:
            assert change["change_id"] not in seen
            seen.add(change["change_id"])
            if change["entity_type"] == "site":
                delivered_sites.add(change["entity_id"])
        if not page["has_more"]:
            break
        current = page["next_cursor"]
        assert pages < 20

    assert pages >= 3
    assert {site["id"] for site in created} <= delivered_sites


def test_pull_cursor_is_opaque_and_rejects_tampering(scenario) -> None:
    response = scenario.client.get(
        f"{API}/sync/pull",
        params={"device_id": scenario.inspector_device["id"], "cursor": "not-a-cursor"},
        headers=scenario.inspector_headers,
    )
    assert_error(response, 400, "BAD_REQUEST")


def test_change_committed_after_a_pull_appears_in_the_next_pull(
    scenario, migrated_engine
) -> None:
    _, cursor = drain(
        scenario.client, scenario.inspector_headers, scenario.inspector_device["id"]
    )
    marker = uuid4()
    with Session(migrated_engine) as session:
        session.add(
            SyncChange(
                entity_type="site",
                entity_id=marker,
                change_type="CREATE",
                entity_version=1,
                payload={"name": "Late global change"},
                authorized_user_ids=[],
                is_global=True,
            )
        )
        session.commit()

    page = pull_page(
        scenario.client,
        scenario.inspector_headers,
        scenario.inspector_device["id"],
        cursor=cursor,
    )
    assert any(change["entity_id"] == str(marker) for change in page["changes"])


def test_tombstone_is_delivered_to_authorized_users_only(scenario) -> None:
    drain(scenario.client, scenario.inspector_headers, scenario.inspector_device["id"])
    entity_id = uuid4()
    create_op = answer_operation(
        inspection_id=scenario.inspection_id,
        item_id=scenario.required_item_id,
        value=True,
        entity_id=entity_id,
    )
    delete_op = {
        "operation_id": str(uuid4()),
        "operation_type": "DELETE",
        "entity_type": "inspection_answer",
        "entity_id": str(entity_id),
        "base_version": 1,
        "payload": {
            "inspection_id": scenario.inspection_id,
            "checklist_item_id": scenario.required_item_id,
        },
    }
    results = push(
        scenario.client,
        scenario.inspector_headers,
        scenario.inspector_device["id"],
        [create_op, delete_op],
    )
    assert [result["status"] for result in results] == ["ACCEPTED", "ACCEPTED"]
    assert results[1]["server_version"] == 2

    changes, _ = drain(
        scenario.client, scenario.inspector_headers, scenario.inspector_device["id"]
    )
    tombstones = [c for c in changes if c["change_type"] == "DELETE"]
    assert len(tombstones) == 1
    assert tombstones[0]["entity_id"] == str(entity_id)
    assert tombstones[0]["payload"]["id"] == str(entity_id)

    other_changes, _ = drain(
        scenario.client, scenario.other_headers, scenario.other_device["id"]
    )
    assert all(c["entity_id"] != str(entity_id) for c in other_changes)


# ----------------------------------------------------------------------- status


def test_sync_status_is_device_scoped_and_reports_open_conflicts(scenario) -> None:
    admin_before = assert_data(
        scenario.client.get(
            f"{API}/sync/status",
            params={"device_id": scenario.admin_device["id"]},
            headers=scenario.admin_headers,
        ),
        200,
    )["open_conflicts"]
    _create_conflict(scenario)

    inspector_status = assert_data(
        scenario.client.get(
            f"{API}/sync/status",
            params={"device_id": scenario.inspector_device["id"]},
            headers=scenario.inspector_headers,
        ),
        200,
    )
    other_status = assert_data(
        scenario.client.get(
            f"{API}/sync/status",
            params={"device_id": scenario.other_device["id"]},
            headers=scenario.other_headers,
        ),
        200,
    )
    admin_status = assert_data(
        scenario.client.get(
            f"{API}/sync/status",
            params={"device_id": scenario.admin_device["id"]},
            headers=scenario.admin_headers,
        ),
        200,
    )
    assert inspector_status["open_conflicts"] == 1
    assert other_status["open_conflicts"] == 0
    assert admin_status["open_conflicts"] == admin_before + 1
    assert inspector_status["is_active"] is True


# -------------------------------------------------------------------- conflicts


def _create_conflict(scenario) -> dict:
    first = answer_operation(
        inspection_id=scenario.inspection_id,
        item_id=scenario.required_item_id,
        value=True,
    )
    second = answer_operation(
        inspection_id=scenario.inspection_id,
        item_id=scenario.required_item_id,
        value=True,
        base_version=1,
        entity_id=UUID(first["entity_id"]),
        operation_type="UPDATE",
    )
    stale = answer_operation(
        inspection_id=scenario.inspection_id,
        item_id=scenario.required_item_id,
        value=False,
        base_version=1,
    )
    push(
        scenario.client,
        scenario.inspector_headers,
        scenario.inspector_device["id"],
        [first, second],
    )
    result = push(
        scenario.client,
        scenario.inspector_headers,
        scenario.inspector_device["id"],
        [stale],
    )[0]
    assert result["status"] == "CONFLICT"
    return result


def test_conflicts_are_listed_and_detailed_with_owner_scoping(scenario) -> None:
    admin_before = len(
        assert_data(
            scenario.client.get(
                f"{API}/sync/conflicts",
                params={"page_size": 100},
                headers=scenario.admin_headers,
            ),
            200,
        )
    )
    _create_conflict(scenario)
    inspector_list = assert_data(
        scenario.client.get(f"{API}/sync/conflicts", headers=scenario.inspector_headers), 200
    )
    conflict_id = inspector_list[0]["id"] if isinstance(inspector_list, list) else None
    assert isinstance(inspector_list, list)
    assert len(inspector_list) == 1

    other_list = assert_data(
        scenario.client.get(f"{API}/sync/conflicts", headers=scenario.other_headers), 200
    )
    assert other_list == []

    admin_list = assert_data(
        scenario.client.get(
            f"{API}/sync/conflicts",
            params={"page_size": 100},
            headers=scenario.admin_headers,
        ),
        200,
    )
    assert len(admin_list) == admin_before + 1

    detail = assert_data(
        scenario.client.get(
            f"{API}/sync/conflicts/{conflict_id}", headers=scenario.inspector_headers
        ),
        200,
    )
    assert detail["operation_id"] == inspector_list[0]["operation_id"]
    assert detail["base_version"] == 1
    assert detail["server_version"] == 2
    assert "answer_value" in detail["local_payload"]
    assert "answer_value" in detail["server_payload"]
    assert detail["resolution_type"] is None
    assert detail["resolved_by"] is None
    assert detail["resolved_at"] is None

    forbidden = scenario.client.get(
        f"{API}/sync/conflicts/{conflict_id}", headers=scenario.other_headers
    )
    assert_error(forbidden, 403, "FORBIDDEN")


def test_conflict_resolution_enforces_permissions_and_version(scenario) -> None:
    _create_conflict(scenario)
    conflict = assert_data(
        scenario.client.get(f"{API}/sync/conflicts", headers=scenario.inspector_headers), 200
    )[0]
    conflict_id = conflict["id"]

    stale = scenario.client.post(
        f"{API}/sync/conflicts/{conflict_id}/resolve",
        json={"resolution_type": "KEEP_SERVER", "expected_server_version": 1},
        headers=scenario.inspector_headers,
    )
    assert_error(stale, 409, "VERSION_CONFLICT")

    invalid = scenario.client.post(
        f"{API}/sync/conflicts/{conflict_id}/resolve",
        json={"resolution_type": "LAST_WRITE_WINS", "expected_server_version": 2},
        headers=scenario.inspector_headers,
    )
    assert_error(invalid, 422, "VALIDATION_ERROR")

    forbidden = scenario.client.post(
        f"{API}/sync/conflicts/{conflict_id}/resolve",
        json={"resolution_type": "ADMIN_RESOLUTION", "expected_server_version": 2},
        headers=scenario.inspector_headers,
    )
    assert_error(forbidden, 403, "FORBIDDEN")

    resolved = assert_data(
        scenario.client.post(
            f"{API}/sync/conflicts/{conflict_id}/resolve",
            json={"resolution_type": "KEEP_SERVER", "expected_server_version": 2},
            headers=scenario.admin_headers,
        ),
        200,
    )
    assert resolved["status"] == "RESOLVED"
    assert resolved["resolution_type"] == "KEEP_SERVER"

    audit_detail = assert_data(
        scenario.client.get(
            f"{API}/sync/conflicts/{conflict_id}", headers=scenario.admin_headers
        ),
        200,
    )
    assert audit_detail["status"] == "RESOLVED"
    assert audit_detail["resolution_type"] == "KEEP_SERVER"
    assert audit_detail["resolved_by"] == str(scenario.admin.id)
    assert audit_detail["resolved_at"] is not None

    repeated = scenario.client.post(
        f"{API}/sync/conflicts/{conflict_id}/resolve",
        json={"resolution_type": "KEEP_SERVER", "expected_server_version": 2},
        headers=scenario.admin_headers,
    )
    assert_error(repeated, 409, "CONFLICT")

    open_conflicts = assert_data(
        scenario.client.get(
            f"{API}/sync/conflicts",
            params={"status": "OPEN", "page_size": 100},
            headers=scenario.admin_headers,
        ),
        200,
    )
    assert all(item["id"] != conflict_id for item in open_conflicts)


def test_phase_four_crud_writes_are_pullable(scenario) -> None:
    _, cursor = drain(
        scenario.client, scenario.inspector_headers, scenario.inspector_device["id"]
    )
    site = create_site(scenario.client, scenario.admin_headers)
    page = pull_page(
        scenario.client,
        scenario.inspector_headers,
        scenario.inspector_device["id"],
        cursor=cursor,
    )
    site_events = [c for c in page["changes"] if c["entity_id"] == site["id"]]
    assert len(site_events) == 1
    assert site_events[0]["entity_type"] == "site"
    assert site_events[0]["change_type"] == "CREATE"


def test_sync_endpoints_require_authentication(scenario) -> None:
    unauthenticated = scenario.client.get(
        f"{API}/sync/pull", params={"device_id": scenario.inspector_device["id"]}
    )
    assert_error(unauthenticated, 401, "UNAUTHORIZED")
