from datetime import date, datetime, time, timedelta


def get_clinical_shift_window(target_date: date) -> tuple[datetime, datetime]:
    """
    Returns the 24-hour clinical shift window for a given date.
    The hospital shift runs from 07:00:00 on target_date to 06:59:59.999999 (07:00) the following day.
    """
    start = datetime.combine(target_date, time(7, 0, 0))
    end = datetime.combine(target_date + timedelta(days=1), time(7, 0, 0))
    return start, end
