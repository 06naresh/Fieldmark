from app.core.security import hash_password, verify_password


def test_password_hash_uses_argon2id() -> None:
    password_hash = hash_password("StrongPassword123!")

    assert password_hash.startswith("$argon2id$")


def test_password_verification_accepts_matching_password() -> None:
    password_hash = hash_password("StrongPassword123!")

    assert verify_password("StrongPassword123!", password_hash) is True


def test_password_verification_rejects_wrong_password() -> None:
    password_hash = hash_password("StrongPassword123!")

    assert verify_password("WrongPassword123!", password_hash) is False


def test_password_hashes_are_salted() -> None:
    first = hash_password("StrongPassword123!")
    second = hash_password("StrongPassword123!")

    assert first != second
