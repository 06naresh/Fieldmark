from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.db_errors import flush_changes
from app.database.models import Inspection, Site


class SiteRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, site_id: UUID) -> Site | None:
        return self.db.get(Site, site_id)

    def get_for_update(self, site_id: UUID) -> Site | None:
        return self.db.scalar(select(Site).where(Site.id == site_id).with_for_update())

    def list(
        self,
        *,
        is_active: bool | None,
        search: str | None,
        authorized_site_ids: list[UUID] | None,
        skip: int,
        limit: int,
    ) -> tuple[list[Site], int]:
        query = select(Site)

        if authorized_site_ids is not None:
            if not authorized_site_ids:
                return [], 0
            query = query.where(Site.id.in_(authorized_site_ids))
        if is_active is not None:
            query = query.where(Site.is_active.is_(is_active))
        if search:
            pattern = f"%{search.strip().lower()}%"
            query = query.where(
                or_(
                    func.lower(Site.name).like(pattern),
                    func.lower(Site.site_code).like(pattern),
                    func.lower(Site.city).like(pattern),
                )
            )

        total = self.db.scalar(
            select(func.count()).select_from(query.order_by(None).subquery())
        ) or 0
        sites = list(self.db.scalars(query.order_by(Site.name).offset(skip).limit(limit)))
        return sites, total

    def authorized_site_ids(self, user_id: UUID) -> list[UUID]:
        return list(
            self.db.scalars(
                select(Inspection.site_id)
                .where(Inspection.assigned_to == user_id)
                .distinct()
            )
        )

    def create(self, site: Site) -> Site:
        self.db.add(site)
        flush_changes(self.db)
        return site
