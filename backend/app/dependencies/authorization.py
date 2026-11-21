from collections.abc import Callable
from uuid import UUID

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.permissions import Role, can_access_inspection, can_access_user_resource, is_admin
from app.database.models import ChecklistTemplate, Inspection, Site
from app.database.session import get_db
from app.dependencies.authentication import get_current_user
from app.schemas.auth import CurrentUserResponse


def require_roles(*allowed_roles: Role) -> Callable[..., CurrentUserResponse]:
    def role_checker(
        current_user: CurrentUserResponse = Depends(get_current_user),
    ) -> CurrentUserResponse:
        if current_user.role not in allowed_roles:
            raise ForbiddenError("You do not have permission to perform this action.")
        return current_user

    return role_checker


require_admin = require_roles("ADMIN")
require_inspector = require_roles("INSPECTOR")


def require_self_or_admin(
    user_id: UUID,
    current_user: CurrentUserResponse = Depends(get_current_user),
) -> CurrentUserResponse:
    """Allow the account owner or an administrator to access a user resource."""

    if not can_access_user_resource(current_user, user_id):
        raise ForbiddenError("You do not have permission to access this resource.")
    return current_user


def require_inspection_access(
    inspection_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUserResponse = Depends(get_current_user),
) -> Inspection:
    """Allow administrators and the assigned inspector to access an inspection."""

    inspection = db.get(Inspection, inspection_id)
    if inspection is None:
        raise NotFoundError("The requested inspection was not found.")
    if not can_access_inspection(current_user, inspection.assigned_to):
        raise ForbiddenError("You do not have permission to access this inspection.")
    return inspection


def require_site_access(
    site_id: UUID,
    db: Session = Depends(get_db),
    current_user: CurrentUserResponse = Depends(get_current_user),
) -> Site:
    """Allow administrators and inspectors with an assignment at the site."""

    site = db.get(Site, site_id)
    if site is None:
        raise NotFoundError("The requested site was not found.")

    if is_admin(current_user):
        return site

    has_assignment = db.scalar(
        select(Inspection.id)
        .where(
            Inspection.site_id == site_id,
            Inspection.assigned_to == current_user.id,
        )
        .limit(1)
    )
    if has_assignment is None:
        raise ForbiddenError("You do not have permission to access this site.")
    return site


def require_template_access(
    template_id: UUID,
    template_version: int | None = None,
    db: Session = Depends(get_db),
    current_user: CurrentUserResponse = Depends(get_current_user),
) -> ChecklistTemplate:
    """Allow administrators and inspectors assigned to the template revision."""

    query = select(ChecklistTemplate).where(ChecklistTemplate.id == template_id)
    if template_version is not None:
        query = query.where(ChecklistTemplate.template_version == template_version)
    template = db.scalar(query)
    if template is None:
        raise NotFoundError("The requested checklist template was not found.")

    if is_admin(current_user):
        return template

    assignment_query = select(Inspection.id).where(
        Inspection.template_id == template_id,
        Inspection.assigned_to == current_user.id,
    )
    if template_version is not None:
        assignment_query = assignment_query.where(
            Inspection.template_version == template_version
        )
    if db.scalar(assignment_query.limit(1)) is None:
        raise ForbiddenError("You do not have permission to access this template.")
    return template
