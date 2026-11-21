from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.database.models import Site
from app.repositories import SiteRepository
from app.schemas.sites import SiteCreate, SiteResponse, SiteStatusUpdate, SiteUpdate
from app.core.db_errors import commit_transaction
from app.services.concurrency import check_version


class SiteService:
    def __init__(self, db: Session) -> None:
        self.repository = SiteRepository(db)

    def create(self, payload: SiteCreate) -> Site:
        site = Site(
            name=payload.name,
            site_code=payload.site_code,
            address=payload.address,
            city=payload.city,
            state=payload.state,
            postal_code=payload.postal_code,
            country=payload.country,
            description=payload.description,
            is_active=True,
            version=1,
        )
        self.repository.create(site)
        self._commit()
        return site

    def list(
        self,
        *,
        is_active: bool | None,
        search: str | None,
        authorized_site_ids: list[UUID] | None,
        skip: int,
        limit: int,
    ) -> tuple[list[Site], int]:
        return self.repository.list(
            is_active=is_active,
            search=search,
            authorized_site_ids=authorized_site_ids,
            skip=skip,
            limit=limit,
        )

    def get(self, site_id: UUID) -> Site:
        site = self.repository.get(site_id)
        if site is None:
            raise NotFoundError("The requested site was not found.")
        return site

    def update(self, site_id: UUID, payload: SiteUpdate) -> Site:
        site = self.repository.get_for_update(site_id)
        if site is None:
            raise NotFoundError("The requested site was not found.")
        check_version(site.version, payload.version, "site")

        updates = payload.model_dump(exclude_unset=True, exclude={"version"})
        for field in (
            "name",
            "address",
            "city",
            "state",
            "postal_code",
            "country",
            "description",
        ):
            if field in updates:
                setattr(site, field, updates[field])
        site.version += 1
        self._commit()
        return site

    def set_status(self, site_id: UUID, payload: SiteStatusUpdate) -> Site:
        site = self.repository.get_for_update(site_id)
        if site is None:
            raise NotFoundError("The requested site was not found.")
        check_version(site.version, payload.version, "site")
        site.is_active = payload.is_active
        site.version += 1
        self._commit()
        return site

    def _commit(self) -> None:
        commit_transaction(self.repository.db)


def site_response(site: Site) -> SiteResponse:
    return SiteResponse(
        id=site.id,
        name=site.name,
        site_code=site.site_code,
        address=site.address,
        city=site.city,
        state=site.state,
        postal_code=site.postal_code,
        country=site.country,
        description=site.description,
        is_active=site.is_active,
        version=site.version,
    )
