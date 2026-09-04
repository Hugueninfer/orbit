"""Fictional, offline-only focus examples for the immutable demo fixture."""

from datetime import timedelta

from .clock import clock
from .models import FocusCollection, FocusSession


def seed_focus(db, user):
    variants = list(range(10))
    for index, (offset, minutes, _species, label) in enumerate(
        [
            (1, 25, "sakura", "Ler um capítulo sem olhar o celular"),
            (1, 45, "oak", "Tirar uma ideia do papel"),
            (2, 25, "pine", "Estudar alemão"),
            (3, 60, "oak", "Projeto secreto do Homem-Aranha"),
            (4, 25, "sakura", "Planejar a próxima aventura"),
            (5, 45, "pine", "Organizar a semana com calma"),
            (6, 25, "oak", "Revisar anotações da faculdade"),
            (7, 45, "pine", "Desenhar o próximo projeto"),
            (8, 25, "sakura", "Aprender uma receita nova"),
            (9, 25, "oak", "Uma manhã sem distrações"),
        ]
    ):
        end = clock.now() - timedelta(days=offset, hours=minutes // 25)
        db.add(
            FocusSession(
                owner_id=user.id,
                species=("oak", "pine", "sakura")[variants[index] % 3],
                variant_id=variants[index],
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
    db.add(FocusCollection(owner_id=user.id, used=variants, last_variant=variants[0], cycle=1))
    db.flush()
