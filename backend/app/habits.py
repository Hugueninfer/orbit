from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .db import database
from .domain import habit_stats
from .identity import authenticated
from .models import User
from .responses import CheckinOut, HabitStats, Ok
from .schemas import CheckinPut
from .store import add, audit, owned, problem, public, rows, today, update

router = APIRouter()


def statistics(db, user, habit, from_date=None, to_date=None):
    end = to_date or today(user)
    start = from_date or end - timedelta(days=29)
    if start > end or (end - start).days > 366 or end > today(user):
        problem(422, "Intervalo de calendário inválido; máximo 366 dias, sem datas futuras")
    checks = [r for r in rows(db, user, "checkin") if r.data["habit_id"] == str(habit.id)]
    # Streak always uses complete history; requested range limits calendar/adherence only.
    origin = date.fromisoformat(habit.data["created_date"])
    stats = habit_stats(
        max(start, origin),
        end,
        habit.data["schedules"],
        {r.data["date"]: r.data["quantity"] for r in checks},
        habit.data["target_quantity"],
        user.profile["week_start"],
    )
    full = habit_stats(
        origin,
        today(user),
        habit.data["schedules"],
        {r.data["date"]: r.data["quantity"] for r in checks},
        habit.data["target_quantity"],
        user.profile["week_start"],
    )
    for field in ["current_streak", "best_streak", "streak_unit"]:
        stats[field] = full[field]
    stats["checkins"] = [public(r) for r in checks if start.isoformat() <= r.data["date"] <= end.isoformat()]
    return stats


@router.get("/habits/{identifier}/stats", response_model=HabitStats)
def stats(
    identifier: str,
    from_date: date | None = None,
    to_date: date | None = None,
    user: User = Depends(authenticated),
    db: Session = Depends(database),
):
    return statistics(db, user, owned(db, user, "habit", identifier), from_date, to_date)


@router.get("/habits/{identifier}/checkins", response_model=list[CheckinOut])
def checkins(identifier: str, user: User = Depends(authenticated), db: Session = Depends(database)):
    habit = owned(db, user, "habit", identifier)
    return [public(r) for r in rows(db, user, "checkin") if r.data["habit_id"] == str(habit.id)]


@router.put("/habits/{identifier}/checkins/{day}", response_model=CheckinOut)
def put(
    identifier: str,
    day: date,
    body: CheckinPut,
    user: User = Depends(authenticated),
    db: Session = Depends(database),
):
    habit = owned(db, user, "habit", identifier)
    if day > today(user) or day.isoformat() < habit.data["created_date"]:
        problem(422, "Data deve estar entre a criação do hábito e hoje")
    existing = next(
        (
            r
            for r in rows(db, user, "checkin")
            if r.data["habit_id"] == str(habit.id) and r.data["date"] == day.isoformat()
        ),
        None,
    )
    values = {"habit_id": str(habit.id), "date": day.isoformat(), **body.model_dump()}
    if existing:
        update(db, user, existing, values, "checkin_updated")
    else:
        existing = add(db, user, "checkin", values)
        audit(db, user, "checkin_created", existing)
    return public(existing)


@router.delete("/habits/{identifier}/checkins/{day}", response_model=Ok)
def remove(identifier: str, day: date, user: User = Depends(authenticated), db: Session = Depends(database)):
    habit = owned(db, user, "habit", identifier)
    for row in rows(db, user, "checkin"):
        if row.data["habit_id"] == str(habit.id) and row.data["date"] == day.isoformat():
            audit(db, user, "checkin_removed", row, row.data)
            db.delete(row)
    return {"ok": True}
