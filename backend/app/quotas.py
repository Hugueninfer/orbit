"""Database-session write budgets cover every demo persistence path.

The monotonic counter counts inserted/updated rows (including audits, keys and
integration payloads), never replenishes on deletion, and resets only with the
explicit owner demo reset. Atomic SQL reservations also protect worker writes.
"""

from collections import Counter
from uuid import UUID, uuid4

from fastapi import HTTPException
from sqlalchemy import event, select, update

from .config import settings
from .models import Inbox, Outbox, User


def register_demo_budget(session_factory):
    event.listen(session_factory, "before_flush", enforce_demo_budget)


def enforce_demo_budget(session, flush_context, instances):
    changed = [
        obj
        for obj in set(session.new) | set(session.dirty)
        if obj not in session.deleted
        and (obj in session.new or session.is_modified(obj, include_collections=True))
    ]
    pending_users = {}
    for obj in session.new:
        if isinstance(obj, User):
            if obj.id is None:
                obj.id = uuid4()
            pending_users[obj.id] = obj
    counts: Counter[UUID] = Counter()
    owner_id: UUID | None
    for obj in changed:
        if isinstance(obj, User):
            owner_id = obj.id
        elif isinstance(obj, Outbox):
            inbox = next(
                (item for item in session.new if isinstance(item, Inbox) and item.id == obj.inbox_id), None
            )
            inbox = inbox or session.get(Inbox, obj.inbox_id)
            owner_id = inbox.owner_id if inbox else None
        else:
            owner_id = getattr(obj, "owner_id", None)
        if owner_id is not None:
            counts[owner_id] += 1
    limit = settings().demo_max_records
    for owner_id, count in counts.items():
        pending = pending_users.get(owner_id)
        if pending is not None:
            if pending.expires_at is not None:
                new_count = (pending.demo_write_count or 0) + count
                if new_count > limit:
                    raise HTTPException(
                        429, "Limite de gravações da demonstração atingido. Reinicie os dados."
                    )
                pending.demo_write_count = new_count
            continue
        expires = session.scalar(select(User.expires_at).where(User.id == owner_id))
        if expires is None:
            continue
        reserved = session.scalar(
            update(User)
            .where(User.id == owner_id, User.demo_write_count + count <= limit)
            .values(demo_write_count=User.demo_write_count + count)
            .returning(User.id)
            .execution_options(synchronize_session=False)
        )
        if reserved is None:
            raise HTTPException(429, "Limite de gravações da demonstração atingido. Reinicie os dados.")
