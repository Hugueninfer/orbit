from copy import deepcopy
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from .clock import clock
from .db import database
from .domain import session_snapshot, workout_metrics
from .identity import authenticated
from .models import User
from .responses import SessionOut
from .schemas import Finish, SessionCreate, SetAdd, SetPut, Version
from .store import add, audit, idempotent, owned, problem, public, rows, update, versioned

router = APIRouter()


def session_data(row):
    data = public(row)
    data["volume"] = format(Decimal(data["volume"]).normalize(), "f")
    return data


def recompute_all(db, user):
    """Historical edits recalculate every finished session in chronological order."""
    best = {}
    sessions = sorted(rows(db, user, "session"), key=lambda r: r.data["started_at"])
    for row in sessions:
        if row.data["status"] == "cancelled":
            continue
        exercises = deepcopy(row.data["exercises"])
        volume, count = workout_metrics(exercises, best)
        row.data = {**row.data, "exercises": exercises, "volume": volume, "pr_count": count}
        if row.data["status"] == "finished":
            for exercise in exercises:
                for item in exercise["sets"]:
                    if item["completed_at"] and item["type"] != "warmup":
                        key = exercise["exercise_id"]
                        best[key] = max(best.get(key, Decimal(-1)), Decimal(item["load"]))
    db.flush()


def copy_previous(db, user, row):
    previous = [
        r
        for r in rows(db, user, "session")
        if r.id != row.id
        and r.data["routine_id"] == row.data["routine_id"]
        and r.data["status"] == "finished"
    ]
    if not previous:
        return row.data["exercises"]
    last = max(previous, key=lambda r: r.data["started_at"])
    source = {e["exercise_id"]: e for e in last.data["exercises"]}
    exercises = deepcopy(row.data["exercises"])
    for ex in exercises:
        old = source.get(ex["exercise_id"])
        if not old:
            continue
        completed = [item for item in old["sets"] if item["completed_at"]]
        for target, item in zip(ex["sets"], completed, strict=False):
            target.update(load=item["load"], reps=item["reps"], type=item["type"])
    return exercises


def start_session(db, user, routine_id, copy_last=False):
    routine = owned(db, user, "routine", routine_id)
    if routine.data["archived"]:
        problem(422, "Rotina arquivada")
    if any(r.data["status"] == "active" for r in rows(db, user, "session")):
        problem(409, "Já existe uma sessão em andamento")
    session = add(
        db,
        user,
        "session",
        {
            "routine_id": str(routine.id),
            "name": routine.data["name"],
            "status": "active",
            "started_at": clock.now().isoformat(),
            "finished_at": None,
            "notes": "",
            "volume": "0",
            "pr_count": 0,
            "exercises": session_snapshot(routine.data["exercises"]),
            "rest_until": None,
        },
    )
    if copy_last:
        session.data = {**session.data, "exercises": copy_previous(db, user, session)}
    audit(db, user, "session_started", session, {"copy_last": copy_last})
    return session_data(session)


@router.post("/sessions", status_code=201, response_model=SessionOut)
def start(
    body: SessionCreate,
    request: Request,
    user: User = Depends(authenticated),
    db: Session = Depends(database),
):
    return idempotent(
        db,
        user,
        request,
        body.model_dump(mode="json"),
        lambda: start_session(db, user, body.routine_id, body.copy_last),
    )


@router.get("/sessions", response_model=list[SessionOut])
def sessions(status: str | None = None, user: User = Depends(authenticated), db: Session = Depends(database)):
    return sorted(
        [session_data(r) for r in rows(db, user, "session") if not status or r.data["status"] == status],
        key=lambda r: r["started_at"],
        reverse=True,
    )


@router.get("/sessions/active", response_model=SessionOut | None)
def active(user: User = Depends(authenticated), db: Session = Depends(database)):
    return next((session_data(r) for r in rows(db, user, "session") if r.data["status"] == "active"), None)


@router.get("/sessions/{identifier}", response_model=SessionOut)
def session_detail(identifier: str, user: User = Depends(authenticated), db: Session = Depends(database)):
    return session_data(owned(db, user, "session", identifier))


@router.put("/sessions/{identifier}/sets/{set_id}", response_model=SessionOut)
def complete_set(
    identifier: str,
    set_id: str,
    body: SetPut,
    user: User = Depends(authenticated),
    db: Session = Depends(database),
):
    row = owned(db, user, "session", identifier)
    versioned(row, body.version)
    if row.data["status"] == "cancelled":
        problem(409, "Sessão cancelada")
    if row.data["status"] == "finished" and not body.reason.strip():
        problem(422, "Correção de histórico exige motivo")
    exercises = deepcopy(row.data["exercises"])
    target = next(((ex, item) for ex in exercises for item in ex["sets"] if item["id"] == set_id), None)
    if not target:
        problem(404, "Série não encontrada")
    ex, item = target
    completed_at = item["completed_at"] or clock.now().isoformat() if body.completed else None
    item.update(
        body.model_dump(mode="json", exclude={"version", "completed", "reason"}), completed_at=completed_at
    )
    if row.data["status"] == "finished" and not any(s["completed_at"] for e in exercises for s in e["sets"]):
        problem(422, "Treino finalizado exige pelo menos uma série concluída")
    rest = None
    if completed_at and row.data["status"] == "active":
        rest = (datetime.fromisoformat(completed_at) + timedelta(seconds=ex["rest_seconds"])).isoformat()
    update(db, user, row, {"exercises": exercises, "rest_until": rest}, "set_recorded")
    if body.reason:
        audit(db, user, "history_edit_reason", row, {"reason": body.reason, "set_id": set_id})
    recompute_all(db, user)
    return session_data(row)


@router.post("/sessions/{identifier}/sets", response_model=SessionOut)
def add_set(
    identifier: str, body: SetAdd, user: User = Depends(authenticated), db: Session = Depends(database)
):
    row = owned(db, user, "session", identifier)
    versioned(row, body.version)
    if row.data["status"] != "active":
        problem(409, "Apenas sessões em andamento aceitam novas séries")
    exercises = deepcopy(row.data["exercises"])
    exercise = next((e for e in exercises if e["exercise_id"] == str(body.exercise_id)), None)
    if exercise is None:
        problem(404, "Exercício não pertence à sessão")
    if len(exercise["sets"]) >= 30:
        problem(422, "Limite de 30 séries por exercício")
    exercise["sets"].append(
        {
            "id": str(uuid4()),
            "position": len(exercise["sets"]),
            "load": str(body.load),
            "reps": body.reps,
            "type": body.type,
            "rpe": None,
            "rir": None,
            "completed_at": None,
            "is_pr": False,
        }
    )
    update(db, user, row, {"exercises": exercises}, "set_added")
    return session_data(row)


@router.post("/sessions/{identifier}/finish", response_model=SessionOut)
def finish(
    identifier: str, body: Finish, user: User = Depends(authenticated), db: Session = Depends(database)
):
    row = owned(db, user, "session", identifier)
    versioned(row, body.version)
    if row.data["status"] != "active":
        problem(409, "Sessão não está em andamento")
    if not any(item["completed_at"] for ex in row.data["exercises"] for item in ex["sets"]):
        problem(422, "Conclua pelo menos uma série")
    update(
        db,
        user,
        row,
        {
            "status": "finished",
            "finished_at": clock.now().isoformat(),
            "notes": body.notes,
            "rest_until": None,
        },
        "session_finished",
    )
    recompute_all(db, user)
    return session_data(row)


@router.post("/sessions/{identifier}/cancel", response_model=SessionOut)
def cancel(
    identifier: str, body: Version, user: User = Depends(authenticated), db: Session = Depends(database)
):
    row = owned(db, user, "session", identifier)
    versioned(row, body.version)
    if row.data["status"] != "active":
        problem(409, "Apenas sessões em andamento podem ser canceladas")
    update(
        db,
        user,
        row,
        {"status": "cancelled", "finished_at": clock.now().isoformat(), "rest_until": None},
        "session_cancelled",
    )
    return session_data(row)


@router.post("/sessions/{identifier}/copy-last", response_model=SessionOut)
def copy_last(
    identifier: str, body: Version, user: User = Depends(authenticated), db: Session = Depends(database)
):
    row = owned(db, user, "session", identifier)
    versioned(row, body.version)
    if row.data["status"] != "active":
        problem(409, "Sessão não está em andamento")
    if any(item["completed_at"] for ex in row.data["exercises"] for item in ex["sets"]):
        problem(409, "Copie os dados antes de registrar séries nesta sessão")
    update(db, user, row, {"exercises": copy_previous(db, user, row)}, "copied_previous")
    return session_data(row)
