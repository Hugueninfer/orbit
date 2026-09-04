"""Fictional, offline-only focus examples for the immutable demo fixture."""

from datetime import timedelta

from .clock import clock
from .models import FocusSession


def seed_focus(db, user):
    for offset, minutes, species, label in [
        (1, 25, "sakura", "Ler um capítulo sem olhar o celular"),
        (1, 45, "oak", "Tirar uma ideia do papel"),
        (2, 25, "pine", "Estudar alemão"),
        (3, 60, "oak", "Projeto secreto do Homem-Aranha"),
        (4, 25, "sakura", "Planejar a próxima aventura"),
        (5, 45, "pine", "Organizar a semana com calma"),
    ]:
        end = clock.now() - timedelta(days=offset, hours=minutes // 25)
        db.add(
            FocusSession(
                owner_id=user.id,
                species=species,
                label=label,
                session_kind="focus",
                duration_seconds=minutes * 60,
                remaining_seconds=0,
                status="completed",
                started_at=end - timedelta(minutes=minutes),
                deadline_at=None,
                finished_at=end,
            )
        )
    db.flush()
