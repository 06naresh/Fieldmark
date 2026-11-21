import threading
from uuid import uuid4

from sqlalchemy import text


def test_change_positions_follow_commit_order(migrated_engine):
    """A later transaction cannot allocate and commit a cursor before an earlier one."""
    first_inserted = threading.Event()
    second_inserted = threading.Event()
    release_first = threading.Event()
    release_second = threading.Event()
    positions: dict[str, int] = {}
    errors: dict[str, Exception] = {}

    def insert_change(name: str, inserted: threading.Event, release: threading.Event) -> None:
        try:
            with migrated_engine.connect() as connection:
                with connection.begin():
                    position = connection.execute(
                        text(
                            "INSERT INTO sync_changes "
                            "(entity_type, entity_id, change_type, entity_version, payload) "
                            "VALUES ('SITE', :entity_id, 'UPDATE', 1, '{}'::jsonb) "
                            "RETURNING change_position"
                        ),
                        {"entity_id": uuid4()},
                    ).scalar_one()
                    positions[name] = position
                    inserted.set()
                    assert release.wait(timeout=15), f"{name} was not released"
        except Exception as exc:  # pragma: no cover - surfaced by the assertions below.
            errors[name] = exc

    first = threading.Thread(
        target=insert_change,
        args=("first", first_inserted, release_first),
        name="first-change-writer",
    )
    second = threading.Thread(
        target=insert_change,
        args=("second", second_inserted, release_second),
        name="second-change-writer",
    )

    first.start()
    try:
        assert first_inserted.wait(timeout=10), errors.get("first")
        second.start()

        # The second writer is blocked on the advisory lock held by the first
        # transaction, so it cannot receive a position until the first commits.
        assert not second_inserted.wait(timeout=1.5)
    finally:
        release_first.set()

    first.join(timeout=15)
    try:
        assert second_inserted.wait(timeout=10), errors.get("second")
    finally:
        release_second.set()

    second.join(timeout=15)

    assert not errors, errors
    assert not first.is_alive()
    assert not second.is_alive()
    assert positions["second"] > positions["first"]

    with migrated_engine.connect() as connection:
        committed_positions = connection.execute(
            text("SELECT change_position FROM sync_changes ORDER BY change_position")
        ).scalars().all()

    assert committed_positions == sorted(committed_positions)
    assert positions["first"] in committed_positions
    assert positions["second"] in committed_positions
