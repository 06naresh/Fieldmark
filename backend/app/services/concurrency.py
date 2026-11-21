from app.core.exceptions import ConflictError


def check_version(current: int, expected: int, resource: str = "resource") -> None:
    if current != expected:
        raise ConflictError(
            f"The {resource} has changed. Reload it and submit the current version."
        )
