from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token
from app.database.models import (
    ChecklistItem,
    InspectionResult,
    SyncConflict,
    SyncDevice,
    SyncOperation,
    User,
)

API = settings.API_PREFIX


def auth_headers(user: User) -> dict[str, str]:
    token, _ = create_access_token(user.id, user.role)
    return {"Authorization": f"Bearer {token}"}


def unique_email(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex}@example.com"


def assert_status(response, expected: int) -> dict:
    assert response.status_code == expected, response.text
    return response.json()["data"]


def assert_list(response, expected: int) -> dict:
    assert response.status_code == expected, response.text
    return response.json()


def create_site(
    client: TestClient,
    headers: dict[str, str],
    code: str | None = None,
    name: str = "Phase Four Site",
) -> dict:
    payload = {
        "name": name,
        "site_code": code or f"SITE-{uuid4().hex[:10].upper()}",
        "address": "1 Test Road",
        "city": "Hyderabad",
        "state": "Telangana",
        "postal_code": "500001",
        "country": "India",
    }
    return assert_status(client.post(f"{API}/sites", json=payload, headers=headers), 201)


def standard_items() -> list[dict]:
    return [
        {
            "question": "Is the emergency exit accessible?",
            "response_type": "YES_NO",
            "is_required": True,
            "display_order": 1,
        },
        {
            "question": "Describe any visible safety issue.",
            "response_type": "TEXT",
            "is_required": False,
            "display_order": 2,
        },
    ]


def create_template(
    client: TestClient,
    headers: dict[str, str],
    *,
    name: str = "Phase Four Checklist",
    items: list[dict] | None = None,
) -> dict:
    payload = {"name": name, "description": "Phase four test template", "items": items or standard_items()}
    return assert_status(client.post(f"{API}/checklist-templates", json=payload, headers=headers), 201)


def create_inspection(
    client: TestClient,
    headers: dict[str, str],
    *,
    site_id: str,
    template: dict,
    assigned_to: str,
    title: str = "Phase Four Inspection",
) -> dict:
    payload = {
        "site_id": site_id,
        "template_id": template["id"],
        "template_version": template["template_version"],
        "assigned_to": assigned_to,
        "title": title,
        "instructions": "Complete all required checks.",
    }
    return assert_status(client.post(f"{API}/inspections", json=payload, headers=headers), 201)


@pytest.fixture
def scenario(api_client: TestClient, create_test_user):
    admin, admin_password = create_test_user(role="ADMIN")
    inspector, inspector_password = create_test_user(role="INSPECTOR")
    other, other_password = create_test_user(role="INSPECTOR")

    admin_headers = auth_headers(admin)
    site = create_site(api_client, admin_headers)
    template = create_template(api_client, admin_headers)
    inspection = create_inspection(
        api_client,
        admin_headers,
        site_id=site["id"],
        template=template,
        assigned_to=str(inspector.id),
    )

    return SimpleNamespace(
        client=api_client,
        admin=admin,
        admin_password=admin_password,
        admin_headers=admin_headers,
        inspector=inspector,
        inspector_password=inspector_password,
        inspector_headers=auth_headers(inspector),
        other=other,
        other_password=other_password,
        other_headers=auth_headers(other),
        site=site,
        template=template,
        inspection=inspection,
    )


def test_admin_can_manage_users_and_inspectors_cannot(
    api_client: TestClient, create_test_user, migrated_engine
) -> None:
    admin, _ = create_test_user(role="ADMIN")
    inspector, _ = create_test_user(role="INSPECTOR")
    admin_headers = auth_headers(admin)
    email = unique_email("managed")

    created = assert_status(
        api_client.post(
            f"{API}/users",
            json={
                "full_name": "Managed Inspector",
                "email": email,
                "password": "TemporaryPassword123!",
                "role": "INSPECTOR",
            },
            headers=admin_headers,
        ),
        201,
    )
    assert created["role"] == "INSPECTOR"
    assert created["is_active"] is True
    assert "password_hash" not in created

    listed = assert_list(
        api_client.get(f"{API}/users", params={"search": email}, headers=admin_headers),
        200,
    )
    assert listed["pagination"]["total"] == 1
    assert listed["data"][0]["id"] == created["id"]

    fetched = assert_status(
        api_client.get(f"{API}/users/{created['id']}", headers=admin_headers), 200
    )
    assert fetched["email"] == email

    updated = assert_status(
        api_client.patch(
            f"{API}/users/{created['id']}",
            json={"full_name": "Renamed Inspector", "role": "ADMIN"},
            headers=admin_headers,
        ),
        200,
    )
    assert updated["full_name"] == "Renamed Inspector"
    assert updated["role"] == "ADMIN"

    deactivated = assert_status(
        api_client.patch(
            f"{API}/users/{created['id']}/status",
            json={"is_active": False},
            headers=admin_headers,
        ),
        200,
    )
    assert deactivated["is_active"] is False

    with Session(migrated_engine) as db:
        stored = db.get(User, created["id"])
        assert stored is not None
        assert stored.password_hash.startswith("$argon2id$")

    denied = api_client.post(
        f"{API}/users",
        json={
            "full_name": "Denied",
            "email": unique_email("denied"),
            "password": "TemporaryPassword123!",
            "role": "INSPECTOR",
        },
        headers=auth_headers(inspector),
    )
    assert denied.status_code == 403

    self_role_change = api_client.patch(
        f"{API}/users/{admin.id}",
        json={"role": "INSPECTOR"},
        headers=admin_headers,
    )
    assert self_role_change.status_code == 403

    self_deactivate = api_client.patch(
        f"{API}/users/{admin.id}/status",
        json={"is_active": False},
        headers=admin_headers,
    )
    assert self_deactivate.status_code == 403

    duplicate = api_client.post(
        f"{API}/users",
        json={
            "full_name": "Duplicate",
            "email": email,
            "password": "TemporaryPassword123!",
            "role": "INSPECTOR",
        },
        headers=admin_headers,
    )
    assert duplicate.status_code == 409


def test_admin_can_manage_sites_with_version_checks_and_scoped_reads(scenario) -> None:
    client = scenario.client
    site = scenario.site

    duplicate = client.post(
        f"{API}/sites",
        json={
            "name": "Duplicate Site",
            "site_code": site["site_code"],
            "address": "2 Test Road",
        },
        headers=scenario.admin_headers,
    )
    assert duplicate.status_code == 409

    updated = assert_status(
        client.patch(
            f"{API}/sites/{site['id']}",
            json={"name": "Updated Site", "version": 1},
            headers=scenario.admin_headers,
        ),
        200,
    )
    assert updated["name"] == "Updated Site"
    assert updated["version"] == 2

    stale = client.patch(
        f"{API}/sites/{site['id']}",
        json={"description": "Stale update", "version": 1},
        headers=scenario.admin_headers,
    )
    assert stale.status_code == 409

    deactivated = assert_status(
        client.patch(
            f"{API}/sites/{site['id']}/status",
            json={"is_active": False, "version": 2},
            headers=scenario.admin_headers,
        ),
        200,
    )
    assert deactivated["is_active"] is False
    assert deactivated["version"] == 3

    inspector_sites = assert_list(
        client.get(
            f"{API}/sites",
            params={"search": site["site_code"]},
            headers=scenario.inspector_headers,
        ),
        200,
    )
    assert [item["id"] for item in inspector_sites["data"]] == [site["id"]]

    unauthorized = client.get(
        f"{API}/sites/{site['id']}", headers=scenario.other_headers
    )
    assert unauthorized.status_code == 403

    inspector_update = client.patch(
        f"{API}/sites/{site['id']}",
        json={"name": "Forbidden", "version": 3},
        headers=scenario.inspector_headers,
    )
    assert inspector_update.status_code == 403


def test_checklist_revisions_are_separate_and_published_revisions_are_immutable(
    scenario,
) -> None:
    client = scenario.client
    original = scenario.template

    revision_items = [
        {
            "question": "Are extinguisher seals intact?",
            "response_type": "YES_NO",
            "is_required": True,
            "display_order": 1,
        }
    ]
    revision = assert_status(
        client.post(
            f"{API}/checklist-templates/{original['id']}/revisions",
            json={
                "name": original["name"],
                "description": "Revised checklist",
                "items": revision_items,
            },
            headers=scenario.admin_headers,
        ),
        201,
    )
    assert revision["id"] != original["id"]
    assert revision["template_version"] == 2
    assert len(revision["items"]) == 1

    blocked_item = client.post(
        f"{API}/checklist-templates/{original['id']}/items",
        json={
            "question": "Cannot add",
            "response_type": "TEXT",
            "is_required": False,
            "display_order": 3,
        },
        headers=scenario.admin_headers,
    )
    assert blocked_item.status_code == 409

    blocked_update = client.patch(
        f"{API}/checklist-templates/{original['id']}/items/{original['items'][0]['id']}",
        json={"question": "Cannot update"},
        headers=scenario.admin_headers,
    )
    assert blocked_update.status_code == 409

    added = assert_status(
        client.post(
            f"{API}/checklist-templates/{revision['id']}/items",
            json={
                "question": "Are cameras working?",
                "response_type": "YES_NO",
                "is_required": False,
                "display_order": 2,
            },
            headers=scenario.admin_headers,
        ),
        201,
    )
    edited = assert_status(
        client.patch(
            f"{API}/checklist-templates/{revision['id']}/items/{added['id']}",
            json={"question": "Are all cameras working?"},
            headers=scenario.admin_headers,
        ),
        200,
    )
    assert edited["question"] == "Are all cameras working?"

    assigned_template = assert_status(
        client.get(
            f"{API}/checklist-templates/{original['id']}",
            params={"template_version": 1},
            headers=scenario.inspector_headers,
        ),
        200,
    )
    assert assigned_template["id"] == original["id"]

    unassigned_revision = client.get(
        f"{API}/checklist-templates/{revision['id']}",
        headers=scenario.inspector_headers,
    )
    assert unassigned_revision.status_code == 403

    unassigned_template = create_template(client, scenario.admin_headers, name="Unassigned Template")
    forbidden_template = client.get(
        f"{API}/checklist-templates/{unassigned_template['id']}",
        headers=scenario.inspector_headers,
    )
    assert forbidden_template.status_code == 403

    deactivated = assert_status(
        client.patch(
            f"{API}/checklist-templates/{original['id']}/status",
            json={"is_active": False},
            headers=scenario.admin_headers,
        ),
        200,
    )
    assert deactivated["is_active"] is False

    detail = assert_status(
        client.get(
            f"{API}/inspections/{scenario.inspection['id']}",
            headers=scenario.inspector_headers,
        ),
        200,
    )
    assert detail["template"]["id"] == original["id"]


def test_inspection_lifecycle_answers_submission_and_idempotency(scenario, migrated_engine) -> None:
    client = scenario.client
    inspection_id = scenario.inspection["id"]
    required_item_id = scenario.template["items"][0]["id"]

    own_list = assert_list(
        client.get(f"{API}/inspections", headers=scenario.inspector_headers), 200
    )
    assert [item["id"] for item in own_list["data"]] == [inspection_id]

    other_list = assert_list(
        client.get(f"{API}/inspections", headers=scenario.other_headers), 200
    )
    assert other_list["data"] == []

    detail = assert_status(
        client.get(f"{API}/inspections/{inspection_id}", headers=scenario.inspector_headers),
        200,
    )
    assert detail["site"]["id"] == scenario.site["id"]
    assert detail["template"]["id"] == scenario.template["id"]
    assert len(detail["checklist_items"]) == 2
    assert detail["answers"] == []
    assert detail["result"] is None

    forbidden_detail = client.get(
        f"{API}/inspections/{inspection_id}", headers=scenario.other_headers
    )
    assert forbidden_detail.status_code == 403

    bad_assignment = client.post(
        f"{API}/inspections",
        json={
            "site_id": scenario.site["id"],
            "template_id": scenario.template["id"],
            "template_version": 1,
            "assigned_to": str(uuid4()),
            "title": "Invalid assignment",
        },
        headers=scenario.admin_headers,
    )
    assert bad_assignment.status_code == 422

    stale_start = client.post(
        f"{API}/inspections/{inspection_id}/start",
        json={"version": 99},
        headers=scenario.inspector_headers,
    )
    assert stale_start.status_code == 409

    started = assert_status(
        client.post(
            f"{API}/inspections/{inspection_id}/start",
            json={"version": 1},
            headers=scenario.inspector_headers,
        ),
        200,
    )
    assert started == {"id": inspection_id, "status": "IN_PROGRESS", "version": 2}

    missing_answer = client.post(
        f"{API}/inspections/{inspection_id}/submit",
        json={
            "summary": "Too early",
            "overall_status": "PASS",
            "version": 2,
            "submission_id": str(uuid4()),
        },
        headers=scenario.inspector_headers,
    )
    assert missing_answer.status_code == 422

    wrong_type = client.put(
        f"{API}/inspections/{inspection_id}/answers/{required_item_id}",
        json={"answer_value": "yes", "base_version": 1},
        headers=scenario.inspector_headers,
    )
    assert wrong_type.status_code == 422

    unrelated_template = create_template(
        client, scenario.admin_headers, name="Unrelated Checklist"
    )
    wrong_item = client.put(
        f"{API}/inspections/{inspection_id}/answers/{unrelated_template['items'][0]['id']}",
        json={"answer_value": True, "base_version": 1},
        headers=scenario.inspector_headers,
    )
    assert wrong_item.status_code == 422

    saved = assert_status(
        client.put(
            f"{API}/inspections/{inspection_id}/answers/{required_item_id}",
            json={"answer_value": True, "notes": "Exit is clear.", "base_version": 1},
            headers=scenario.inspector_headers,
        ),
        200,
    )
    assert saved["answer_value"] is True
    assert saved["version"] == 1

    updated_answer = assert_status(
        client.put(
            f"{API}/inspections/{inspection_id}/answers/{required_item_id}",
            json={"answer_value": False, "notes": "Re-checked.", "base_version": 1},
            headers=scenario.inspector_headers,
        ),
        200,
    )
    assert updated_answer["version"] == 2

    stale_answer = client.put(
        f"{API}/inspections/{inspection_id}/answers/{required_item_id}",
        json={"answer_value": True, "base_version": 1},
        headers=scenario.inspector_headers,
    )
    assert stale_answer.status_code == 409

    stale_submit = client.post(
        f"{API}/inspections/{inspection_id}/submit",
        json={
            "summary": "Stale",
            "overall_status": "PASS",
            "version": 1,
            "submission_id": str(uuid4()),
        },
        headers=scenario.inspector_headers,
    )
    assert stale_submit.status_code == 409

    submission_id = str(uuid4())
    submit_payload = {
        "summary": "All required checks completed.",
        "overall_status": "PASS",
        "version": 2,
        "submission_id": submission_id,
    }
    submitted = assert_status(
        client.post(
            f"{API}/inspections/{inspection_id}/submit",
            json=submit_payload,
            headers=scenario.inspector_headers,
        ),
        201,
    )
    assert submitted["submission_number"] == 1
    assert submitted["inspection_status"] == "SUBMITTED"

    duplicate = assert_status(
        client.post(
            f"{API}/inspections/{inspection_id}/submit",
            json=submit_payload,
            headers=scenario.inspector_headers,
        ),
        201,
    )
    assert duplicate["result_id"] == submitted["result_id"]

    changed_payload = dict(submit_payload, overall_status="FAIL")
    changed = client.post(
        f"{API}/inspections/{inspection_id}/submit",
        json=changed_payload,
        headers=scenario.inspector_headers,
    )
    assert changed.status_code == 409

    with Session(migrated_engine) as db:
        count = db.scalar(
            select(func.count()).select_from(InspectionResult).where(
                InspectionResult.submission_id == submission_id
            )
        )
        assert count == 1

    unauthorized_submit = client.post(
        f"{API}/inspections/{inspection_id}/submit",
        json=submit_payload,
        headers=scenario.other_headers,
    )
    assert unauthorized_submit.status_code == 403

    admin_detail = assert_status(
        client.get(f"{API}/inspections/{inspection_id}", headers=scenario.admin_headers),
        200,
    )
    assert admin_detail["status"] == "SUBMITTED"
    assert admin_detail["answers"][0]["answer_value"] is False
    assert admin_detail["answers"][0]["notes"] == "Re-checked."
    assert admin_detail["result"]["submission_id"] == submission_id
    assert admin_detail["result"]["submission_number"] == 1
    assert admin_detail["result"]["overall_status"] == "PASS"
    assert admin_detail["result"]["summary"] == "All required checks completed."


def test_dashboard_summaries_are_scoped_by_role(scenario, migrated_engine) -> None:
    client = scenario.client

    admin_summary = assert_status(
        client.get(f"{API}/dashboard/summary", headers=scenario.admin_headers), 200
    )
    assert admin_summary["total_inspections"] >= 1
    assert admin_summary["assigned_inspections"] >= 1
    assert admin_summary["total_users"] >= 3
    assert admin_summary["active_inspectors"] >= 2
    assert admin_summary["total_sites"] >= 1
    assert admin_summary["pending_operations"] >= 0
    assert admin_summary["failed_operations"] >= 0
    assert admin_summary["open_conflicts"] >= 0

    inspector_summary = assert_status(
        client.get(f"{API}/dashboard/summary", headers=scenario.inspector_headers), 200
    )
    assert inspector_summary["total_inspections"] == 1
    assert inspector_summary["assigned_inspections"] == 1
    assert inspector_summary["in_progress_inspections"] == 0
    assert inspector_summary["submitted_inspections"] == 0
    assert inspector_summary["total_users"] is None
    assert inspector_summary["active_inspectors"] is None
    assert inspector_summary["total_sites"] == 1

    other_summary = assert_status(
        client.get(f"{API}/dashboard/summary", headers=scenario.other_headers), 200
    )
    assert other_summary["total_inspections"] == 0
    assert other_summary["total_sites"] == 0

    with Session(migrated_engine) as db:
        item_count = db.scalar(
            select(func.count()).select_from(ChecklistItem).where(
                ChecklistItem.template_id == scenario.template["id"]
            )
        )
        assert item_count == 2

    unauthenticated = client.get(f"{API}/dashboard/summary")
    assert unauthenticated.status_code == 401


def test_collection_pagination_uses_page_size_offset(scenario) -> None:
    client = scenario.client
    marker = f"PGN{uuid4().hex[:8].upper()}"
    names = [f"{marker} Site {letter}" for letter in "ABCDE"]

    for index, name in enumerate(names):
        create_site(
            client,
            scenario.admin_headers,
            code=f"{marker}-{index}",
            name=name,
        )

    first_page = assert_list(
        client.get(
            f"{API}/sites",
            params={"search": marker, "page": 1, "page_size": 2},
            headers=scenario.admin_headers,
        ),
        200,
    )
    second_page = assert_list(
        client.get(
            f"{API}/sites",
            params={"search": marker, "page": 2, "page_size": 2},
            headers=scenario.admin_headers,
        ),
        200,
    )

    assert first_page["pagination"]["total"] == 5
    assert [item["name"] for item in first_page["data"]] == names[:2]
    assert [item["name"] for item in second_page["data"]] == names[2:4]


def test_checklist_revision_versions_are_allocated_from_committed_lineage(scenario) -> None:
    client = scenario.client
    original = scenario.template

    first = assert_status(
        client.post(
            f"{API}/checklist-templates/{original['id']}/revisions",
            json={
                "name": original["name"],
                "description": "First revision",
                "items": standard_items(),
            },
            headers=scenario.admin_headers,
        ),
        201,
    )
    second = assert_status(
        client.post(
            f"{API}/checklist-templates/{original['id']}/revisions",
            json={
                "name": original["name"],
                "description": "Second revision",
                "items": standard_items(),
            },
            headers=scenario.admin_headers,
        ),
        201,
    )

    assert first["template_version"] == 2
    assert second["template_version"] == 3
    assert first["id"] != second["id"] != original["id"]

    separate_lineage = create_template(
        client, scenario.admin_headers, name=original["name"]
    )
    separate_revision = assert_status(
        client.post(
            f"{API}/checklist-templates/{separate_lineage['id']}/revisions",
            json={
                "name": original["name"],
                "description": "Separate lineage revision",
                "items": standard_items(),
            },
            headers=scenario.admin_headers,
        ),
        201,
    )
    assert separate_revision["template_version"] == 2
    assert separate_revision["id"] not in {original["id"], first["id"], second["id"]}


def test_submission_retry_with_different_version_is_rejected(scenario, migrated_engine) -> None:
    client = scenario.client
    inspection_id = scenario.inspection["id"]
    required_item_id = scenario.template["items"][0]["id"]

    assert_status(
        client.post(
            f"{API}/inspections/{inspection_id}/start",
            json={"version": 1},
            headers=scenario.inspector_headers,
        ),
        200,
    )
    assert_status(
        client.put(
            f"{API}/inspections/{inspection_id}/answers/{required_item_id}",
            json={"answer_value": True, "base_version": 1},
            headers=scenario.inspector_headers,
        ),
        200,
    )

    submission_id = str(uuid4())
    payload = {
        "summary": "Submitted once.",
        "overall_status": "PASS",
        "version": 2,
        "submission_id": submission_id,
    }
    submitted = assert_status(
        client.post(
            f"{API}/inspections/{inspection_id}/submit",
            json=payload,
            headers=scenario.inspector_headers,
        ),
        201,
    )
    assert submitted["inspection_status"] == "SUBMITTED"

    # Version 3 is the inspection's current version, so this is not a stale
    # version conflict; it must fail because the submitted version differs.
    changed_version = client.post(
        f"{API}/inspections/{inspection_id}/submit",
        json=dict(payload, version=3),
        headers=scenario.inspector_headers,
    )
    assert changed_version.status_code == 409

    with Session(migrated_engine) as db:
        stored = db.scalar(
            select(InspectionResult).where(InspectionResult.submission_id == submission_id)
        )
        assert stored is not None
        assert stored.submitted_version == 2


def test_patch_requests_can_clear_nullable_fields(scenario) -> None:
    client = scenario.client

    site_updated = assert_status(
        client.patch(
            f"{API}/sites/{scenario.site['id']}",
            json={"description": "Temporary description", "version": 1},
            headers=scenario.admin_headers,
        ),
        200,
    )
    assert site_updated["description"] == "Temporary description"
    site_cleared = assert_status(
        client.patch(
            f"{API}/sites/{scenario.site['id']}",
            json={"description": None, "version": site_updated["version"]},
            headers=scenario.admin_headers,
        ),
        200,
    )
    assert site_cleared["description"] is None

    inspection_updated = assert_status(
        client.patch(
            f"{API}/inspections/{scenario.inspection['id']}",
            json={"instructions": "Temporary instruction", "version": 1},
            headers=scenario.admin_headers,
        ),
        200,
    )
    assert inspection_updated["instructions"] == "Temporary instruction"
    inspection_cleared = assert_status(
        client.patch(
            f"{API}/inspections/{scenario.inspection['id']}",
            json={"instructions": None, "version": inspection_updated["version"]},
            headers=scenario.admin_headers,
        ),
        200,
    )
    assert inspection_cleared["instructions"] is None

    template = create_template(client, scenario.admin_headers, name="Editable Checklist")
    item_id = template["items"][1]["id"]
    item_updated = assert_status(
        client.patch(
            f"{API}/checklist-templates/{template['id']}/items/{item_id}",
            json={"description": "Temporary description"},
            headers=scenario.admin_headers,
        ),
        200,
    )
    assert item_updated["description"] == "Temporary description"
    item_cleared = assert_status(
        client.patch(
            f"{API}/checklist-templates/{template['id']}/items/{item_id}",
            json={"description": None},
            headers=scenario.admin_headers,
        ),
        200,
    )
    assert item_cleared["description"] is None

    invalid_site = client.patch(
        f"{API}/sites/{scenario.site['id']}",
        json={"name": None, "version": site_cleared["version"]},
        headers=scenario.admin_headers,
    )
    assert invalid_site.status_code == 422

    invalid_inspection = client.patch(
        f"{API}/inspections/{scenario.inspection['id']}",
        json={"title": None, "version": inspection_cleared["version"]},
        headers=scenario.admin_headers,
    )
    assert invalid_inspection.status_code == 422

    for field in ("question", "is_required", "display_order"):
        invalid_item = client.patch(
            f"{API}/checklist-templates/{template['id']}/items/{item_id}",
            json={field: None},
            headers=scenario.admin_headers,
        )
        assert invalid_item.status_code == 422


def test_choice_item_options_cannot_be_cleared(scenario) -> None:
    client = scenario.client
    template = create_template(
        client,
        scenario.admin_headers,
        name="Choice Checklist",
        items=[
            {
                "question": "Choose a status.",
                "response_type": "SINGLE_CHOICE",
                "is_required": False,
                "display_order": 1,
                "options": {"choices": ["Pass", "Fail"]},
            }
        ],
    )
    item_id = template["items"][0]["id"]

    cleared_options = client.patch(
        f"{API}/checklist-templates/{template['id']}/items/{item_id}",
        json={"options": None},
        headers=scenario.admin_headers,
    )
    assert cleared_options.status_code == 422

    empty_options = client.patch(
        f"{API}/checklist-templates/{template['id']}/items/{item_id}",
        json={"options": {}},
        headers=scenario.admin_headers,
    )
    assert empty_options.status_code == 422


def test_dashboard_conflicts_are_scoped_by_operation_owner(
    api_client: TestClient, create_test_user, migrated_engine
) -> None:
    admin, _ = create_test_user(role="ADMIN")
    owner, _ = create_test_user(role="INSPECTOR")
    other, _ = create_test_user(role="INSPECTOR")

    with Session(migrated_engine) as db:
        for user in (owner, other):
            device = SyncDevice(user_id=user.id, device_name="Test device")
            db.add(device)
            db.flush()
            operation = SyncOperation(
                operation_id=uuid4(),
                user_id=user.id,
                device_id=device.id,
                entity_type="INSPECTION",
                entity_id=uuid4(),
                operation_type="UPDATE",
                request_hash=f"request-{user.id}",
                result_status="CONFLICT",
            )
            db.add(operation)
            db.flush()
            if user.id == owner.id:
                db.add(
                    SyncConflict(
                        operation_id=operation.id,
                        entity_type="INSPECTION",
                        entity_id=uuid4(),
                        local_payload={"version": 1},
                        server_payload={"version": 2},
                        status="OPEN",
                    )
                )
        db.commit()

    owner_summary = assert_status(
        api_client.get(f"{API}/dashboard/summary", headers=auth_headers(owner)), 200
    )
    other_summary = assert_status(
        api_client.get(f"{API}/dashboard/summary", headers=auth_headers(other)), 200
    )
    admin_summary = assert_status(
        api_client.get(f"{API}/dashboard/summary", headers=auth_headers(admin)), 200
    )

    assert owner_summary["open_conflicts"] == 1
    assert other_summary["open_conflicts"] == 0
    assert admin_summary["open_conflicts"] == 1
