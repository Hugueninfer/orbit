"""Export fictitious seed data offline. The temporary source account is always rolled back.

Run against local PostgreSQL after migrations: python -m app.export_demo_template
"""

import json
from datetime import UTC, datetime, timedelta
from itertools import count
from pathlib import Path
from unittest.mock import patch
from uuid import uuid4

from sqlalchemy import select

from .clock import clock
from .db import SessionLocal
from .demo_template import TEMPLATE_MODELS
from .identity import default_profile
from .models import Aggregate, Audit, User, encode
from .seed import build_demo_source

DESTINATION = Path(__file__).with_name("fixtures") / "demo-base.json"
REFERENCE = datetime(2026, 9, 4, 12, tzinfo=UTC)


def main():
    sequence = count()
    with patch.object(clock, "now", lambda: REFERENCE + timedelta(microseconds=next(sequence))):
        with SessionLocal() as db:
            try:
                user = User(issuer="fixture-export", subject=str(uuid4()), profile=default_profile())
                db.add(user)
                db.flush()
                build_demo_source(db, user)
                records = []
                for kind, model in TEMPLATE_MODELS.items():
                    for row in db.scalars(
                        select(model).where(model.owner_id == user.id).order_by(model.created_at, model.id)
                    ):
                        assert isinstance(row, (Aggregate, Audit))
                        if isinstance(row, Audit):
                            data = {
                                "action": row.action,
                                "entity_type": row.entity_type,
                                "entity_id": row.entity_id,
                                "detail": row.detail,
                            }
                        else:
                            data = row.data
                        records.append(
                            {
                                "kind": kind,
                                "id": str(row.id),
                                "created_at": row.created_at.isoformat(),
                                "data": data,
                            }
                        )
                snapshot = {
                    "version": 1,
                    "reference_instant": REFERENCE.isoformat(),
                    "reference_day": "2026-09-04",
                    "records": records,
                }
                DESTINATION.parent.mkdir(exist_ok=True)
                DESTINATION.write_text(
                    json.dumps(snapshot, ensure_ascii=False, indent=2, default=encode) + "\n"
                )
                print(
                    f"Exported {len(records)} fictitious records to {DESTINATION.name}; no account committed."
                )
            finally:
                db.rollback()


if __name__ == "__main__":
    main()
