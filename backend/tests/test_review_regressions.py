from datetime import UTC, date, datetime
from uuid import UUID, uuid4

import pytest
from test_api import demo, get, post


@pytest.fixture
def frozen(monkeypatch):
    from app.clock import clock

    now = [datetime(2026, 9, 3, 12, tzinfo=UTC)]
    monkeypatch.setattr(clock, "now", lambda: now[0])
    return now


def recurring(client, headers, **changes):
    account = post(client, headers, "/accounts", {"name": "Recurring bills"})
    payload = {
        "account_id": account["id"],
        "kind": "expense",
        "amount": 1200,
        "description": "Internet",
        "start_date": "2026-09-03",
        "day_of_month": 3,
        **changes,
    }
    return post(client, headers, "/recurrences", payload, str(uuid4()))


def occurrences(client, headers, rule):
    return [r for r in get(client, headers, "/transactions") if r["recurrence_id"] == rule["id"]]


def patch(client, headers, path, body, key=None):
    return client.patch(
        "/api/v1" + path, headers={**headers, **({"Idempotency-Key": key} if key else {})}, json=body
    )


def test_rescheduled_occurrence_cannot_be_generated_twice(client, frozen):
    h = demo(client)
    rule = recurring(client, h)
    post(client, h, "/recurrences/generate", {"through_date": "2026-10-03"})
    original = next(r for r in occurrences(client, h, rule) if r["date"] == "2026-09-03")
    moved = patch(
        client, h, "/transactions/" + original["id"], {"version": original["version"], "date": "2026-09-04"}
    )
    assert moved.status_code == 200, moved.text
    assert post(client, h, "/recurrences/generate", {"through_date": "2026-10-03"})["created"] == 0
    moved = moved.json()
    assert moved["scheduled_date"] == "2026-09-03"
    posted = patch(
        client, h, "/transactions/" + moved["id"], {"version": moved["version"], "status": "posted"}
    )
    assert posted.status_code == 200
    assert post(client, h, "/recurrences/generate", {"through_date": "2026-10-03"})["created"] == 0
    assert len([r for r in occurrences(client, h, rule) if r["scheduled_date"] == "2026-09-03"]) == 1


def test_recurrence_creation_initial_horizon_and_future_edits(client, frozen):
    h = demo(client)
    rule = recurring(client, h)
    created = occurrences(client, h, rule)
    assert len(created) >= 12
    current = next(r for r in created if r["date"] == "2026-09-03")
    future = next(r for r in created if r["date"] == "2026-10-03")
    posted = patch(
        client, h, "/transactions/" + future["id"], {"version": future["version"], "status": "posted"}
    )
    assert posted.status_code == 200
    changed = patch(
        client,
        h,
        "/recurrences/" + rule["id"],
        {"version": rule["version"], "amount": 2400, "description": "Updated bill"},
    )
    assert changed.status_code == 200, changed.text
    saved = occurrences(client, h, rule)
    assert next(r for r in saved if r["id"] == current["id"])["amount"] == 1200
    assert next(r for r in saved if r["id"] == future["id"])["amount"] == 1200
    assert all(r["amount"] == 2400 for r in saved if r["status"] == "planned" and r["date"] > "2026-09-03")
    assert changed.json()["generated_through"] >= "2027-09-02"


@pytest.mark.parametrize(
    ("frequency", "interval", "start", "end", "expected"),
    [
        ("daily", 2, "2026-09-03", "2026-09-08", ["2026-09-03", "2026-09-05", "2026-09-07"]),
        ("weekly", 2, "2026-09-03", "2026-10-02", ["2026-09-03", "2026-09-17", "2026-10-01"]),
        ("monthly", 2, "2026-09-03", "2027-01-03", ["2026-09-03", "2026-11-03", "2027-01-03"]),
        ("yearly", 1, "2026-09-03", "2026-12-31", ["2026-09-03"]),
    ],
)
def test_recurrence_frequency_interval_and_end_date(
    client, frozen, frequency, interval, start, end, expected
):
    h = demo(client)
    rule = recurring(client, h, frequency=frequency, interval=interval, start_date=start, end_date=end)
    assert sorted(r["date"] for r in occurrences(client, h, rule)) == expected
    assert post(client, h, "/recurrences/generate", {"through_date": "2027-09-03"})["created"] == 0


def test_recurrence_schedule_edit_cancels_superseded_future_not_posted(client, frozen):
    h = demo(client)
    rule = recurring(client, h, end_date="2026-12-31")
    initial = occurrences(client, h, rule)
    october = next(r for r in initial if r["date"] == "2026-10-03")
    assert (
        patch(
            client,
            h,
            "/transactions/" + october["id"],
            {"version": october["version"], "status": "posted", "date": "2026-11-10"},
        ).status_code
        == 200
    )
    changed = patch(client, h, "/recurrences/" + rule["id"], {"version": rule["version"], "day_of_month": 5})
    assert changed.status_code == 200
    actual = occurrences(client, h, rule)
    assert next(r for r in actual if r["id"] == october["id"])["status"] == "posted"
    assert any(r["date"] == "2026-11-05" and r["status"] == "planned" for r in actual)
    assert not any(r["date"] == "2026-10-05" and r["status"] == "planned" for r in actual)
    assert not any(r["date"] == "2026-11-03" and r["status"] == "planned" for r in actual)
    count = len(actual)
    post(client, h, "/recurrences/generate", {"through_date": "2027-09-03"})
    assert len(occurrences(client, h, rule)) == count


def test_card_only_profile_cannot_change_currency(client, frozen):
    from app.db import SessionLocal
    from app.identity import clear_user
    from app.models import User

    h = demo(client)
    me = get(client, h, "/me")
    with SessionLocal.begin() as db:
        clear_user(db, db.get(User, UUID(me["id"])))
    post(client, h, "/cards", {"name": "Only card", "close_day": 28, "due_day": 5})
    assert patch(client, h, "/me", {"version": me["version"], "currency": "USD"}).status_code == 409


def test_habit_target_changes_apply_tomorrow_preserving_history(client, frozen):
    h = demo(client)
    habit = post(client, h, "/habits", {"name": "Daily movement", "target_quantity": 1})
    path = "/habits/" + habit["id"]
    assert (
        client.put("/api/v1" + path + "/checkins/2026-09-03", headers=h, json={"quantity": 1}).status_code
        == 200
    )
    frozen[0] = datetime(2026, 9, 4, 10, tzinfo=UTC)
    changed = patch(client, h, path, {"version": habit["version"], "target_quantity": 2})
    assert changed.status_code == 200
    stats = get(client, h, path + "/stats")
    yesterday = next(day for day in stats["calendar"] if day["date"] == "2026-09-03")
    assert yesterday["completed"] and yesterday["target"] == 1
    assert stats["best_streak"] == 1
    assert stats["calendar"][-1]["target"] == 1


def quota_usage(client, headers):
    from app.db import SessionLocal
    from app.models import User

    with SessionLocal() as db:
        user = db.get(User, UUID(get(client, headers, "/me")["id"]))
        return getattr(user, "demo_write_count", 0)


def test_demo_budget_bounds_repeated_audited_updates(client, frozen, monkeypatch):
    from app.config import settings

    h = demo(client)
    account = get(client, h, "/accounts")[0]
    monkeypatch.setattr(settings(), "demo_max_records", quota_usage(client, h) + 4)
    statuses = []
    for _ in range(5):
        response = patch(
            client, h, "/accounts/" + account["id"], {"version": account["version"], "name": account["name"]}
        )
        statuses.append(response.status_code)
        if response.status_code == 200:
            account = response.json()
    assert statuses[-1] == 429
    assert statuses.count(200) <= 2


def test_demo_budget_bounds_clarification_inbox_outbox(client, frozen, monkeypatch):
    from app.config import settings

    h = demo(client)
    monkeypatch.setattr(settings(), "demo_max_records", quota_usage(client, h) + 4)
    statuses = [
        client.post(
            "/api/v1/integrations/telegram/simulate",
            headers=h,
            json={"text": '{"needs_clarification":true,"question":"Which account?"}'},
        ).status_code
        for _ in range(5)
    ]
    assert statuses[-1] == 429
    assert statuses.count(200) <= 2


def test_purchase_edit_preserves_identity_regenerates_and_replays(client, frozen):
    h = demo(client)
    card = post(client, h, "/cards", {"name": "Editable", "close_day": 28, "due_day": 5})
    purchase = post(
        client,
        h,
        "/purchases",
        {
            "card_id": card["id"],
            "description": "Original",
            "amount": 1001,
            "installment_count": 3,
            "purchase_date": "2026-09-03",
        },
        str(uuid4()),
    )
    body = {
        "version": purchase["version"],
        "amount": 2001,
        "installment_count": 2,
        "description": "Corrected",
        "purchase_date": "2026-09-04",
    }
    result = patch(client, h, "/purchases/" + purchase["id"], body, "edit-purchase-001")
    assert result.status_code == 200, result.text
    edited = result.json()
    assert edited["id"] == purchase["id"] and edited["version"] == purchase["version"] + 1
    assert [i["amount"] for i in edited["installments"]] == [1001, 1000]
    assert patch(client, h, "/purchases/" + purchase["id"], body, "edit-purchase-001").json() == edited
    assert patch(client, h, "/purchases/" + purchase["id"], body, "edit-purchase-002").status_code == 409
    invalid = patch(
        client,
        h,
        "/purchases/" + purchase["id"],
        {"version": edited["version"], "amount": 1, "installment_count": 2},
        "edit-invalid-001",
    )
    assert invalid.status_code == 422
    assert get(client, h, "/purchases/" + purchase["id"]) == edited


def test_purchase_edit_rejects_paid_and_closed_cycles(client, frozen):
    h = demo(client)
    account = get(client, h, "/accounts")[0]
    card = post(client, h, "/cards", {"name": "Edit boundary", "close_day": 28, "due_day": 5})
    purchase = post(
        client,
        h,
        "/purchases",
        {
            "card_id": card["id"],
            "description": "Uneditable",
            "amount": 1000,
            "installment_count": 1,
            "purchase_date": "2026-09-03",
        },
        str(uuid4()),
    )
    post(
        client,
        h,
        "/invoices/" + purchase["installments"][0]["invoice_id"] + "/payments",
        {"account_id": account["id"], "amount": 100, "date": "2026-09-03"},
        str(uuid4()),
    )
    assert (
        patch(
            client,
            h,
            "/purchases/" + purchase["id"],
            {"version": purchase["version"], "amount": 1200},
            str(uuid4()),
        ).status_code
        == 409
    )
    closed = post(
        client,
        h,
        "/purchases",
        {
            "card_id": card["id"],
            "description": "Old",
            "amount": 1000,
            "installment_count": 1,
            "purchase_date": "2025-01-01",
        },
        str(uuid4()),
    )
    assert (
        patch(
            client,
            h,
            "/purchases/" + closed["id"],
            {"version": closed["version"], "amount": 1200},
            str(uuid4()),
        ).status_code
        == 409
    )


def test_initial_horizon_and_idempotency_budget_failure_roll_back_atomically(client, frozen, monkeypatch):
    from app.config import settings

    h = demo(client)
    account = get(client, h, "/accounts")[0]
    baseline = len(get(client, h, "/transactions"))
    used = quota_usage(client, h)
    monkeypatch.setattr(settings(), "demo_max_records", used + 4)
    payload = {
        "account_id": account["id"],
        "kind": "expense",
        "amount": 100,
        "description": "Atomic daily",
        "start_date": "2026-09-03",
        "frequency": "daily",
    }
    headers = {**h, "Idempotency-Key": "atomic-initial-horizon"}
    result = client.post("/api/v1/recurrences", headers=headers, json=payload)
    assert result.status_code == 429, result.text
    assert get(client, h, "/recurrences") == []
    assert len(get(client, h, "/transactions")) == baseline
    assert quota_usage(client, h) == used
    monkeypatch.setattr(settings(), "demo_max_records", 5000)
    result = client.post("/api/v1/recurrences", headers=headers, json=payload)
    assert result.status_code == 201, result.text
    repeated = client.post("/api/v1/recurrences", headers=headers, json=payload)
    assert repeated.json()["id"] == result.json()["id"]
    assert len(occurrences(client, h, result.json())) == 366


def test_idempotency_rows_are_inside_demo_budget(client, frozen, monkeypatch):
    from app.config import settings

    h = demo(client)
    account = get(client, h, "/accounts")[0]
    baseline = len(get(client, h, "/transactions"))
    used = quota_usage(client, h)
    monkeypatch.setattr(settings(), "demo_max_records", used + 2)
    result = client.post(
        "/api/v1/transactions",
        headers={**h, "Idempotency-Key": "quota-idempotency-key"},
        json={
            "account_id": account["id"],
            "kind": "expense",
            "amount": 100,
            "description": "Must roll back",
            "date": "2026-09-03",
        },
    )
    assert result.status_code == 429
    assert len(get(client, h, "/transactions")) == baseline
    assert quota_usage(client, h) == used


def test_occurrence_identity_is_immutable_in_postgres(client, frozen):
    from sqlalchemy.exc import IntegrityError

    from app.db import SessionLocal
    from app.models import Transaction

    h = demo(client)
    rule = recurring(client, h)
    occurrence = occurrences(client, h, rule)[0]
    with pytest.raises(IntegrityError), SessionLocal.begin() as db:
        item = db.get(Transaction, UUID(occurrence["id"]))
        item.scheduled_date = date(2030, 1, 1)
        db.flush()


def test_pause_resume_and_end_date_keep_posted_history(client, frozen):
    h = demo(client)
    rule = recurring(client, h)
    occurrence = next(r for r in occurrences(client, h, rule) if r["date"] == "2026-10-03")
    assert (
        patch(
            client,
            h,
            "/transactions/" + occurrence["id"],
            {"version": occurrence["version"], "status": "posted"},
        ).status_code
        == 200
    )
    paused = patch(client, h, "/recurrences/" + rule["id"], {"version": rule["version"], "active": False})
    assert paused.status_code == 200
    values = occurrences(client, h, rule)
    assert next(r for r in values if r["id"] == occurrence["id"])["status"] == "posted"
    assert not any(r["status"] == "planned" and r["date"] > "2026-09-03" for r in values)
    resumed = patch(
        client,
        h,
        "/recurrences/" + rule["id"],
        {"version": paused.json()["version"], "active": True, "end_date": "2026-12-31"},
    )
    assert resumed.status_code == 200
    values = occurrences(client, h, rule)
    assert {r["date"] for r in values if r["status"] == "planned"} == {
        "2026-09-03",
        "2026-11-03",
        "2026-12-03",
    }


@pytest.mark.parametrize(
    ("frequency", "interval", "first", "same", "next_cycle"),
    [
        ("daily", 2, "2026-09-03", "2026-09-04", "2026-09-05"),
        ("weekly", 2, "2026-09-03", "2026-09-16", "2026-09-17"),
        ("monthly", 2, "2026-09-03", "2026-10-31", "2026-11-01"),
        ("yearly", 2, "2026-09-03", "2027-12-31", "2028-01-01"),
    ],
)
def test_frequency_interval_cycle_buckets(frequency, interval, first, same, next_cycle):
    from app.recurrences import cycle_bucket

    rule = {"start_date": "2026-09-03", "frequency": frequency, "interval": interval}
    assert cycle_bucket(rule, date.fromisoformat(first)) == cycle_bucket(rule, date.fromisoformat(same))
    assert cycle_bucket(rule, date.fromisoformat(first)) != cycle_bucket(rule, date.fromisoformat(next_cycle))


@pytest.mark.parametrize("edit_day", [3, 4])
def test_schedule_edit_preserves_retained_planned_current_cycle_without_duplicate(client, frozen, edit_day):
    h = demo(client)
    rule = recurring(client, h)
    initial = occurrences(client, h, rule)
    september = next(item for item in initial if item["date"] == "2026-09-03")
    october = next(item for item in initial if item["date"] == "2026-10-03")
    frozen[0] = datetime(2026, 9, edit_day, 10 if edit_day == 4 else 12, tzinfo=UTC)
    changed = patch(client, h, "/recurrences/" + rule["id"], {"version": rule["version"], "day_of_month": 5})
    assert changed.status_code == 200, changed.text
    actual = occurrences(client, h, rule)
    retained = next(item for item in actual if item["id"] == september["id"])
    assert {key: value for key, value in retained.items() if key != "is_overdue"} == {
        key: value for key, value in september.items() if key != "is_overdue"
    }
    assert retained["is_overdue"] is (edit_day == 4)
    september_planned = [
        item
        for item in actual
        if item["status"] == "planned" and item["scheduled_date"].startswith("2026-09")
    ]
    assert [item["id"] for item in september_planned] == [september["id"]]
    assert next(item for item in actual if item["id"] == october["id"])["status"] == "cancelled"
    assert [
        item["date"]
        for item in actual
        if item["status"] == "planned" and item["scheduled_date"].startswith("2026-10")
    ] == ["2026-10-05"]
    assert (
        post(client, h, "/recurrences/generate", {"through_date": rule["generated_through"]})["created"] == 0
    )
    assert occurrences(client, h, rule) == actual


@pytest.mark.parametrize("moved_date", ["2026-09-10", "2026-11-10"])
def test_moving_retained_bill_after_rule_edit_keeps_original_cycle_occupied(client, frozen, moved_date):
    h = demo(client)
    rule = recurring(client, h)
    original = next(item for item in occurrences(client, h, rule) if item["date"] == "2026-09-03")
    changed = patch(client, h, "/recurrences/" + rule["id"], {"version": rule["version"], "day_of_month": 5})
    assert changed.status_code == 200, changed.text
    moved = patch(
        client, h, "/transactions/" + original["id"], {"version": original["version"], "date": moved_date}
    )
    assert moved.status_code == 200, moved.text
    assert moved.json()["scheduled_date"] == "2026-09-03"
    before_generation = occurrences(client, h, rule)
    for _ in range(2):
        assert (
            post(client, h, "/recurrences/generate", {"through_date": rule["generated_through"]})["created"]
            == 0
        )
        assert occurrences(client, h, rule) == before_generation
    active = [item for item in before_generation if item["status"] == "planned"]
    assert [item["id"] for item in active if item["scheduled_date"].startswith("2026-09")] == [original["id"]]
    assert [item["date"] for item in active if item["scheduled_date"].startswith("2026-10")] == ["2026-10-05"]
    assert [item["date"] for item in active if item["scheduled_date"].startswith("2026-11")] == ["2026-11-05"]
