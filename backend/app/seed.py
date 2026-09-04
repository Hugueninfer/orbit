"""Deterministic relative-date demo data; each visitor owns independent records."""

from datetime import timedelta

from .clock import clock
from .finance import create_purchase, transaction
from .resources import create_resource
from .store import add, owned, today
from .workouts import recompute_all, start_session


def seed_personal(db, user):
    create_resource(db, user, "task_list", {"name": "Inbox", "color": "#8b5cf6"})
    for name, muscle, equipment in [
        ("Supino reto", "Peito", "Barra"),
        ("Agachamento livre", "Pernas", "Barra"),
        ("Remada curvada", "Costas", "Barra"),
        ("Desenvolvimento", "Ombros", "Halteres"),
        ("Rosca direta", "Bíceps", "Barra"),
        ("Prancha", "Core", "Peso corporal"),
    ]:
        add(
            db,
            user,
            "exercise",
            {
                "name": name,
                "muscle_group": muscle,
                "equipment": equipment,
                "instructions": "Execute o movimento com controle e amplitude confortável.",
                "is_global": True,
                "archived": False,
            },
        )


def build_demo_source(db, user):
    from .store import rows

    day = today(user)
    seed_personal(db, user)
    inbox = rows(db, user, "task_list")[0]
    work = create_resource(db, user, "task_list", {"name": "Trabalho", "color": "#3b82f6"})
    personal = create_resource(db, user, "task_list", {"name": "Pessoal", "color": "#22c55e"})
    task_specs = [
        ("Revisar proposta do projeto", work["id"], "high", 0, "in_progress"),
        ("Preparar apresentação de resultados", work["id"], "medium", 1, "todo"),
        ("Agendar consulta de rotina", personal["id"], "low", -1, "todo"),
        ("Ler 20 páginas", str(inbox.id), "none", 0, "todo"),
        ("Organizar planejamento semanal", str(inbox.id), "medium", 0, "done"),
    ]
    for title, list_id, priority, offset, status in task_specs:
        result = create_resource(
            db,
            user,
            "task",
            {
                "title": title,
                "list_id": list_id,
                "description": "Um próximo passo para manter tudo em órbita.",
                "priority": priority,
                "due_date": (day + timedelta(days=offset)).isoformat(),
                "start_date": None,
                "estimate_minutes": 30,
                "tags": ["planejamento"] if list_id == work["id"] else [],
                "checklist": [{"id": "step-1", "text": "Reunir informações", "done": status == "done"}],
            },
        )
        row = owned(db, user, "task", result["id"])
        row.data = {
            **row.data,
            "status": status,
            "completed_at": clock.now().isoformat() if status == "done" else None,
        }
    for index, (name, target, unit, color) in enumerate(
        [
            ("Beber água", 8, "copos", "#3b82f6"),
            ("Leitura diária", 20, "páginas", "#8b5cf6"),
            ("Meditar", 10, "minutos", "#22c55e"),
            ("Caminhar", 1, "vezes", "#f59e0b"),
        ]
    ):
        result = create_resource(
            db,
            user,
            "habit",
            {
                "name": name,
                "description": "Pequenos passos, todos os dias.",
                "color": color,
                "target_quantity": target,
                "unit": unit,
                "schedule": {"kind": "daily", "weekdays": [], "times_per_week": 1},
            },
        )
        habit = owned(db, user, "habit", result["id"])
        origin = day - timedelta(days=28)
        habit.data = {
            **habit.data,
            "created_date": origin.isoformat(),
            "schedules": [
                {"effective_date": origin.isoformat(), "kind": "daily", "weekdays": [], "times_per_week": 1}
            ],
        }
        for offset in range(28, -1, -1):
            if (offset + index) % 9 == 0 or (offset == 0 and index > 1):
                continue
            add(
                db,
                user,
                "checkin",
                {
                    "habit_id": str(habit.id),
                    "date": (day - timedelta(days=offset)).isoformat(),
                    "quantity": target if offset else max(1, target // 2),
                    "note": "",
                },
            )
    account = create_resource(
        db,
        user,
        "account",
        {
            "name": "Conta principal",
            "type": "checking",
            "currency": "BRL",
            "opening_balance": 250000,
            "color": "#8b5cf6",
        },
    )
    create_resource(
        db,
        user,
        "account",
        {
            "name": "Reserva de emergência",
            "type": "savings",
            "currency": "BRL",
            "opening_balance": 1800000,
            "color": "#3b82f6",
        },
    )
    categories = {}
    for name, kind, color in [
        ("Salário", "income", "#22c55e"),
        ("Alimentação", "expense", "#f59e0b"),
        ("Transporte", "expense", "#3b82f6"),
        ("Moradia", "expense", "#8b5cf6"),
        ("Lazer", "expense", "#ec4899"),
        ("Saúde", "expense", "#14b8a6"),
    ]:
        categories[name] = create_resource(
            db, user, "category", {"name": name, "kind": kind, "color": color}
        )["id"]
    for name, category, amount, kind, offset, status in [
        ("Salário mensal", "Salário", 850000, "income", 0, "posted"),
        ("Supermercado", "Alimentação", 42890, "expense", -1, "posted"),
        ("Almoço", "Alimentação", 4590, "expense", 0, "posted"),
        ("Combustível", "Transporte", 18500, "expense", -2, "posted"),
        ("Aluguel", "Moradia", 220000, "expense", 3, "planned"),
        ("Academia", "Saúde", 12990, "expense", 2, "planned"),
    ]:
        transaction(
            db,
            user,
            account_id=account["id"],
            category_id=categories[category],
            transaction_kind=kind,
            amount=amount,
            currency="BRL",
            description=name,
            date=(day + timedelta(days=offset)).isoformat(),
            status=status,
        )
    card = create_resource(
        db,
        user,
        "card",
        {
            "name": "Orbit Platinum",
            "last_four": "4829",
            "currency": "BRL",
            "close_day": 20,
            "due_day": 28,
            "limit_amount": 1200000,
            "payment_account_id": account["id"],
            "color": "#8b5cf6",
        },
    )
    create_purchase(
        db,
        user,
        {
            "card_id": card["id"],
            "category_id": categories["Lazer"],
            "description": "Fone de ouvido",
            "amount": 89900,
            "installment_count": 3,
            "purchase_date": (day - timedelta(days=8)).isoformat(),
        },
    )
    exercises = rows(db, user, "exercise")
    routine = create_resource(
        db,
        user,
        "routine",
        {
            "name": "Treino A — Superior",
            "description": "Força e consistência para começar a semana.",
            "exercises": [
                {
                    "exercise_id": str(e.id),
                    "sets": 3,
                    "reps": 10,
                    "load": str(30 + i * 10),
                    "rest_seconds": 90,
                }
                for i, e in enumerate(exercises[:3])
            ],
        },
    )
    create_resource(
        db,
        user,
        "routine",
        {
            "name": "Treino B — Inferior",
            "description": "Foco em pernas e estabilidade.",
            "exercises": [
                {"exercise_id": str(exercises[1].id), "sets": 4, "reps": 8, "load": "60", "rest_seconds": 120}
            ],
        },
    )
    for offset in [12, 9, 5, 2]:
        result = start_session(db, user, routine["id"])
        session = owned(db, user, "session", result["id"])
        instant = clock.now() - timedelta(days=offset)
        values = session.data
        for ex in values["exercises"]:
            for item in ex["sets"]:
                item["completed_at"] = instant.isoformat()
        session.data = {
            **values,
            "status": "finished",
            "started_at": instant.isoformat(),
            "finished_at": (instant + timedelta(minutes=48)).isoformat(),
        }
        db.flush()
    # Prepared note examples are exported offline with the rest of the demo base.
    from .note_document import plain_text

    school = add(db, user, "note_folder", {"name": "Faculdade", "color": "#7692ff"})
    gifts = add(db, user, "note_folder", {"name": "Presentes", "color": "#ea8dba"})
    examples = [
        (
            "Pequenos passos, boas ideias",
            None,
            day,
            True,
            {
                "type": "doc",
                "content": [
                    {
                        "type": "heading",
                        "attrs": {"level": 2},
                        "content": [{"type": "text", "text": "Um momento para desacelerar"}],
                    },
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": "Hoje tirei um tempo para organizar as ideias. Às vezes, escrever é tudo que preciso para enxergar o próximo passo.",
                            }
                        ],
                    },
                    {
                        "type": "blockquote",
                        "content": [
                            {
                                "type": "paragraph",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": "Não preciso resolver tudo hoje. Só preciso continuar.",
                                    }
                                ],
                            }
                        ],
                    },
                    {
                        "type": "paragraph",
                        "content": [
                            {"type": "text", "text": "Três coisas boas de hoje", "marks": [{"type": "bold"}]}
                        ],
                    },
                    {
                        "type": "bulletList",
                        "content": [
                            {
                                "type": "listItem",
                                "content": [
                                    {"type": "paragraph", "content": [{"type": "text", "text": text}]}
                                ],
                            }
                            for text in [
                                "Uma conversa que trouxe novas ideias.",
                                "Uma caminhada sem pressa.",
                                "Concluir uma tarefa que estava adiando.",
                            ]
                        ],
                    },
                ],
            },
        ),
        (
            "Anotações da aula — ideias que conectam",
            school.id,
            day - timedelta(days=1),
            False,
            {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": "Aprender fica mais fácil quando conecto a teoria com algo do meu dia a dia. Revisar os conceitos principais e separar dúvidas para a próxima aula.",
                            }
                        ],
                    }
                ],
            },
        ),
        (
            "Presentes com significado",
            gifts.id,
            None,
            False,
            {
                "type": "doc",
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": "Uma pequena coleção de ideias para surpreender quem faz parte da minha vida.",
                            }
                        ],
                    },
                    {
                        "type": "taskList",
                        "content": [
                            {
                                "type": "taskItem",
                                "attrs": {"checked": False},
                                "content": [
                                    {"type": "paragraph", "content": [{"type": "text", "text": text}]}
                                ],
                            }
                            for text in [
                                "Um livro com uma dedicatória",
                                "Preparar um jantar especial",
                                "Um álbum com nossas fotos favoritas",
                            ]
                        ],
                    },
                ],
            },
        ),
    ]
    for title, folder_id, journal_date, favorite, document in examples:
        add(
            db,
            user,
            "note",
            {
                "title": title,
                "folder_id": folder_id,
                "journal_date": journal_date,
                "favorite": favorite,
                "content": document,
                "plain_text": plain_text(document),
                "deleted_at": None,
                "updated_at": clock.now(),
            },
        )
    recompute_all(db, user)
    start_session(db, user, routine["id"])
    db.flush()


def seed_demo(db, user):
    """Clone the prepared base; the source builder is only used by the offline exporter."""
    from .demo_template import copy_demo_template

    copy_demo_template(db, user)
