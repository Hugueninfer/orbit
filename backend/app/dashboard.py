from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .db import database
from .domain import add_months, local_date
from .finance import invoice_data, report_data
from .habits import statistics
from .identity import authenticated, profile
from .models import User
from .resources import representation
from .responses import DashboardOut
from .store import rows, today
from .workouts import session_data

router = APIRouter()


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(
    basis: Literal["cash", "accrual"] = "cash",
    user: User = Depends(authenticated),
    db: Session = Depends(database, scope="function"),
):
    day = today(user)
    tasks = [representation(db, user, r) for r in rows(db, user, "task") if not r.data["archived"]]
    habits = [
        {**representation(db, user, r), "stats": statistics(db, user, r)}
        for r in rows(db, user, "habit")
        if not r.data["archived"]
    ]
    sessions = sorted(rows(db, user, "session"), key=lambda r: r.data["started_at"], reverse=True)
    routines = [r for r in rows(db, user, "routine") if not r.data["archived"]]
    return {
        "today": day.isoformat(),
        "profile": profile(user),
        "tasks": tasks,
        "habits": habits,
        "accounts": [
            representation(db, user, r) for r in rows(db, user, "account") if not r.data["archived"]
        ],
        "cards": [representation(db, user, r) for r in rows(db, user, "card") if not r.data["archived"]],
        "invoices": [invoice_data(db, user, r) for r in rows(db, user, "invoice")],
        "active_session": next((session_data(r) for r in sessions if r.data["status"] == "active"), None),
        "last_session": next((session_data(r) for r in sessions if r.data["status"] == "finished"), None),
        "monthly": report_data(
            db, user, day.replace(day=1), add_months(day.replace(day=1), 1) - timedelta(days=1), basis
        ),
        "workout_count": sum(
            r.data["status"] == "finished"
            and local_date(
                datetime.fromisoformat(r.data["started_at"]), user.profile["timezone"]
            ).isoformat()[:7]
            == day.isoformat()[:7]
            for r in sessions
        ),
        "suggested_routine": representation(db, user, routines[0]) if routines else None,
    }
