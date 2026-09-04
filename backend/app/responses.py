"""Explicit response DTOs: OpenAPI is the source of generated client types."""

from datetime import date, datetime
from datetime import date as LocalDate
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel

from .schemas import ChecklistItem, Schedule


class Entity(BaseModel):
    id: UUID
    version: int


class Archived(Entity):
    archived: bool


class Profile(Entity):
    name: str
    timezone: str
    currency: str
    locale: str
    week_start: int
    weight_unit: Literal["kg", "lb"]
    is_demo: bool


class RuntimeConfig(BaseModel):
    app_mode: Literal["demo", "personal", "combined"]
    oidc_authority: str
    oidc_client_id: str
    oidc_audience: str


class DemoToken(BaseModel):
    access_token: str
    expires_at: datetime


class Ok(BaseModel):
    ok: bool


class Health(BaseModel):
    status: str
    database: str


class TaskListOut(Archived):
    name: str
    color: str
    position: int


class TaskOut(Archived):
    list_id: UUID
    title: str
    description: str
    status: Literal["todo", "in_progress", "done", "cancelled"]
    priority: Literal["none", "low", "medium", "high"]
    due_date: date | None
    start_date: date | None
    estimate_minutes: int | None
    tags: list[str]
    checklist: list[ChecklistItem]
    position: int
    completed_at: datetime | None
    is_overdue: bool


class HabitOut(Archived):
    name: str
    description: str
    color: str
    target_quantity: int
    unit: str
    schedule: Schedule
    created_date: date


class CheckinOut(Entity):
    habit_id: UUID
    date: date
    quantity: int
    note: str


class CalendarDay(BaseModel):
    date: date
    scheduled: bool
    quantity: int
    target: int
    completed: bool


class HabitStats(BaseModel):
    current_streak: int
    best_streak: int
    streak_unit: Literal["days", "weeks"]
    adherence: float
    completed: int
    total: int
    calendar: list[CalendarDay]
    checkins: list[CheckinOut]


class HabitSummary(HabitOut):
    stats: HabitStats


class AccountOut(Archived):
    name: str
    type: Literal["checking", "savings", "cash"]
    currency: str
    opening_balance: int
    color: str
    current_balance: int
    projected_balance: int


class CategoryOut(Archived):
    name: str
    kind: Literal["income", "expense"]
    color: str


class TransactionOut(Entity):
    account_id: UUID
    category_id: UUID | None
    kind: Literal["income", "expense"]
    amount: int
    currency: str
    description: str
    date: date
    status: Literal["planned", "posted", "cancelled"]
    transfer_id: UUID | None
    invoice_id: UUID | None
    recurrence_id: UUID | None
    reversal_of: UUID | None
    scheduled_date: LocalDate | None
    recurrence_superseded: bool
    is_overdue: bool = False


class TransferOut(Entity):
    from_account_id: UUID
    to_account_id: UUID
    amount: int
    currency: str
    date: date
    description: str


class RecurrenceOut(Entity):
    account_id: UUID
    category_id: UUID | None
    kind: Literal["income", "expense"]
    amount: int
    currency: str
    description: str
    start_date: date
    day_of_month: int
    frequency: Literal["daily", "weekly", "monthly", "yearly"]
    interval: int
    end_date: date | None
    generated_through: date
    schedule_effective_date: date
    active: bool


class Generated(BaseModel):
    created: int


class CardOut(Archived):
    name: str
    last_four: str
    currency: str
    close_day: int
    due_day: int
    limit_amount: int | None
    payment_account_id: UUID | None
    color: str


class InstallmentPreview(BaseModel):
    number: int
    amount: int
    close_date: date
    due_date: date


class PurchasePreview(BaseModel):
    total: int
    installments: list[InstallmentPreview]


class InstallmentOut(InstallmentPreview, Entity):
    invoice_id: UUID
    purchase_id: UUID
    is_refund: bool


class PurchaseOut(Entity):
    card_id: UUID
    category_id: UUID | None
    description: str
    amount: int
    installment_count: int
    purchase_date: date
    status: Literal["active", "cancelled", "refunded"]
    installments: list[InstallmentOut]


class InvoiceItem(BaseModel):
    id: UUID
    purchase_id: UUID
    description: str
    number: int
    amount: int


class PaymentOut(Entity):
    account_id: UUID
    invoice_id: UUID
    amount: int
    date: date


class InvoiceOut(Entity):
    card_id: UUID
    close_date: date
    due_date: date
    total: int
    credit_brought_forward: int = 0
    paid: int
    remaining: int
    status: Literal["open", "closed", "partial", "paid", "overdue"]
    items: list[InvoiceItem]
    payments: list[PaymentOut]


class CategoryTotal(BaseModel):
    category_id: UUID
    name: str
    amount: int


class FinanceReport(BaseModel):
    income: int
    expenses: int
    net: int
    categories: list[CategoryTotal]
    basis: Literal["cash", "accrual"]


class ExerciseOut(Archived):
    name: str
    muscle_group: str
    equipment: str
    instructions: str
    is_global: bool


class RoutineExerciseOut(BaseModel):
    exercise_id: UUID
    name: str
    muscle_group: str
    sets: int
    reps: int
    load: str
    rest_seconds: int


class RoutineOut(Archived):
    name: str
    description: str
    exercises: list[RoutineExerciseOut]


class SessionSet(BaseModel):
    id: UUID
    position: int
    load: str
    reps: int
    type: Literal["normal", "warmup", "drop", "failure"]
    rpe: float | None
    rir: float | None
    completed_at: datetime | None
    is_pr: bool


class SessionExercise(BaseModel):
    exercise_id: UUID
    name: str
    muscle_group: str
    rest_seconds: int
    sets: list[SessionSet]


class SessionOut(Entity):
    routine_id: UUID
    name: str
    status: Literal["active", "finished", "cancelled"]
    started_at: datetime
    finished_at: datetime | None
    notes: str
    volume: str
    pr_count: int
    exercises: list[SessionExercise]
    rest_until: datetime | None


class DashboardOut(BaseModel):
    today: date
    profile: Profile
    tasks: list[TaskOut]
    habits: list[HabitSummary]
    accounts: list[AccountOut]
    cards: list[CardOut]
    invoices: list[InvoiceOut]
    active_session: SessionOut | None
    last_session: SessionOut | None
    monthly: FinanceReport
    workout_count: int
    suggested_routine: RoutineOut | None


class IntegrationStatus(BaseModel):
    enabled: bool
    linked: bool
    provider_mode: Literal["disabled", "fixture", "live"]
    status: str


class LinkCode(BaseModel):
    code: str
    expires_at: datetime
    bot_url: str | None = None


class SimulationOut(BaseModel):
    id: UUID | None
    status: str
    mode: Literal["fixture"]
    result: dict[str, Any]


class AuditOut(BaseModel):
    id: UUID
    action: str
    entity_type: str
    entity_id: str
    created_at: datetime
    detail: dict[str, Any]


RESPONSES = {
    "task_list": TaskListOut,
    "task": TaskOut,
    "habit": HabitOut,
    "account": AccountOut,
    "category": CategoryOut,
    "transaction": TransactionOut,
    "recurrence": RecurrenceOut,
    "card": CardOut,
    "exercise": ExerciseOut,
    "routine": RoutineOut,
}
