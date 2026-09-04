"""Owner-serialized Pomodoro; a completed focus session is exactly one tree."""

import math
from datetime import datetime, timedelta
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .clock import clock
from .db import database
from .identity import authenticated
from .models import FocusSession, User
from .store import idempotent, problem, public, today, versioned

router = APIRouter(tags=["Focus"])


class FocusStart(BaseModel):
    model_config = ConfigDict(extra="forbid")
    duration_minutes: int = Field(ge=1, le=180)
    session_kind: Literal["focus", "break"] = "focus"
    species: Literal["oak", "pine", "sakura"] = "oak"
    label: str = Field(default="", max_length=120)


class FocusCommand(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: int = Field(ge=1)


class FocusOut(BaseModel):
    id: UUID
    version: int
    session_kind: Literal["focus", "break"]
    species: Literal["oak", "pine", "sakura"]
    label: str
    duration_seconds: int
    remaining_seconds: int
    status: Literal["running", "paused", "completed", "cancelled"]
    started_at: datetime
    deadline_at: datetime | None
    finished_at: datetime | None


class FocusStats(BaseModel):
    trees: int
    minutes: int
    today_minutes: int


class FocusState(BaseModel):
    active: FocusOut | None
    server_now: datetime
    stats: FocusStats


class FocusPage(BaseModel):
    items: list[FocusOut]
    has_more: bool


def active_session(db: Session, user: User) -> FocusSession | None:
    return db.scalar(
        select(FocusSession).where(
            FocusSession.owner_id == user.id, FocusSession.status.in_(["running", "paused"])
        )
    )


def settle(row: FocusSession, now: datetime) -> bool:
    if row.status != "running" or row.deadline_at is None or row.deadline_at > now:
        return False
    row.status = "completed"
    row.finished_at = row.deadline_at
    row.remaining_seconds = 0
    row.deadline_at = None
    row.version += 1
    return True


@router.get("/focus", response_model=FocusState)
def state(user: User = Depends(authenticated), db: Session = Depends(database, scope="function")):
    completed = [
        FocusSession.owner_id == user.id,
        FocusSession.status == "completed",
        FocusSession.session_kind == "focus",
    ]
    trees, seconds = db.execute(
        select(func.count(), func.coalesce(func.sum(FocusSession.duration_seconds), 0)).where(*completed)
    ).one()
    start_day = datetime.combine(today(user), datetime.min.time(), ZoneInfo(user.profile["timezone"]))
    day_seconds = (
        db.scalar(
            select(func.coalesce(func.sum(FocusSession.duration_seconds), 0)).where(
                *completed, FocusSession.finished_at >= start_day
            )
        )
        or 0
    )
    active = active_session(db, user)
    return {
        "active": public(active) if active else None,
        "server_now": clock.now(),
        "stats": {"trees": trees, "minutes": seconds // 60, "today_minutes": day_seconds // 60},
    }


@router.get("/focus/history", response_model=FocusPage)
def history(
    garden: bool = False,
    offset: int = Query(default=0, ge=0, le=100000),
    user: User = Depends(authenticated),
    db: Session = Depends(database, scope="function"),
):
    query = select(FocusSession).where(
        FocusSession.owner_id == user.id, FocusSession.status.in_(["completed", "cancelled"])
    )
    if garden:
        query = query.where(FocusSession.status == "completed", FocusSession.session_kind == "focus")
    items = list(
        db.scalars(
            query.order_by(FocusSession.finished_at.desc(), FocusSession.id.desc()).offset(offset).limit(25)
        )
    )
    return {"items": [public(row) for row in items[:24]], "has_more": len(items) > 24}


@router.post("/focus/start", response_model=FocusOut, status_code=201)
def start(
    body: FocusStart,
    request: Request,
    user: User = Depends(authenticated),
    db: Session = Depends(database, scope="function"),
):
    def create():
        now = clock.now()
        active = active_session(db, user)
        if active and not settle(active, now):
            problem(409, "Já existe uma sessão de foco ou intervalo em andamento.")
        db.flush()
        row = FocusSession(
            owner_id=user.id,
            session_kind=body.session_kind,
            species=body.species,
            label=body.label.strip(),
            duration_seconds=body.duration_minutes * 60,
            remaining_seconds=body.duration_minutes * 60,
            status="running",
            started_at=now,
            deadline_at=now + timedelta(minutes=body.duration_minutes),
            finished_at=None,
        )
        db.add(row)
        db.flush()
        return public(row)

    return idempotent(db, user, request, body.model_dump(), create)


@router.post("/focus/{identifier}/{action}", response_model=FocusOut)
def command(
    identifier: UUID,
    action: Literal["pause", "resume", "complete", "cancel"],
    body: FocusCommand,
    user: User = Depends(authenticated),
    db: Session = Depends(database, scope="function"),
):
    row = db.scalar(
        select(FocusSession).where(FocusSession.owner_id == user.id, FocusSession.id == identifier)
    )
    if row is None:
        problem(404, "Registro não encontrado")
    if action == "complete" and row.status == "completed":
        return public(row)
    versioned(row, body.version)
    now = clock.now()
    if settle(row, now):
        db.flush()
        return public(row)
    if row.status not in ["running", "paused"]:
        problem(409, "Esta sessão já foi encerrada.")
    if action == "complete":
        problem(409, "O tempo de foco ainda não terminou.")
    if action == "pause":
        if row.status != "running" or row.deadline_at is None:
            problem(409, "A sessão já está pausada.")
        row.remaining_seconds = math.ceil((row.deadline_at - now).total_seconds())
        row.deadline_at = None
        row.status = "paused"
    elif action == "resume":
        if row.status != "paused":
            problem(409, "A sessão já está em andamento.")
        row.deadline_at = now + timedelta(seconds=row.remaining_seconds)
        row.status = "running"
    else:
        row.status = "cancelled"
        row.finished_at = now
        row.deadline_at = None
    row.version += 1
    db.flush()
    return public(row)
