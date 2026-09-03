"""Typed relational domain storage with composite owner foreign keys.

Aggregate.data adapts typed columns to JSON HTTP values; it is not a database
JSON document. Only snapshots, tags/checklists and schedule history use JSONB.
"""

from datetime import date, datetime
from datetime import date as LocalDate
from decimal import Decimal
from typing import Any, ClassVar
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    inspect,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from .clock import clock


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    __table_args__ = (UniqueConstraint("issuer", "subject"),)
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    issuer: Mapped[str] = mapped_column(String(500))
    subject: Mapped[str] = mapped_column(String(500))
    profile: Mapped[dict[str, Any]] = mapped_column(JSONB)
    version: Mapped[int] = mapped_column(default=1)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    demo_write_count: Mapped[int] = mapped_column(BigInteger, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: clock.now())


class Token(Base):
    __tablename__ = "demo_tokens"
    digest: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


def encode(value):
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    return value


class Aggregate(Base):
    __abstract__ = True
    kind: ClassVar[str]
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: clock.now())

    @property
    def data(self) -> dict:
        return {
            c.key: encode(getattr(self, c.key))
            for c in inspect(type(self)).columns
            if c.key not in {"id", "owner_id", "version", "created_at"}
        }

    @data.setter
    def data(self, values: dict):
        columns = inspect(type(self)).columns
        for key, value in values.items():
            if key not in columns or key in {"id", "owner_id", "version", "created_at"}:
                raise ValueError(f"Unknown aggregate field {key}")
            python_type = columns[key].type.python_type
            if value is not None:
                if python_type is UUID and isinstance(value, str):
                    value = UUID(value)
                elif python_type is datetime and isinstance(value, str):
                    value = datetime.fromisoformat(value)
                elif python_type is date and isinstance(value, str):
                    value = date.fromisoformat(value)
                elif python_type is Decimal:
                    value = Decimal(str(value))
            setattr(self, key, value)


def constraints(table: str, *foreign: tuple[str, str], checks: tuple[str, ...] = ()) -> tuple:
    return (
        UniqueConstraint("owner_id", "id", name=f"uq_{table}_owner_id"),
        CheckConstraint("version > 0", name=f"ck_{table}_version"),
        *(
            ForeignKeyConstraint(
                ["owner_id", field], [f"{target}.owner_id", f"{target}.id"], name=f"fk_{table}_{field}"
            )
            for field, target in foreign
        ),
        *(CheckConstraint(check, name=f"ck_{table}_{i}") for i, check in enumerate(checks)),
    )


class TaskList(Aggregate):
    __tablename__ = "task_lists"
    kind = "task_list"
    __table_args__ = constraints("task_lists")
    name: Mapped[str] = mapped_column(String(200))
    color: Mapped[str] = mapped_column(String(20))
    position: Mapped[int] = mapped_column(default=0)
    archived: Mapped[bool] = mapped_column(default=False)


class Task(Aggregate):
    __tablename__ = "tasks"
    kind = "task"
    __table_args__ = constraints(
        "tasks",
        ("list_id", "task_lists"),
        checks=(
            "status IN ('todo','in_progress','done','cancelled')",
            "priority IN ('none','low','medium','high')",
        ),
    )
    list_id: Mapped[UUID]
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str]
    status: Mapped[str] = mapped_column(String(20))
    priority: Mapped[str] = mapped_column(String(20))
    due_date: Mapped[date | None]
    start_date: Mapped[date | None]
    estimate_minutes: Mapped[int | None]
    tags: Mapped[list] = mapped_column(JSONB)
    checklist: Mapped[list] = mapped_column(JSONB)
    position: Mapped[int]
    archived: Mapped[bool]
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Habit(Aggregate):
    __tablename__ = "habits"
    kind = "habit"
    __table_args__ = constraints("habits", checks=("target_quantity > 0",))
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str]
    color: Mapped[str] = mapped_column(String(20))
    target_quantity: Mapped[int]
    unit: Mapped[str] = mapped_column(String(40))
    schedules: Mapped[list] = mapped_column(JSONB)
    archived: Mapped[bool]
    created_date: Mapped[date]


class Checkin(Aggregate):
    __tablename__ = "habit_checkins"
    kind = "checkin"
    __table_args__ = (
        *constraints("habit_checkins", ("habit_id", "habits"), checks=("quantity > 0",)),
        UniqueConstraint("owner_id", "habit_id", "date"),
    )
    habit_id: Mapped[UUID]
    date: Mapped[date]
    quantity: Mapped[int]
    note: Mapped[str]


class Account(Aggregate):
    __tablename__ = "accounts"
    kind = "account"
    __table_args__ = constraints("accounts", checks=("type IN ('checking','savings','cash')",))
    name: Mapped[str] = mapped_column(String(200))
    type: Mapped[str] = mapped_column(String(20))
    currency: Mapped[str] = mapped_column(String(3))
    opening_balance: Mapped[int] = mapped_column(BigInteger)
    color: Mapped[str] = mapped_column(String(20))
    archived: Mapped[bool]


class Category(Aggregate):
    __tablename__ = "categories"
    kind = "category"
    __table_args__ = constraints("categories", checks=("category_kind IN ('income','expense')",))
    name: Mapped[str] = mapped_column(String(200))
    category_kind: Mapped[str] = mapped_column(String(20))
    color: Mapped[str] = mapped_column(String(20))
    archived: Mapped[bool]


class Transfer(Aggregate):
    __tablename__ = "transfers"
    kind = "transfer"
    __table_args__ = constraints(
        "transfers",
        ("from_account_id", "accounts"),
        ("to_account_id", "accounts"),
        checks=("amount > 0", "from_account_id != to_account_id"),
    )
    from_account_id: Mapped[UUID]
    to_account_id: Mapped[UUID]
    amount: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(3))
    date: Mapped[date]
    description: Mapped[str]


class Recurrence(Aggregate):
    __tablename__ = "recurrences"
    kind = "recurrence"
    __table_args__ = constraints(
        "recurrences",
        ("account_id", "accounts"),
        ("category_id", "categories"),
        checks=(
            "amount > 0",
            "day_of_month BETWEEN 1 AND 31",
            "frequency IN ('daily','weekly','monthly','yearly')",
            "interval BETWEEN 1 AND 365",
            "end_date IS NULL OR end_date >= start_date",
        ),
    )
    account_id: Mapped[UUID]
    category_id: Mapped[UUID | None]
    transaction_kind: Mapped[str] = mapped_column(String(20))
    amount: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(3))
    description: Mapped[str]
    start_date: Mapped[date]
    day_of_month: Mapped[int]
    frequency: Mapped[str] = mapped_column(String(20))
    interval: Mapped[int]
    end_date: Mapped[date | None]
    generated_through: Mapped[date]
    schedule_effective_date: Mapped[date]
    active: Mapped[bool]


class Card(Aggregate):
    __tablename__ = "cards"
    kind = "card"
    __table_args__ = constraints(
        "cards",
        ("payment_account_id", "accounts"),
        checks=(
            "close_day BETWEEN 1 AND 31",
            "due_day BETWEEN 1 AND 31",
            "limit_amount IS NULL OR limit_amount > 0",
        ),
    )
    name: Mapped[str] = mapped_column(String(200))
    last_four: Mapped[str] = mapped_column(String(4))
    currency: Mapped[str] = mapped_column(String(3))
    close_day: Mapped[int]
    due_day: Mapped[int]
    limit_amount: Mapped[int | None] = mapped_column(BigInteger)
    payment_account_id: Mapped[UUID | None]
    color: Mapped[str] = mapped_column(String(20))
    archived: Mapped[bool]


class Invoice(Aggregate):
    __tablename__ = "invoices"
    kind = "invoice"
    __table_args__ = (
        *constraints("invoices", ("card_id", "cards"), checks=("due_date > close_date",)),
        UniqueConstraint("owner_id", "card_id", "close_date"),
    )
    card_id: Mapped[UUID]
    close_date: Mapped[date]
    due_date: Mapped[date]


class Purchase(Aggregate):
    __tablename__ = "purchases"
    kind = "purchase"
    __table_args__ = constraints(
        "purchases",
        ("card_id", "cards"),
        ("category_id", "categories"),
        checks=(
            "amount > 0",
            "installment_count > 0 AND installment_count <= amount",
            "status IN ('active','cancelled','refunded')",
        ),
    )
    card_id: Mapped[UUID]
    category_id: Mapped[UUID | None]
    description: Mapped[str]
    amount: Mapped[int] = mapped_column(BigInteger)
    installment_count: Mapped[int]
    purchase_date: Mapped[date]
    status: Mapped[str] = mapped_column(String(20))


class Installment(Aggregate):
    __tablename__ = "installments"
    kind = "installment"
    __table_args__ = constraints(
        "installments", ("purchase_id", "purchases"), ("invoice_id", "invoices"), checks=("amount != 0",)
    )
    purchase_id: Mapped[UUID]
    invoice_id: Mapped[UUID]
    number: Mapped[int]
    amount: Mapped[int] = mapped_column(BigInteger)
    close_date: Mapped[date]
    due_date: Mapped[date]
    is_refund: Mapped[bool] = mapped_column(default=False)


class Payment(Aggregate):
    __tablename__ = "invoice_payments"
    kind = "payment"
    __table_args__ = constraints(
        "invoice_payments", ("invoice_id", "invoices"), ("account_id", "accounts"), checks=("amount > 0",)
    )
    invoice_id: Mapped[UUID]
    account_id: Mapped[UUID]
    amount: Mapped[int] = mapped_column(BigInteger)
    date: Mapped[date]


class Transaction(Aggregate):
    __tablename__ = "transactions"
    kind = "transaction"
    __table_args__ = (
        *constraints(
            "transactions",
            ("account_id", "accounts"),
            ("category_id", "categories"),
            ("transfer_id", "transfers"),
            ("invoice_id", "invoices"),
            ("recurrence_id", "recurrences"),
            ("reversal_of", "transactions"),
            checks=(
                "amount > 0",
                "status IN ('planned','posted','cancelled')",
                "transaction_kind IN ('income','expense')",
            ),
        ),
        UniqueConstraint("owner_id", "recurrence_id", "scheduled_date", name="uq_transaction_occurrence"),
        CheckConstraint(
            "(recurrence_id IS NULL AND scheduled_date IS NULL) OR (recurrence_id IS NOT NULL AND scheduled_date IS NOT NULL)",
            name="ck_transaction_occurrence_identity",
        ),
    )
    account_id: Mapped[UUID]
    category_id: Mapped[UUID | None]
    transaction_kind: Mapped[str] = mapped_column(String(20))
    amount: Mapped[int] = mapped_column(BigInteger)
    currency: Mapped[str] = mapped_column(String(3))
    description: Mapped[str]
    date: Mapped[date]
    status: Mapped[str] = mapped_column(String(20))
    transfer_id: Mapped[UUID | None]
    invoice_id: Mapped[UUID | None]
    recurrence_id: Mapped[UUID | None]
    scheduled_date: Mapped[LocalDate | None]
    recurrence_superseded: Mapped[bool] = mapped_column(default=False)
    reversal_of: Mapped[UUID | None]


class Exercise(Aggregate):
    __tablename__ = "exercises"
    kind = "exercise"
    __table_args__ = constraints("exercises")
    name: Mapped[str] = mapped_column(String(200))
    muscle_group: Mapped[str] = mapped_column(String(100))
    equipment: Mapped[str] = mapped_column(String(100))
    instructions: Mapped[str]
    is_global: Mapped[bool]
    archived: Mapped[bool]


class Routine(Aggregate):
    __tablename__ = "routines"
    kind = "routine"
    __table_args__ = constraints("routines")
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str]
    exercises: Mapped[list] = mapped_column(JSONB)
    archived: Mapped[bool]


class WorkoutSession(Aggregate):
    __tablename__ = "workout_sessions"
    kind = "session"
    __table_args__ = (
        *constraints(
            "workout_sessions",
            ("routine_id", "routines"),
            checks=("status IN ('active','finished','cancelled')",),
        ),
        Index("uq_active_session", "owner_id", unique=True, postgresql_where=text("status = 'active'")),
    )
    routine_id: Mapped[UUID]
    name: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(20))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str]
    volume: Mapped[Decimal] = mapped_column(Numeric(18, 3))
    pr_count: Mapped[int]
    exercises: Mapped[list] = mapped_column(JSONB)
    rest_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TelegramLink(Aggregate):
    __tablename__ = "telegram_links"
    kind = "telegram_link"
    __table_args__ = (*constraints("telegram_links"), UniqueConstraint("chat_id"))
    code_digest: Mapped[str] = mapped_column(String(64))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    chat_id: Mapped[str | None] = mapped_column(String(80))


class Audit(Base):
    __tablename__ = "audit"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    action: Mapped[str] = mapped_column(String(80))
    entity_type: Mapped[str] = mapped_column(String(40))
    entity_id: Mapped[str] = mapped_column(String(36))
    detail: Mapped[dict[str, Any]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: clock.now())


class Idempotency(Base):
    __tablename__ = "idempotency"
    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    fingerprint: Mapped[str] = mapped_column(String(64))
    response: Mapped[dict[str, Any]] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: clock.now())


class Inbox(Base):
    __tablename__ = "integration_inbox"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    update_id: Mapped[str] = mapped_column(String(100), unique=True)
    owner_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(30), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: clock.now())


class Outbox(Base):
    __tablename__ = "integration_outbox"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    inbox_id: Mapped[UUID] = mapped_column(
        ForeignKey("integration_inbox.id", ondelete="CASCADE"), unique=True
    )
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB)
    status: Mapped[str] = mapped_column(String(30), default="pending")
    attempts: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: clock.now())


MODELS: dict[str, type[Aggregate]] = {
    cls.kind: cls
    for cls in [
        TaskList,
        Task,
        Habit,
        Checkin,
        Account,
        Category,
        Transfer,
        Recurrence,
        Card,
        Invoice,
        Purchase,
        Installment,
        Payment,
        Transaction,
        Exercise,
        Routine,
        WorkoutSession,
        TelegramLink,
    ]
}
