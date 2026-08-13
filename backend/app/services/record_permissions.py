from app.security import assert_can_mutate_record, assert_owns_record


def assert_can_edit(record, current_user) -> None:
    assert_can_mutate_record(record.occurred_at, current_user)
    assert_owns_record(record.registered_by_id, current_user)
