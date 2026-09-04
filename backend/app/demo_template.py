"""Copy the immutable demo base with new identities and a current calendar."""

import json
import re
from copy import deepcopy
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path
from uuid import UUID, uuid4

from .clock import clock
from .domain import add_months, billing_cycle
from .models import MODELS, Aggregate, Audit, Base
from .store import today

UUID_TEXT = re.compile(r"[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\Z")
DATE_TEXT = re.compile(r"\d{4}-\d{2}-\d{2}\Z")
INSTANT_TEXT = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:")
TEMPLATE_MODELS: dict[str, type[Aggregate] | type[Audit]] = {**MODELS, "audit": Audit}


@lru_cache(maxsize=1)
def load_template():
    template = json.loads((Path(__file__).with_name("fixtures") / "demo-base.json").read_text())
    if template["version"] != 1:
        raise ValueError("Unsupported demo template version")
    return template


def prepare_template(user):
    """Rebase trusted fixture values in memory without reading or modifying account data."""
    source = load_template()
    day_delta = today(user) - date.fromisoformat(source["reference_day"])
    time_delta = clock.now() - datetime.fromisoformat(source["reference_instant"])
    identifiers: dict[str, str] = {}

    def rebase(value):
        if isinstance(value, dict):
            return {key: rebase(item) for key, item in value.items()}
        if isinstance(value, list):
            return [rebase(item) for item in value]
        if isinstance(value, str):
            if UUID_TEXT.fullmatch(value):
                if value not in identifiers:
                    identifiers[value] = str(uuid4())
                return identifiers[value]
            if DATE_TEXT.fullmatch(value):
                return (date.fromisoformat(value) + day_delta).isoformat()
            if INSTANT_TEXT.match(value):
                return (datetime.fromisoformat(value) + time_delta).isoformat()
        return value

    records = rebase(deepcopy(source["records"]))
    by_kind = {
        kind: {record["id"]: record["data"] for record in records if record["kind"] == kind}
        for kind in ("card", "purchase", "invoice")
    }
    # Card cycles are calendar months, not fixed day offsets. Recalculate them
    # using the same pure rules as ordinary credit purchases (including February).
    for record in records:
        if record["kind"] != "installment":
            continue
        item = record["data"]
        purchase = by_kind["purchase"][item["purchase_id"]]
        card = by_kind["card"][purchase["card_id"]]
        close, due = billing_cycle(
            date.fromisoformat(purchase["purchase_date"]), card["close_day"], card["due_day"]
        )
        item["close_date"] = add_months(close, item["number"] - 1, card["close_day"]).isoformat()
        item["due_date"] = add_months(due, item["number"] - 1, card["due_day"]).isoformat()
        invoice = by_kind["invoice"][item["invoice_id"]]
        invoice["close_date"], invoice["due_date"] = item["close_date"], item["due_date"]
    return records


def copy_demo_template(db, user):
    records = prepare_template(user)
    models_by_table = {model.__tablename__: (kind, model) for kind, model in TEMPLATE_MODELS.items()}
    # Flush a whole table at a time in foreign-key order. ORM quota hooks still
    # reserve every copied record; no bulk/Core insert path bypasses the budget.
    for table in Base.metadata.sorted_tables:
        entry = models_by_table.get(table.name)
        if entry is None:
            continue
        kind, model = entry
        batch = []
        for record in records:
            if record["kind"] != kind:
                continue
            values = {"id": record["id"], "created_at": record["created_at"], **record["data"]}
            for column in table.columns:
                value = values.get(column.key)
                if value is None:
                    continue
                python_type = column.type.python_type
                if python_type is UUID:
                    values[column.key] = UUID(value)
                elif python_type is datetime:
                    values[column.key] = datetime.fromisoformat(value)
                elif python_type is date:
                    values[column.key] = date.fromisoformat(value)
            batch.append(model(owner_id=user.id, **values))
        if batch:
            db.add_all(batch)
            db.flush()
