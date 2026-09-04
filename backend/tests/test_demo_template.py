from sqlalchemy import event
from test_api import get


def test_demo_creation_uses_bounded_database_round_trips(client):
    from app.db import engine

    queries = []

    def record(conn, cursor, statement, parameters, context, executemany):
        queries.append(statement)

    event.listen(engine, "before_cursor_execute", record)
    try:
        response = client.post("/api/v1/auth/demo", json={})
    finally:
        event.remove(engine, "before_cursor_execute", record)
    assert response.status_code == 201, response.text
    headers = {"Authorization": "Bearer " + response.json()["access_token"]}
    client.test_users.append(get(client, headers, "/me")["id"])
    assert len(queries) <= 65, f"Demo creation made {len(queries)} SQL round trips"
    assert len(get(client, headers, "/tasks")) == 5


def test_template_copies_preserve_links_and_never_reuse_ids_or_mutate_the_base():
    import json
    from types import SimpleNamespace

    from app.demo_template import load_template, prepare_template
    from app.identity import default_profile

    source = json.dumps(load_template(), sort_keys=True)
    owner = SimpleNamespace(profile=default_profile())
    first, second = prepare_template(owner), prepare_template(owner)
    first_ids = {row["id"] for row in first}
    assert first_ids.isdisjoint(row["id"] for row in second)
    lists = {row["id"] for row in first if row["kind"] == "task_list"}
    habits = {row["id"] for row in first if row["kind"] == "habit"}
    exercises = {row["id"] for row in first if row["kind"] == "exercise"}
    for row in first:
        if row["kind"] == "task":
            assert row["data"]["list_id"] in lists
        if row["kind"] == "checkin":
            assert row["data"]["habit_id"] in habits
        if row["kind"] in {"routine", "session"}:
            assert all(item["exercise_id"] in exercises for item in row["data"]["exercises"])
    first[0]["data"]["name"] = "Visitor edit"
    assert json.dumps(load_template(), sort_keys=True) == source
    assert second[0]["data"]["name"] != "Visitor edit"


def test_template_calendar_tracks_local_today_and_real_invoice_months(monkeypatch):
    from datetime import datetime
    from types import SimpleNamespace

    from app.clock import clock
    from app.demo_template import prepare_template
    from app.identity import default_profile

    cases = [
        ("2027-01-01T01:00:00+00:00", "2026-12-31", ["2027-01-28", "2027-02-28", "2027-03-28"]),
        ("2028-02-29T15:00:00+00:00", "2028-02-29", ["2028-03-28", "2028-04-28", "2028-05-28"]),
        ("2027-01-29T15:00:00+00:00", "2027-01-29", ["2027-02-28", "2027-03-28", "2027-04-28"]),
    ]
    for instant, today, due_dates in cases:
        monkeypatch.setattr(clock, "now", lambda value=instant: datetime.fromisoformat(value))
        rows = prepare_template(SimpleNamespace(profile=default_profile()))
        salary = next(
            row["data"]
            for row in rows
            if row["kind"] == "transaction" and row["data"]["description"] == "Salário mensal"
        )
        assert salary["date"] == today
        installments = sorted(
            (row["data"] for row in rows if row["kind"] == "installment"), key=lambda item: item["number"]
        )
        assert [item["due_date"] for item in installments] == due_dates
        assert sum(item["amount"] for item in installments) == 89900
        invoices = {row["id"]: row["data"] for row in rows if row["kind"] == "invoice"}
        for item in installments:
            invoice = invoices[item["invoice_id"]]
            assert (invoice["close_date"], invoice["due_date"]) == (item["close_date"], item["due_date"])
        active = next(
            row["data"] for row in rows if row["kind"] == "session" and row["data"]["status"] == "active"
        )
        assert (
            abs(
                (
                    datetime.fromisoformat(active["started_at"]) - datetime.fromisoformat(instant)
                ).total_seconds()
            )
            < 1
        )


def test_copy_quota_failure_rolls_back_the_entire_new_demo(client, monkeypatch):
    from sqlalchemy import func, select

    from app.config import settings
    from app.db import SessionLocal
    from app.models import User

    with SessionLocal() as db:
        before = db.scalar(select(func.count()).select_from(User))
    monkeypatch.setattr(settings(), "demo_max_records", 10)
    response = client.post("/api/v1/auth/demo", json={})
    assert response.status_code == 429
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(User)) == before


def test_expired_demo_cleanup_is_batched_and_preserves_active_visitors(client):
    from datetime import timedelta
    from uuid import UUID

    from test_api import demo

    from app.clock import clock
    from app.db import SessionLocal, engine
    from app.models import Inbox, Outbox, User

    expired_headers = [demo(client), demo(client)]
    expired_ids = [UUID(get(client, headers, "/me")["id"]) for headers in expired_headers]
    active = demo(client)
    with SessionLocal.begin() as db:
        for identifier in expired_ids:
            db.get(User, identifier).expires_at = clock.now() - timedelta(seconds=1)
        inbox = Inbox(
            update_id="template-cleanup-test", owner_id=expired_ids[0], payload={}, status="completed"
        )
        db.add(inbox)
        db.flush()
        inbox_id = inbox.id
        db.add(Outbox(inbox_id=inbox_id, payload={}, status="sent"))

    queries = []

    def record(conn, cursor, statement, parameters, context, executemany):
        queries.append(statement)

    event.listen(engine, "before_cursor_execute", record)
    try:
        newcomer = client.post("/api/v1/auth/demo", json={})
    finally:
        event.remove(engine, "before_cursor_execute", record)
    assert newcomer.status_code == 201, newcomer.text
    h = {"Authorization": "Bearer " + newcomer.json()["access_token"]}
    client.test_users.append(get(client, h, "/me")["id"])
    assert len(queries) <= 65, f"Expired cleanup and creation made {len(queries)} SQL round trips"
    with SessionLocal() as db:
        assert all(db.get(User, identifier) is None for identifier in expired_ids)
        assert db.get(Inbox, inbox_id) is None
    assert get(client, active, "/me")["is_demo"] is True
