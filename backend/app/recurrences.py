"""Stable recurrence occurrence identity and future-only rule reconciliation."""

from datetime import date, timedelta

from .config import settings
from .domain import add_months, month_date
from .store import problem, rows, today, update


def cycle_bucket(rule: dict, scheduled: date) -> int:
    """Frequency periods anchored to the original start, independent of edited due dates."""
    start = date.fromisoformat(rule["start_date"])
    frequency, interval = rule["frequency"], rule["interval"]
    if frequency == "monthly":
        return ((scheduled.year - start.year) * 12 + scheduled.month - start.month) // interval
    if frequency == "yearly":
        return (scheduled.year - start.year) // interval
    width = interval * (7 if frequency == "weekly" else 1)
    return (scheduled - start).days // width


def protected_cycles(rule: dict, occurrences: list) -> set[int]:
    return {
        cycle_bucket(rule, date.fromisoformat(item.data["scheduled_date"]))
        for item in occurrences
        if item.data["status"] == "posted"
        or (item.data["status"] == "cancelled" and not item.data["recurrence_superseded"])
    }


def occurrence_dates(rule: dict, through: date) -> list[date]:
    start = date.fromisoformat(rule["start_date"])
    effective = date.fromisoformat(rule["schedule_effective_date"])
    end = min(through, date.fromisoformat(rule["end_date"])) if rule["end_date"] else through
    if (through - start).days > 3660:
        problem(422, "Recorrência anterior ao horizonte máximo histórico de dez anos")
    if not rule["active"] or end < start:
        return []
    frequency, interval = rule["frequency"], rule["interval"]
    cursor = start
    if frequency in {"monthly", "yearly"}:
        cursor = month_date(start.year, start.month, rule["day_of_month"])
        if cursor < start:
            cursor = add_months(
                cursor, interval if frequency == "monthly" else 12 * interval, rule["day_of_month"]
            )
    result = []
    while cursor <= end:
        if cursor >= effective:
            result.append(cursor)
        if frequency == "daily":
            cursor += timedelta(days=interval)
        elif frequency == "weekly":
            cursor += timedelta(weeks=interval)
        else:
            cursor = add_months(
                cursor, interval if frequency == "monthly" else 12 * interval, rule["day_of_month"]
            )
    return result


def extend_recurrence(db, user, recurrence, through: date) -> int:
    from .finance import transaction

    if through > today(user) + timedelta(days=366):
        problem(422, "Horizonte máximo de 366 dias")
    d = recurrence.data
    occurrences = [
        item for item in rows(db, user, "transaction") if item.data["recurrence_id"] == str(recurrence.id)
    ]
    existing = {item.data["scheduled_date"] for item in occurrences}
    protected = protected_cycles(d, occurrences)
    created = 0
    for scheduled in occurrence_dates(d, through):
        if scheduled.isoformat() in existing or cycle_bucket(d, scheduled) in protected:
            continue
        transaction(
            db,
            user,
            account_id=d["account_id"],
            category_id=d["category_id"],
            transaction_kind=d["transaction_kind"],
            amount=d["amount"],
            currency=d["currency"],
            description=d["description"],
            date=scheduled.isoformat(),
            status="planned",
            recurrence_id=str(recurrence.id),
            scheduled_date=scheduled.isoformat(),
        )
        created += 1
    if through.isoformat() > d["generated_through"]:
        recurrence.data = {**recurrence.data, "generated_through": through.isoformat()}
        db.flush()
    return created


def initial_horizon(db, user, recurrence):
    return extend_recurrence(
        db, user, recurrence, today(user) + timedelta(days=settings().recurrence_horizon_days)
    )


def revise_recurrence(db, user, recurrence, changes):
    changed_schedule = any(
        key in changes and changes[key] != recurrence.data[key]
        for key in ["frequency", "interval", "day_of_month", "end_date", "active"]
    )
    if changed_schedule:
        changes["schedule_effective_date"] = (today(user) + timedelta(days=1)).isoformat()
    horizon = date.fromisoformat(recurrence.data["generated_through"])
    update(db, user, recurrence, changes, "recurrence_rule_updated")
    rule = recurrence.data
    occurrences = [
        item for item in rows(db, user, "transaction") if item.data["recurrence_id"] == str(recurrence.id)
    ]
    protected = protected_cycles(rule, occurrences)
    valid = {
        value.isoformat()
        for value in occurrence_dates(rule, horizon)
        if cycle_bucket(rule, value) not in protected
    }
    for item in rows(db, user, "transaction"):
        value = item.data
        if value["recurrence_id"] != str(recurrence.id) or value["date"] <= today(user).isoformat():
            continue
        # User cancellations are tombstones; a rule edit may revive only rows it superseded.
        if value["status"] != "planned" and not (
            value["status"] == "cancelled" and value["recurrence_superseded"]
        ):
            continue
        if value["scheduled_date"] not in valid:
            if value["status"] == "planned":
                update(
                    db,
                    user,
                    item,
                    {"status": "cancelled", "recurrence_superseded": True},
                    "recurrence_occurrence_superseded",
                )
        else:
            template = {
                key: rule[key]
                for key in [
                    "account_id",
                    "category_id",
                    "transaction_kind",
                    "amount",
                    "currency",
                    "description",
                ]
            }
            update(
                db,
                user,
                item,
                {**template, "status": "planned", "recurrence_superseded": False},
                "recurrence_occurrence_updated",
            )
    extend_recurrence(db, user, recurrence, horizon)
    return recurrence
