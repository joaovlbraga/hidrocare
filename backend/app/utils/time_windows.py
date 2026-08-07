from datetime import date, datetime, time, timedelta


def get_clinical_shift_window(target_date: date) -> tuple[datetime, datetime]:
    """
    Returns the 24-hour clinical shift window for a given date.
    The hospital shift runs from 07:00:00 on target_date to 06:59:59.999999 (07:00) the following day.
    """
    start = datetime.combine(target_date, time(7, 0, 0))
    end = datetime.combine(target_date + timedelta(days=1), time(7, 0, 0))
    return start, end


def is_shift_closed(occurred_at: datetime, *, now: datetime | None = None) -> bool:
    """True if occurred_at belongs to a shift that has already rolled over.

    A shift is considered 'closed' once the wall clock is at or past 07:00 on
    the calendar day *after* the shift window that contains occurred_at.

    occurred_at is expected to be a naive datetime (no timezone info), consistent
    with the comparison convention used throughout balances.py and vitals.py.
    """
    if now is None:
        now = datetime.now()

    # Strip timezone if present so naive/aware comparisons are consistent.
    if occurred_at.tzinfo is not None:
        occurred_at = occurred_at.replace(tzinfo=None)
    if now.tzinfo is not None:
        now = now.replace(tzinfo=None)

    # Derive the shift's target_date from occurred_at.
    # If the time is >= 07:00 the record belongs to the shift that started on that day.
    # If the time is < 07:00 the record belongs to the shift that started the previous day.
    if occurred_at.time() >= time(7, 0):
        shift_date = occurred_at.date()
    else:
        shift_date = occurred_at.date() - timedelta(days=1)

    _, window_end = get_clinical_shift_window(shift_date)
    return now >= window_end

