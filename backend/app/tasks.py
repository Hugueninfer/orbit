from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .db import database
from .identity import authenticated
from .models import User
from .resources import representation
from .responses import Ok, TaskOut
from .schemas import Reorder
from .store import owned, problem, rows, update, versioned

router = APIRouter()


@router.post("/tasks/reorder", response_model=list[TaskOut])
def reorder(body: Reorder, user: User = Depends(authenticated), db: Session = Depends(database)):
    owned(db, user, "task_list", body.list_id)
    current = [
        r for r in rows(db, user, "task") if r.data["list_id"] == str(body.list_id) and not r.data["archived"]
    ]
    ids = [str(i.id) for i in body.items]
    if len(ids) != len(set(ids)) or set(ids) != {str(r.id) for r in current}:
        problem(422, "Inclua todas as tarefas ativas da mesma lista, uma vez cada.")
    result = []
    for position, item in enumerate(body.items):
        row = owned(db, user, "task", item.id)
        versioned(row, item.version)
        update(db, user, row, {"position": position}, "reordered")
        result.append(representation(db, user, row))
    return result


@router.delete("/tasks/{identifier}", response_model=Ok)
def archive(identifier: str, user: User = Depends(authenticated), db: Session = Depends(database)):
    row = owned(db, user, "task", identifier)
    update(db, user, row, {"archived": True}, "archived")
    return {"ok": True}
