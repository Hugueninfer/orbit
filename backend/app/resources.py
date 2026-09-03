from copy import deepcopy
from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, Depends, Request
from pydantic import create_model
from sqlalchemy.orm import Session

from .clock import clock
from .db import database
from .domain import schedule_at
from .identity import authenticated
from .models import User
from .responses import RESPONSES
from .schemas import CREATES, PATCH_FIELDS, Input
from .store import add, audit, idempotent, owned, problem, public, rows, today, update, versioned

router = APIRouter()
PATHS = {
    "task_list": "task-lists",
    "task": "tasks",
    "habit": "habits",
    "account": "accounts",
    "category": "categories",
    "transaction": "transactions",
    "recurrence": "recurrences",
    "card": "cards",
    "exercise": "exercises",
    "routine": "routines",
}


def validate_refs(db, user, kind, data):
    if "currency" in data and data["currency"] != user.profile["currency"]:
        problem(422, "O núcleo utiliza uma moeda por usuário; use a moeda do perfil")
    for field, target in [
        ("list_id", "task_list"),
        ("account_id", "account"),
        ("payment_account_id", "account"),
        ("category_id", "category"),
    ]:
        if data.get(field):
            ref = owned(db, user, target, data[field])
            if ref.data.get("archived"):
                problem(422, "Registro relacionado arquivado")
            if target == "account" and "currency" in data and ref.data["currency"] != data["currency"]:
                problem(422, "A moeda deve ser igual à moeda da conta")
            if target == "category" and ref.data["category_kind"] != data.get(
                "kind", data.get("transaction_kind", "expense")
            ):
                problem(422, "Categoria incompatível com o tipo de movimento")
    if (
        kind == "task"
        and data.get("start_date")
        and data.get("due_date")
        and data["start_date"] > data["due_date"]
    ):
        problem(422, "Início deve ser anterior ou igual ao prazo")
    if kind == "routine":
        exercises = []
        for value in data["exercises"]:
            ref = owned(db, user, "exercise", value["exercise_id"])
            if ref.data["archived"]:
                problem(422, "Exercício arquivado")
            exercises.append({**value, "name": ref.data["name"], "muscle_group": ref.data["muscle_group"]})
        data["exercises"] = exercises


def prepare(db, user, kind, data):
    data = deepcopy(data)
    validate_refs(db, user, kind, data)
    if kind in {"category", "transaction", "recurrence"}:
        data["category_kind" if kind == "category" else "transaction_kind"] = data.pop("kind")
    if kind in {"task_list", "task"}:
        data["position"] = len(rows(db, user, kind))
    if kind == "task":
        data.update(status="todo", completed_at=None)
    if kind == "habit":
        schedule = data.pop("schedule")
        schedule["effective_date"] = today(user).isoformat()
        data.update(schedules=[schedule], created_date=today(user).isoformat())
    if kind == "transaction":
        data.update(transfer_id=None, invoice_id=None, recurrence_id=None, reversal_of=None)
    if kind == "recurrence":
        data["active"] = True
    if kind == "exercise":
        data["is_global"] = False
    if kind not in {"transaction", "recurrence"}:
        data["archived"] = False
    return data


def representation(db, user, row):
    data = public(row)
    if row.kind == "task":
        data["is_overdue"] = bool(
            data["due_date"]
            and data["due_date"] < today(user).isoformat()
            and data["status"] in {"todo", "in_progress"}
        )
    if row.kind == "habit":
        data["schedule"] = {
            k: v for k, v in schedule_at(data.pop("schedules"), today(user)).items() if k != "effective_date"
        }
    if row.kind == "account":
        from .finance import account_balances

        data.update(account_balances(db, user, row))
    if row.kind == "transaction":
        data["is_overdue"] = data["status"] == "planned" and data["date"] < today(user).isoformat()
    return data


def create_resource(db, user, kind, data):
    row = add(db, user, kind, prepare(db, user, kind, data))
    audit(db, user, "created", row)
    return representation(db, user, row)


def patch_resource(db, user, kind, identifier, body):
    row = owned(db, user, kind, identifier)
    versioned(row, body["version"])
    changes = {k: v for k, v in body.items() if k != "version"}
    if any(
        v is None
        and k
        not in {
            "due_date",
            "start_date",
            "estimate_minutes",
            "category_id",
            "limit_amount",
            "payment_account_id",
        }
        for k, v in changes.items()
    ):
        problem(422, "Campo não aceita valor nulo")
    if kind == "transaction" and row.data["status"] != "planned":
        problem(409, "Movimento realizado é imutável; use estorno auditável.")
    if kind == "exercise" and row.data["is_global"]:
        problem(403, "Exercício do catálogo global é somente leitura")
    merged = {**public(row), **changes}
    create_fields = CREATES[kind].model_fields
    check_data = {k: v for k, v in merged.items() if k in create_fields}
    if kind == "routine":
        check_data["exercises"] = [
            {k: v for k, v in e.items() if k not in {"name", "muscle_group"}} for e in check_data["exercises"]
        ]
    # Cancellation is a valid planned-to-cancelled transition, not a create state.
    if kind == "transaction" and check_data.get("status") == "cancelled":
        check_data["status"] = "planned"
    validated = CREATES[kind].model_validate(check_data).model_dump(mode="json")
    validate_refs(db, user, kind, validated)
    for key in list(changes):
        if key in validated:
            changes[key] = validated[key]
    if kind == "transaction" and body.get("status") == "cancelled":
        changes["status"] = "cancelled"
    if "position" in changes and changes["position"] < 0:
        problem(422, "Posição deve ser positiva ou zero")
    if kind == "task" and "status" in changes:
        if changes["status"] not in {"todo", "in_progress", "done", "cancelled"}:
            problem(422, "Estado inválido")
        changes["completed_at"] = clock.now().isoformat() if changes["status"] == "done" else None
    if kind == "habit" and "schedule" in changes:
        new_schedule = changes.pop("schedule")
        tomorrow = (today(user) + timedelta(days=1)).isoformat()
        changes["schedules"] = [s for s in row.data["schedules"] if s["effective_date"] < tomorrow] + [
            {**new_schedule, "effective_date": tomorrow}
        ]
    update(db, user, row, changes)
    return representation(db, user, row)


def register(kind, path):
    schema = CREATES[kind]
    patch_fields = {
        name: (field.annotation | None, None)
        for name, field in schema.model_fields.items()
        if name in PATCH_FIELDS[kind]
    }
    extras = {"archived": bool, "active": bool, "position": int, "status": str}
    for name in PATCH_FIELDS[kind] - set(patch_fields):
        patch_fields[name] = (extras[name] | None, None)
    if kind == "transaction":
        patch_fields["status"] = (Literal["planned", "posted", "cancelled"] | None, None)
    patch_schema = create_model(
        schema.__name__.replace("Create", "Patch"), __base__=Input, version=(int, ...), **patch_fields
    )

    def listing(request: Request, user: User = Depends(authenticated), db: Session = Depends(database)):
        result = []
        filters = request.query_params
        for row in rows(db, user, kind):
            value = representation(db, user, row)
            if value.get("archived", False) and filters.get("archived") != "true":
                continue
            if any(
                key in filters and str(value.get(key)) != filters[key]
                for key in ["list_id", "account_id", "kind", "status", "priority"]
            ):
                continue
            if "tag" in filters and filters["tag"] not in value.get("tags", []):
                continue
            day = value.get("date", value.get("due_date"))
            if any(
                key in filters
                and (
                    day is None
                    or (day < filters[key] if key in {"due_from", "from_date"} else day > filters[key])
                )
                for key in ["due_from", "due_to", "from_date", "to_date"]
            ):
                continue
            result.append(value)
        return sorted(result, key=lambda x: x.get("position", 0))

    def creating(
        body, request: Request, user: User = Depends(authenticated), db: Session = Depends(database)
    ):
        data = body.model_dump(mode="json")
        if kind == "transaction":
            return idempotent(db, user, request, data, lambda: create_resource(db, user, kind, data))
        return create_resource(db, user, kind, data)

    def getting(identifier: str, user: User = Depends(authenticated), db: Session = Depends(database)):
        return representation(db, user, owned(db, user, kind, identifier))

    def patching(identifier: str, body, user: User = Depends(authenticated), db: Session = Depends(database)):
        return patch_resource(db, user, kind, identifier, body.model_dump(mode="json", exclude_unset=True))

    creating.__annotations__["body"] = schema
    patching.__annotations__["body"] = patch_schema
    router.add_api_route(
        "/" + path, listing, methods=["GET"], name=f"list_{kind}", response_model=list[RESPONSES[kind]]
    )
    router.add_api_route(
        "/" + path,
        creating,
        methods=["POST"],
        status_code=201,
        name=f"create_{kind}",
        response_model=RESPONSES[kind],
    )
    router.add_api_route(
        "/" + path + "/{identifier}",
        getting,
        methods=["GET"],
        name=f"get_{kind}",
        response_model=RESPONSES[kind],
    )
    router.add_api_route(
        "/" + path + "/{identifier}",
        patching,
        methods=["PATCH"],
        name=f"patch_{kind}",
        response_model=RESPONSES[kind],
    )


for kind, path in PATHS.items():
    register(kind, path)
