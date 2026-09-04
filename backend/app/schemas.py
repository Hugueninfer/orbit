from datetime import date
from decimal import Decimal
from typing import Annotated, Literal
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Money = Annotated[int, Field(strict=True, gt=0, le=10**15)]
Name = Annotated[str, Field(min_length=1, max_length=200)]
Color = Annotated[str, Field(pattern=r"^#[0-9a-fA-F]{6}$")]
Currency = Annotated[str, Field(pattern=r"^[A-Z]{3}$")]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ProfilePatch(Input):
    version: int
    name: Name | None = None
    timezone: str | None = None
    currency: Currency | None = None
    locale: Literal["pt-BR", "en-US", "de-DE"] | None = None
    week_start: Annotated[int, Field(ge=0, le=6)] | None = None
    weight_unit: Literal["kg", "lb"] | None = None

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value):
        if value is not None:
            try:
                ZoneInfo(value)
            except ZoneInfoNotFoundError as error:
                raise ValueError("Timezone inválido") from error
        return value


class TaskListCreate(Input):
    name: Name
    color: Color = "#8b5cf6"


class ChecklistItem(Input):
    id: str = Field(min_length=1, max_length=100)
    text: str = Field(min_length=1, max_length=300)
    done: bool = False


class TaskCreate(Input):
    title: str = Field(min_length=1, max_length=300)
    list_id: UUID
    description: str = Field(default="", max_length=10000)
    priority: Literal["none", "low", "medium", "high"] = "none"
    due_date: date | None = None
    start_date: date | None = None
    estimate_minutes: Annotated[int, Field(gt=0, le=100000)] | None = None
    tags: list[Annotated[str, Field(min_length=1, max_length=50)]] = Field(
        default_factory=list, max_length=30
    )
    checklist: list[ChecklistItem] = Field(default_factory=list, max_length=100)


class Schedule(Input):
    kind: Literal["daily", "weekdays", "times_per_week"] = "daily"
    weekdays: list[Annotated[int, Field(ge=0, le=6)]] = Field(default_factory=list, max_length=7)
    times_per_week: int = Field(default=1, ge=1, le=7)

    @model_validator(mode="after")
    def validate_days(self):
        if self.kind == "weekdays" and not self.weekdays:
            raise ValueError("Selecione pelo menos um dia")
        if len(set(self.weekdays)) != len(self.weekdays):
            raise ValueError("Dias duplicados")
        return self


class HabitCreate(Input):
    name: Name
    description: str = Field(default="", max_length=10000)
    color: Color = "#8b5cf6"
    target_quantity: int = Field(default=1, ge=1, le=100000)
    unit: str = Field(default="vezes", max_length=40)
    schedule: Schedule = Field(default_factory=Schedule)


class CheckinPut(Input):
    quantity: int = Field(gt=0, le=100000)
    note: str = Field(default="", max_length=2000)


class AccountCreate(Input):
    name: Name
    type: Literal["checking", "savings", "cash"] = "checking"
    currency: Currency = "BRL"
    opening_balance: int = Field(default=0, strict=True, ge=-(10**15), le=10**15)
    color: Color = "#8b5cf6"


class CategoryCreate(Input):
    name: Name
    kind: Literal["income", "expense"]
    color: Color = "#8b5cf6"


class TransactionCreate(Input):
    account_id: UUID
    category_id: UUID | None = None
    kind: Literal["income", "expense"]
    amount: Money
    currency: Currency = "BRL"
    description: str = Field(min_length=1, max_length=500)
    date: date
    status: Literal["planned", "posted"] = "posted"


class TransferCreate(Input):
    from_account_id: UUID
    to_account_id: UUID
    amount: Money
    date: date
    description: str = Field(default="Transferência", max_length=500)


class RecurrenceCreate(Input):
    account_id: UUID
    category_id: UUID | None = None
    kind: Literal["income", "expense"]
    amount: Money
    currency: Currency = "BRL"
    description: str = Field(min_length=1, max_length=500)
    start_date: date
    day_of_month: int | None = Field(default=None, ge=1, le=31)
    frequency: Literal["daily", "weekly", "monthly", "yearly"] = "monthly"
    interval: int = Field(default=1, ge=1, le=365)
    end_date: date | None = None

    @model_validator(mode="after")
    def valid_recurrence(self):
        if self.day_of_month is None:
            self.day_of_month = self.start_date.day
        if self.end_date is not None and self.end_date < self.start_date:
            raise ValueError("Data final deve ser igual ou posterior ao início")
        return self


class CardCreate(Input):
    name: Name
    last_four: str = Field(default="0000", pattern=r"^\d{4}$")
    currency: Currency = "BRL"
    close_day: int = Field(ge=1, le=31)
    due_day: int = Field(ge=1, le=31)
    limit_amount: Money | None = None
    payment_account_id: UUID | None = None
    color: Color = "#8b5cf6"


class Preview(Input):
    amount: Money
    installment_count: int = Field(ge=1, le=120)
    purchase_date: date


class PurchaseCreate(Preview):
    card_id: UUID
    category_id: UUID | None = None
    description: str = Field(min_length=1, max_length=500)


class PaymentCreate(Input):
    account_id: UUID
    amount: Money
    date: date


class ExerciseCreate(Input):
    name: Name
    muscle_group: str = Field(min_length=1, max_length=100)
    equipment: str = Field(default="", max_length=100)
    instructions: str = Field(default="", max_length=10000)


class RoutineExercise(Input):
    exercise_id: UUID
    sets: int = Field(ge=1, le=20)
    reps: int = Field(ge=1, le=100)
    load: Decimal = Field(default=Decimal(0), ge=0, le=10000, max_digits=8, decimal_places=3)
    rest_seconds: int = Field(default=90, ge=0, le=3600)


class RoutineCreate(Input):
    name: Name
    description: str = Field(default="", max_length=10000)
    exercises: list[RoutineExercise] = Field(min_length=1, max_length=50)


class SessionCreate(Input):
    routine_id: UUID
    copy_last: bool = False


class SetPut(Input):
    version: int
    load: Decimal = Field(ge=0, le=10000, max_digits=8, decimal_places=3)
    reps: int = Field(ge=1, le=100)
    type: Literal["normal", "warmup", "drop", "failure"] = "normal"
    rpe: Annotated[float, Field(ge=0, le=10)] | None = None
    rir: Annotated[float, Field(ge=0, le=10)] | None = None
    completed: bool = True
    reason: str = Field(default="", max_length=1000)


class Version(Input):
    version: int


class Finish(Version):
    notes: str = Field(default="", max_length=10000)


class Reason(Input):
    reason: str = Field(min_length=1, max_length=1000)


class Horizon(Input):
    through_date: date


class OrderItem(Version):
    id: UUID


class Reorder(Input):
    list_id: UUID
    items: list[OrderItem] = Field(max_length=5000)


CREATES: dict[str, type[Input]] = {
    "task_list": TaskListCreate,
    "task": TaskCreate,
    "habit": HabitCreate,
    "account": AccountCreate,
    "category": CategoryCreate,
    "transaction": TransactionCreate,
    "recurrence": RecurrenceCreate,
    "card": CardCreate,
    "exercise": ExerciseCreate,
    "routine": RoutineCreate,
}
PATCH_FIELDS = {
    "task_list": {"name", "color", "archived"},
    "task": set(TaskCreate.model_fields) | {"status", "position", "archived"},
    "habit": set(HabitCreate.model_fields) | {"archived"},
    "account": {"name", "color", "archived"},
    "category": {"name", "color", "archived"},
    "transaction": {"account_id", "category_id", "amount", "description", "date", "status"},
    "recurrence": {
        "active",
        "amount",
        "description",
        "account_id",
        "category_id",
        "frequency",
        "interval",
        "day_of_month",
        "end_date",
    },
    "card": {"name", "last_four", "limit_amount", "payment_account_id", "color", "archived"},
    "exercise": set(ExerciseCreate.model_fields) | {"archived"},
    "routine": set(RoutineCreate.model_fields) | {"archived"},
}


class SetAdd(Input):
    version: int
    exercise_id: UUID
    load: Decimal = Field(default=Decimal(0), ge=0, le=10000, max_digits=8, decimal_places=3)
    reps: int = Field(ge=1, le=100)
    type: Literal["normal", "warmup", "drop", "failure"] = "normal"


class PurchasePatch(Input):
    version: int
    category_id: UUID | None = None
    description: str | None = Field(default=None, min_length=1, max_length=500)
    amount: Money | None = None
    installment_count: int | None = Field(default=None, ge=1, le=120)
    purchase_date: date | None = None
