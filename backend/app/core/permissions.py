from typing import Literal, Protocol
from uuid import UUID

Role = Literal["ADMIN", "INSPECTOR"]


class Actor(Protocol):
    id: UUID
    role: str


def is_admin(actor: Actor) -> bool:
    return actor.role == "ADMIN"


def can_access_user_resource(actor: Actor, resource_user_id: UUID) -> bool:
    return is_admin(actor) or actor.id == resource_user_id


def can_access_inspection(actor: Actor, assigned_to: UUID) -> bool:
    return is_admin(actor) or assigned_to == actor.id
