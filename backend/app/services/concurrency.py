from app.core.exceptions import VersionConflictError


def check_version(current: int, expected: int, resource: str = "resource") -> None:
    if current != expected:
        raise VersionConflictError(
            f"The {resource} has changed. Reload it and submit the current version."
        )
