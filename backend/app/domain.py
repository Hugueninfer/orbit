"""Pure calendar, money and workout rules. Callers supply local dates explicitly."""

from calendar import monthrange
from copy import deepcopy
from datetime import date, datetime, timedelta
from decimal import Decimal
from uuid import uuid4
from zoneinfo import ZoneInfo


def local_date(instant: datetime, timezone: str) -> date:
    return instant.astimezone(ZoneInfo(timezone)).date()


def month_date(year: int, month: int, day: int) -> date:
    return date(year, month, min(day, monthrange(year, month)[1]))


def add_months(value: date, months: int, day: int | None = None) -> date:
    index = value.year * 12 + value.month - 1 + months
    return month_date(index // 12, index % 12 + 1, day or value.day)


def split_installments(amount: int, count: int) -> list[int]:
    if amount <= 0 or count <= 0 or count > amount or count > 120:
        raise ValueError("Parcelas devem ser positivas, até 120, e não exceder o total em centavos.")
    base, remainder = divmod(amount, count)
    return [base + (i < remainder) for i in range(count)]


def billing_cycle(purchase_date: date, close_day: int, due_day: int) -> tuple[date, date]:
    close = month_date(purchase_date.year, purchase_date.month, close_day)
    if purchase_date > close:
        close = add_months(close, 1, close_day)
    due = month_date(close.year, close.month, due_day)
    if due <= close:
        due = add_months(due, 1, due_day)
    return close, due


def schedule_at(schedules: list[dict], day: date) -> dict:
    eligible = [s for s in schedules if s["effective_date"] <= day.isoformat()]
    return eligible[-1] if eligible else {"kind": "weekdays", "weekdays": [], "times_per_week": 1}


def habit_stats(
    start: date,
    today: date,
    schedules: list[dict],
    checkins: dict[str, int],
    target: int,
    week_start: int = 0,
) -> dict:
    calendar: list[dict] = []
    day = start
    while day <= today:
        schedule = schedule_at(schedules, day)
        scheduled = schedule["kind"] != "weekdays" or day.weekday() in schedule["weekdays"]
        quantity = checkins.get(day.isoformat(), 0)
        effective_target = schedule.get("target_quantity", target)
        calendar.append(
            {
                "date": day.isoformat(),
                "scheduled": scheduled,
                "quantity": quantity,
                "target": effective_target,
                "completed": quantity >= effective_target,
            }
        )
        day += timedelta(days=1)
    # Keep different schedule units separate. Changing daily ↔ weekly starts a
    # new current streak; historical adherence retains each day's original mode.
    segments: list[tuple[bool, list[dict]]] = []
    for entry in calendar:
        mode = schedule_at(schedules, date.fromisoformat(entry["date"]))["kind"] == "times_per_week"
        if not segments or segments[-1][0] != mode:
            segments.append((mode, []))
        segments[-1][1].append(entry)
    total = completed = current = 0
    best_by_mode = {False: 0, True: 0}
    previous_mode = None
    for mode, entries in segments:
        if previous_mode is not None and mode != previous_mode:
            current = 0
        previous_mode = mode
        outcomes: list[tuple[bool, bool]] = []
        if mode:
            weeks: dict[date, list[dict]] = {}
            for entry in entries:
                day = date.fromisoformat(entry["date"])
                week = day - timedelta(days=(day.weekday() - week_start) % 7)
                weeks.setdefault(week, []).append(entry)
            for week, days in weeks.items():
                first = date.fromisoformat(days[0]["date"])
                schedule = schedule_at(schedules, first)
                # Initial partial weeks cannot require more than available days.
                available = 7 - max(0, (max(first, start) - week).days)
                required = min(schedule["times_per_week"], available)
                hits = sum(day["completed"] for day in days)
                total += required
                completed += min(hits, required)
                outcomes.append((hits >= required, week + timedelta(days=6) < today))
        else:
            for entry in entries:
                if entry["scheduled"]:
                    total += 1
                    completed += int(entry["completed"])
                    outcomes.append((entry["completed"], entry["date"] < today.isoformat()))
        for success, closed in outcomes:
            if success:
                current += 1
                best_by_mode[mode] = max(best_by_mode[mode], current)
            elif closed:
                current = 0
    weekly = schedule_at(schedules, today)["kind"] == "times_per_week"
    best = best_by_mode[weekly]
    return {
        "current_streak": current,
        "best_streak": best,
        "streak_unit": "weeks" if weekly else "days",
        "adherence": round(completed / total * 100, 1) if total else 0,
        "completed": completed,
        "total": total,
        "calendar": calendar,
    }


def session_snapshot(exercises: list[dict]) -> list[dict]:
    result = []
    for ex in deepcopy(exercises):
        count = ex.pop("sets")
        load, reps = ex.pop("load"), ex.pop("reps")
        ex["sets"] = [
            {
                "id": str(uuid4()),
                "position": i,
                "load": str(load),
                "reps": reps,
                "type": "normal",
                "rpe": None,
                "rir": None,
                "completed_at": None,
                "is_pr": False,
            }
            for i in range(count)
        ]
        result.append(ex)
    return result


def workout_metrics(exercises: list[dict], previous: dict[str, Decimal]) -> tuple[str, int]:
    volume = Decimal(0)
    prs = 0
    best = dict(previous)
    for ex in exercises:
        for item in ex["sets"]:
            item["is_pr"] = False
            if not item["completed_at"]:
                continue
            load = Decimal(str(item["load"]))
            volume += load * item["reps"]
            if item["type"] != "warmup" and load > best.get(ex["exercise_id"], Decimal(-1)):
                item["is_pr"] = True
                prs += 1
                best[ex["exercise_id"]] = load
    return format(volume.normalize(), "f"), prs
