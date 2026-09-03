"""Unit-of-work helpers: every aggregate query is owner scoped."""

import hashlib
import json
from collections.abc import Callable
from datetime import date
from typing import NoReturn
from uuid import UUID

from fastapi import HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from .clock import clock
from .domain import local_date
from .models import MODELS, Aggregate, Audit, Idempotency, User


def problem(status: int, detail: str) -> NoReturn:
    raise HTTPException(status_code=status, detail=detail)


def today(user: User) -> date:
    return local_date(clock.now(), user.profile["timezone"])


def uid(value) -> UUID:
    try:
        return UUID(str(value))
    except (ValueError, TypeError):
        problem(404, "Registro não encontrado")
    raise AssertionError


def rows(db: Session, user: User, kind: str) -> list[Aggregate]:
    model = MODELS[kind]
    return list(
        db.scalars(select(model).where(model.owner_id == user.id).order_by(model.created_at, model.id))
    )


def owned(db: Session, user: User, kind: str, identifier) -> Aggregate:
    model = MODELS[kind]
    row = db.scalar(select(model).where(model.owner_id == user.id, model.id == uid(identifier)))
    if row is None:
        problem(404, "Registro não encontrado")
    return row


def audit(db: Session, user: User, action: str, row: Aggregate, detail: dict | None = None):
    db.add(
        Audit(
            owner_id=user.id, action=action, entity_type=row.kind, entity_id=str(row.id), detail=detail or {}
        )
    )


def add(db: Session, user: User, kind: str, data: dict) -> Aggregate:
    row = MODELS[kind](owner_id=user.id, data=data)
    db.add(row)
    db.flush()
    return row


def versioned(row: Aggregate, version: int):
    if row.version != version:
        problem(409, "Registro atualizado em outra aba. Recarregue e tente novamente.")


def update(db: Session, user: User, row: Aggregate, values: dict, action="updated"):
    before = row.data
    row.data = {**before, **values}
    row.version += 1
    audit(db, user, action, row, {"before": before, "after": row.data})
    db.flush()
    return row


def public(row: Aggregate) -> dict:
    data = row.data
    for key in ["transaction_kind", "category_kind"]:
        if key in data:
            data["kind"] = data.pop(key)
    return {"id": str(row.id), **data, "version": row.version}


def idempotent(db: Session, user: User, request: Request, body: dict, command: Callable[[], dict]) -> dict:
    key = request.headers.get("Idempotency-Key", "")
    if not 8 <= len(key) <= 128:
        problem(422, "Idempotency-Key de 8 a 128 caracteres é obrigatório.")
    digest = hashlib.sha256(
        json.dumps({"path": request.url.path, "body": body}, sort_keys=True, default=str).encode()
    ).hexdigest()
    previous = db.get(Idempotency, (user.id, key))
    if previous:
        if previous.fingerprint != digest:
            problem(409, "Chave de idempotência já usada com outro conteúdo.")
        return previous.response
    response = command()
    db.add(Idempotency(owner_id=user.id, key=key, fingerprint=digest, response=response))
    db.flush()
    return response
