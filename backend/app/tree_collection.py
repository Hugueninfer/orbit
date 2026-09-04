"""A private draw bag per owner; resetting it never deletes earned trees."""

from secrets import choice

from pydantic import BaseModel
from sqlalchemy import select

from .models import FocusCollection
from .store import problem

CATALOG_SIZE = 10


class CollectionOut(BaseModel):
    total: int = CATALOG_SIZE
    used_count: int
    cycle: int
    version: int


def draw_variant(used: list[int], last: int | None) -> tuple[int, list[int], bool]:
    rollover = len(used) >= CATALOG_SIZE
    seen = set() if rollover else set(used)
    options = [n for n in range(CATALOG_SIZE) if n not in seen and n != last]
    variant = choice(options)
    return variant, [*sorted(seen), variant], rollover


def get_collection(db, user):
    return db.scalar(select(FocusCollection).where(FocusCollection.owner_id == user.id))


def collection_out(row):
    return {
        "total": CATALOG_SIZE,
        "used_count": len(row.used) if row else 0,
        "cycle": row.cycle if row else 1,
        "version": row.version if row else 0,
    }


def allocate_variant(db, user):
    row = get_collection(db, user)
    if row is None:
        row = FocusCollection(owner_id=user.id, used=[], last_variant=None, cycle=1)
        db.add(row)
        db.flush()
    variant, used, rollover = draw_variant(row.used, row.last_variant)
    row.used = used
    row.last_variant = variant
    row.cycle += int(rollover)
    row.version += 1
    db.flush()
    return variant


def reset_collection(db, user, version):
    row = get_collection(db, user)
    if version != (row.version if row else 0):
        problem(409, "Registro atualizado em outra aba. Recarregue e tente novamente.")
    if row is None:
        row = FocusCollection(owner_id=user.id, used=[], last_variant=None, cycle=1, version=1)
        db.add(row)
    row.used = []
    row.cycle += 1
    row.version += 1
    db.flush()
    return collection_out(row)
