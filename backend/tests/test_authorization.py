from uuid import UUID

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions import can_access_inspection, can_access_user_resource
from app.core.security import create_access_token
from app.database.models import ChecklistTemplate, Inspection, Site
from app.dependencies.authorization import (
    require_admin,
    require_inspection_access,
    require_self_or_admin,
    require_site_access,
)


def access_token(client: TestClient, email: str, password: str) -> str:
    response = client.post(
        f"{settings.API_PREFIX}/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()["data"]["access_token"]


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_permission_helpers_follow_admin_and_ownership_rules() -> None:
    admin = type("Actor", (), {"id": UUID(int=1), "role": "ADMIN"})()
    inspector = type("Actor", (), {"id": UUID(int=2), "role": "INSPECTOR"})()

    assert can_access_user_resource(admin, UUID(int=3)) is True
    assert can_access_user_resource(inspector, inspector.id) is True
    assert can_access_user_resource(inspector, UUID(int=3)) is False
    assert can_access_inspection(inspector, inspector.id) is True
    assert can_access_inspection(inspector, UUID(int=3)) is False


def test_admin_only_endpoint_rejects_inspector(
    api_app, create_test_user
) -> None:
    @api_app.get("/test/admin-only", dependencies=[Depends(require_admin)])
    def admin_only() -> dict[str, bool]:
        return {"allowed": True}

    inspector, inspector_password = create_test_user(role="INSPECTOR")
    admin, admin_password = create_test_user(role="ADMIN")

    with TestClient(api_app) as client:
        inspector_token = access_token(client, inspector.email, inspector_password)
        admin_token = access_token(client, admin.email, admin_password)

        denied = client.get("/test/admin-only", headers=bearer(inspector_token))
        allowed = client.get("/test/admin-only", headers=bearer(admin_token))

    assert denied.status_code == 403
    assert denied.json()["error"]["code"] == "FORBIDDEN"
    assert allowed.status_code == 200
    assert allowed.json() == {"allowed": True}


def test_inspector_can_only_access_own_user_resource(
    api_app, create_test_user
) -> None:
    @api_app.get("/test/users/{user_id}")
    def get_user(
        user_id: UUID,
        current_user=Depends(require_self_or_admin),
    ) -> dict[str, str]:
        return {"requested": str(user_id), "actor": str(current_user.id)}

    inspector, inspector_password = create_test_user(role="INSPECTOR")
    other, _ = create_test_user(role="INSPECTOR")
    admin, admin_password = create_test_user(role="ADMIN")

    with TestClient(api_app) as client:
        inspector_token = access_token(client, inspector.email, inspector_password)
        admin_token = access_token(client, admin.email, admin_password)

        own = client.get(
            f"/test/users/{inspector.id}", headers=bearer(inspector_token)
        )
        other_user = client.get(
            f"/test/users/{other.id}", headers=bearer(inspector_token)
        )
        admin_access = client.get(
            f"/test/users/{other.id}", headers=bearer(admin_token)
        )

    assert own.status_code == 200
    assert other_user.status_code == 403
    assert admin_access.status_code == 200


def test_token_role_claim_does_not_override_database_role(
    api_app, create_test_user
) -> None:
    @api_app.get("/test/admin-only", dependencies=[Depends(require_admin)])
    def admin_only() -> dict[str, bool]:
        return {"allowed": True}

    inspector, _ = create_test_user(role="INSPECTOR")
    forged_token, _ = create_access_token(inspector.id, "ADMIN")

    with TestClient(api_app) as client:
        response = client.get("/test/admin-only", headers=bearer(forged_token))

    assert response.status_code == 403


@pytest.fixture
def assigned_inspection(migrated_engine, create_test_user):
    admin, admin_password = create_test_user(role="ADMIN")
    inspector, inspector_password = create_test_user(role="INSPECTOR")
    other, other_password = create_test_user(role="INSPECTOR")

    with Session(migrated_engine) as db:
        site = Site(
            name="Authorization Test Site",
            site_code=f"AUTH-{admin.id.hex[:8]}",
            address="1 Test Road",
            city="Hyderabad",
        )
        template = ChecklistTemplate(
            name="Authorization Template",
            description="Authorization test template",
            created_by=admin.id,
        )
        db.add_all([site, template])
        db.flush()

        inspection = Inspection(
            site_id=site.id,
            template_id=template.id,
            template_version=template.template_version,
            assigned_to=inspector.id,
            created_by=admin.id,
            title="Authorization test inspection",
        )
        db.add(inspection)
        db.commit()

        return {
            "admin": (admin, admin_password),
            "inspector": (inspector, inspector_password),
            "other": (other, other_password),
            "inspection_id": inspection.id,
            "site_id": site.id,
        }


def test_inspector_can_only_access_assigned_inspection(
    api_app, assigned_inspection
) -> None:
    @api_app.get("/test/inspections/{inspection_id}")
    def get_inspection(
        inspection_id: UUID,
        inspection=Depends(require_inspection_access),
    ) -> dict[str, str]:
        return {"id": str(inspection.id)}

    admin, admin_password = assigned_inspection["admin"]
    inspector, inspector_password = assigned_inspection["inspector"]
    other, other_password = assigned_inspection["other"]
    inspection_id = assigned_inspection["inspection_id"]

    with TestClient(api_app) as client:
        inspector_token = access_token(client, inspector.email, inspector_password)
        other_token = access_token(client, other.email, other_password)
        admin_token = access_token(client, admin.email, admin_password)

        assigned = client.get(
            f"/test/inspections/{inspection_id}", headers=bearer(inspector_token)
        )
        unauthorized = client.get(
            f"/test/inspections/{inspection_id}", headers=bearer(other_token)
        )
        admin_response = client.get(
            f"/test/inspections/{inspection_id}", headers=bearer(admin_token)
        )

    assert assigned.status_code == 200
    assert unauthorized.status_code == 403
    assert admin_response.status_code == 200


def test_inspector_can_only_access_sites_with_assignment(
    api_app, assigned_inspection
) -> None:
    @api_app.get("/test/sites/{site_id}")
    def get_site(
        site_id: UUID,
        site=Depends(require_site_access),
    ) -> dict[str, str]:
        return {"id": str(site.id)}

    inspector, inspector_password = assigned_inspection["inspector"]
    other, other_password = assigned_inspection["other"]
    site_id = assigned_inspection["site_id"]

    with TestClient(api_app) as client:
        inspector_token = access_token(client, inspector.email, inspector_password)
        other_token = access_token(client, other.email, other_password)

        assigned = client.get(f"/test/sites/{site_id}", headers=bearer(inspector_token))
        unauthorized = client.get(
            f"/test/sites/{site_id}", headers=bearer(other_token)
        )

    assert assigned.status_code == 200
    assert unauthorized.status_code == 403
