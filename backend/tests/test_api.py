from concurrent.futures import ThreadPoolExecutor

import pytest


def demo(c):
    r = c.post("/api/v1/auth/demo", json={})
    assert r.status_code == 201, r.text
    headers = {"Authorization": "Bearer " + r.json()["access_token"]}
    c.test_users.append(c.get("/api/v1/me", headers=headers).json()["id"])
    return headers


def post(c, h, path, body, key=None):
    from uuid import uuid4

    if path in {"/transactions", "/recurrences"} and key is None:
        key = str(uuid4())
    r = c.post("/api/v1" + path, json=body, headers={**h, **({"Idempotency-Key": key} if key else {})})
    assert r.status_code in (200, 201), r.text
    return r.json()


def get(c, h, path):
    r = c.get("/api/v1" + path, headers=h)
    assert r.status_code == 200, r.text
    return r.json()


def test_auth_profile_and_tenant_isolation_every_domain(client):
    c = client
    assert c.get("/api/v1/tasks").status_code == 401
    a, b = demo(c), demo(c)
    for collection in [
        "task-lists",
        "tasks",
        "habits",
        "accounts",
        "categories",
        "cards",
        "purchases",
        "invoices",
        "routines",
        "sessions",
    ]:
        mine = get(c, a, "/" + collection)
        theirs = get(c, b, "/" + collection)
        assert mine, collection
        assert not ({x["id"] for x in mine} & {x["id"] for x in theirs})
        foreign = c.patch(
            "/api/v1/" + collection + "/" + mine[0]["id"],
            headers={**b, "Idempotency-Key": "foreign-owner-edit"},
            json={"version": mine[0].get("version", 1)},
        )
        assert foreign.status_code in (404, 405), foreign.text
    me = get(c, a, "/me")
    changed = c.patch(
        "/api/v1/me",
        headers=a,
        json={"version": me["version"], "name": "Ana", "timezone": "Pacific/Auckland"},
    )
    assert changed.status_code == 200
    assert get(c, a, "/me")["name"] == "Ana"
    assert get(c, b, "/me")["name"] != "Ana"
    assert (
        c.patch("/api/v1/me", headers=a, json={"version": me["version"], "name": "stale"}).status_code == 409
    )


def test_tasks_concurrency_checklist_and_reorder(client):
    c = client
    h = demo(c)
    listing = post(c, h, "/task-lists", {"name": "Test"})
    task = post(
        c,
        h,
        "/tasks",
        {
            "list_id": listing["id"],
            "title": "Persist me",
            "tags": ["pessoal"],
            "checklist": [{"id": "one", "text": "Step", "done": False}],
        },
    )
    responses = list(
        ThreadPoolExecutor(2).map(
            lambda title: c.patch(
                "/api/v1/tasks/" + task["id"], headers=h, json={"version": 1, "title": title}
            ),
            ["A", "B"],
        )
    )
    assert sorted(r.status_code for r in responses) == [200, 409]
    saved = get(c, h, "/tasks/" + task["id"])
    assert saved["version"] == 2 and saved["tags"] == ["pessoal"]
    r = post(
        c,
        h,
        "/tasks/reorder",
        {"list_id": listing["id"], "items": [{"id": saved["id"], "version": saved["version"]}]},
    )
    assert r[0]["position"] == 0
    foreign = demo(c)
    assert (
        c.post(
            "/api/v1/tasks", headers=foreign, json={"list_id": listing["id"], "title": "attack"}
        ).status_code
        == 404
    )


def test_finance_installments_payment_idempotency_and_reports(client):
    c = client
    h = demo(c)
    account = post(c, h, "/accounts", {"name": "Test bank", "opening_balance": 10000})
    card = post(
        c,
        h,
        "/cards",
        {"name": "Test card", "close_day": 28, "due_day": 5, "payment_account_id": account["id"]},
    )
    body = {
        "card_id": card["id"],
        "description": "Notebook",
        "amount": 1001,
        "installment_count": 3,
        "purchase_date": "2026-09-03",
    }
    p = post(c, h, "/purchases", body, "purchase-test-001")
    assert [i["amount"] for i in p["installments"]] == [334, 334, 333]
    assert post(c, h, "/purchases", body, "purchase-test-001")["id"] == p["id"]
    assert (
        c.post(
            "/api/v1/purchases",
            headers={**h, "Idempotency-Key": "purchase-test-001"},
            json={**body, "amount": 1002},
        ).status_code
        == 409
    )
    invoice_id = p["installments"][0]["invoice_id"]
    paid = post(
        c,
        h,
        "/invoices/" + invoice_id + "/payments",
        {"account_id": account["id"], "amount": 100, "date": "2026-09-03"},
        "payment-test-001",
    )
    assert paid["paid"] == 100 and paid["remaining"] == 234
    assert (
        c.post(
            "/api/v1/invoices/" + invoice_id + "/payments",
            headers={**h, "Idempotency-Key": "payment-test-002"},
            json={"account_id": account["id"], "amount": 235, "date": "2026-09-03"},
        ).status_code
        == 422
    )
    actual = [x for x in get(c, h, "/accounts") if x["id"] == account["id"]][0]
    assert actual["current_balance"] == 9900
    foreign = demo(c)
    assert (
        c.post(
            "/api/v1/invoices/" + invoice_id + "/payments",
            headers={**foreign, "Idempotency-Key": "foreign-pay-0001"},
            json={"account_id": account["id"], "amount": 1, "date": "2026-09-03"},
        ).status_code
        == 404
    )


def test_atomic_transfer_and_recurring_occurrences(client):
    c = client
    h = demo(c)
    a = post(c, h, "/accounts", {"name": "A", "opening_balance": 1000})
    b = post(c, h, "/accounts", {"name": "B"})
    payload = {"from_account_id": a["id"], "to_account_id": b["id"], "amount": 250, "date": "2026-09-03"}
    post(c, h, "/transfers", payload, "transfer-test-01")
    post(c, h, "/transfers", payload, "transfer-test-01")
    accounts = {x["id"]: x for x in get(c, h, "/accounts")}
    assert accounts[a["id"]]["current_balance"] == 750
    assert accounts[b["id"]]["current_balance"] == 250
    today = get(c, h, "/dashboard")["today"]
    post(
        c,
        h,
        "/recurrences",
        {
            "account_id": a["id"],
            "kind": "income",
            "amount": 3000,
            "description": "Salary",
            "start_date": today,
            "day_of_month": int(today[-2:]),
        },
    )
    assert post(c, h, "/recurrences/generate", {"through_date": today})["created"] == 0
    assert post(c, h, "/recurrences/generate", {"through_date": today})["created"] == 0


def test_workout_snapshot_single_active_completion_and_audit(client):
    c = client
    h = demo(c)
    active = get(c, h, "/sessions/active")
    if active:
        post(c, h, "/sessions/" + active["id"] + "/cancel", {"version": active["version"]})
    exercise = get(c, h, "/exercises")[0]
    routine = post(
        c,
        h,
        "/routines",
        {
            "name": "Strength",
            "exercises": [{"exercise_id": exercise["id"], "sets": 2, "reps": 8, "load": "50"}],
        },
    )
    s = post(c, h, "/sessions", {"routine_id": routine["id"]}, "start-session-01")
    assert (
        c.post(
            "/api/v1/sessions",
            headers={**h, "Idempotency-Key": "start-session-02"},
            json={"routine_id": routine["id"]},
        ).status_code
        == 409
    )
    assert (
        c.post(
            "/api/v1/sessions/" + s["id"] + "/finish", headers=h, json={"version": s["version"]}
        ).status_code
        == 422
    )
    assert (
        c.patch(
            "/api/v1/routines/" + routine["id"],
            headers=h,
            json={"version": routine["version"], "name": "Changed"},
        ).status_code
        == 200
    )
    assert get(c, h, "/sessions/" + s["id"])["name"] == "Strength"
    set_id = s["exercises"][0]["sets"][0]["id"]
    r = c.put(
        "/api/v1/sessions/" + s["id"] + "/sets/" + set_id,
        headers=h,
        json={"version": s["version"], "load": "60", "reps": 10},
    )
    assert r.status_code == 200, r.text
    s = r.json()
    assert s["volume"] == "600" and s["rest_until"]
    s = post(c, h, "/sessions/" + s["id"] + "/finish", {"version": s["version"]})
    assert s["status"] == "finished"
    assert (
        c.put(
            "/api/v1/sessions/" + s["id"] + "/sets/" + set_id,
            headers=h,
            json={"version": s["version"], "load": "70", "reps": 10},
        ).status_code
        == 422
    )
    assert get(c, h, "/audit")


def test_demo_reset_scoped_and_integration_explicit(client):
    c = client
    a, b = demo(c), demo(c)
    before = get(c, b, "/tasks")
    post(c, a, "/auth/demo/reset", {})
    assert get(c, b, "/tasks") == before
    assert get(c, a, "/integrations/telegram")["provider_mode"] == "fixture"
    assert c.post("/api/v1/integrations/telegram/webhook", json={"update_id": 1}).status_code == 401


def test_planned_cancel_posted_immutability_and_reversal(client):
    c = client
    h = demo(c)
    account = post(c, h, "/accounts", {"name": "Lifecycle"})
    baseline = get(c, h, "/finance/report?basis=cash")
    data = {
        "account_id": account["id"],
        "kind": "expense",
        "amount": 1234,
        "description": "Planned",
        "date": "2026-09-03",
        "status": "planned",
    }
    planned = post(c, h, "/transactions", data)
    response = c.patch(
        "/api/v1/transactions/" + planned["id"],
        headers=h,
        json={"version": planned["version"], "status": "cancelled"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"
    posted = post(c, h, "/transactions", {**data, "status": "posted"})
    assert (
        c.patch(
            "/api/v1/transactions/" + posted["id"],
            headers=h,
            json={"version": posted["version"], "amount": 555},
        ).status_code
        == 409
    )
    post(
        c,
        h,
        "/transactions/" + posted["id"] + "/reverse",
        {"reason": "Duplicate charge"},
        "reverse-charge-01",
    )
    actual = get(c, h, "/accounts/" + account["id"])
    assert actual["current_balance"] == 0
    assert actual["projected_balance"] == 0
    assert get(c, h, "/finance/report?basis=cash") == baseline


def test_cash_accrual_no_duplicate_payment_closed_refund(client):
    c = client
    h = demo(c)
    today = get(c, h, "/dashboard")["today"]
    account = post(c, h, "/accounts", {"name": "Isolated reports"})
    card = post(c, h, "/cards", {"name": "Reports", "close_day": 28, "due_day": 5})
    old = post(
        c,
        h,
        "/purchases",
        {
            "card_id": card["id"],
            "description": "Old charge",
            "amount": 3000,
            "installment_count": 1,
            "purchase_date": "2020-01-01",
        },
        "old-purchase-001",
    )
    invoice = old["installments"][0]["invoice_id"]
    assert (
        c.post(
            "/api/v1/purchases/" + old["id"] + "/cancel",
            headers={**h, "Idempotency-Key": "cancel-closed-01"},
            json={"reason": "Cannot cancel closed"},
        ).status_code
        == 409
    )
    before = get(c, h, "/finance/report?basis=accrual")
    post(
        c,
        h,
        "/invoices/" + invoice + "/payments",
        {"account_id": account["id"], "amount": 3000, "date": today},
        "old-invoice-pay-1",
    )
    after = get(c, h, "/finance/report?basis=accrual")
    assert before == after
    refunded = post(
        c, h, "/purchases/" + old["id"] + "/refund", {"reason": "Returned item"}, "refund-purchase1"
    )
    assert refunded["status"] == "refunded"
    assert sum(i["amount"] for i in refunded["installments"]) == 0
    assert get(c, h, "/invoices/" + invoice)["total"] == 3000
    assert any(i["amount"] == -3000 for i in refunded["installments"])


def test_habit_history_and_quantity_put_delete(client):
    c = client
    h = demo(c)
    today = get(c, h, "/dashboard")["today"]
    habit = post(c, h, "/habits", {"name": "Hydration", "target_quantity": 3})
    path = "/api/v1/habits/" + habit["id"]
    first = c.put(path + "/checkins/" + today, headers=h, json={"quantity": 2})
    assert first.status_code == 200
    assert get(c, h, "/habits/" + habit["id"] + "/stats")["current_streak"] == 0
    second = c.put(path + "/checkins/" + today, headers=h, json={"quantity": 3})
    assert second.json()["id"] == first.json()["id"]
    assert get(c, h, "/habits/" + habit["id"] + "/stats")["current_streak"] == 1
    changed = c.patch(
        path,
        headers=h,
        json={"version": habit["version"], "schedule": {"kind": "times_per_week", "times_per_week": 2}},
    )
    assert changed.status_code == 200, changed.text
    assert changed.json()["schedule"]["kind"] == "daily"
    assert c.delete(path + "/checkins/" + today, headers=h).status_code == 200
    assert get(c, h, "/habits/" + habit["id"] + "/stats")["current_streak"] == 0
    assert c.put(path + "/checkins/2099-01-01", headers=h, json={"quantity": 3}).status_code == 422


def test_same_key_concurrent_purchase_and_payment(client):
    c = client
    h = demo(c)
    account = post(c, h, "/accounts", {"name": "Concurrency"})
    card = post(c, h, "/cards", {"name": "Concurrent", "close_day": 28, "due_day": 5})
    body = {
        "card_id": card["id"],
        "description": "One charge",
        "amount": 1000,
        "installment_count": 1,
        "purchase_date": "2026-09-03",
    }
    with ThreadPoolExecutor(2) as pool:
        responses = list(
            pool.map(
                lambda _: c.post(
                    "/api/v1/purchases", headers={**h, "Idempotency-Key": "same-concurrent-1"}, json=body
                ),
                range(2),
            )
        )
    assert all(r.status_code == 201 for r in responses)
    assert responses[0].json()["id"] == responses[1].json()["id"]
    invoice = responses[0].json()["installments"][0]["invoice_id"]
    with ThreadPoolExecutor(2) as pool:
        responses = list(
            pool.map(
                lambda key: c.post(
                    "/api/v1/invoices/" + invoice + "/payments",
                    headers={**h, "Idempotency-Key": key},
                    json={"account_id": account["id"], "amount": 700, "date": "2026-09-03"},
                ),
                ["concurrent-pay-1", "concurrent-pay-2"],
            )
        )
    assert sorted(r.status_code for r in responses) == [200, 422]
    assert get(c, h, "/invoices/" + invoice)["paid"] == 700


def test_database_composite_foreign_key_rejects_other_owner(client):
    from uuid import UUID

    from sqlalchemy.exc import IntegrityError

    from app.db import SessionLocal
    from app.models import Task

    c = client
    a, b = demo(c), demo(c)
    owner_a = get(c, a, "/me")["id"]
    list_b = get(c, b, "/task-lists")[0]["id"]
    with pytest.raises(IntegrityError), SessionLocal.begin() as db:
        db.add(
            Task(
                owner_id=UUID(owner_a),
                data={
                    "list_id": list_b,
                    "title": "Foreign reference",
                    "description": "",
                    "status": "todo",
                    "priority": "none",
                    "due_date": None,
                    "start_date": None,
                    "estimate_minutes": None,
                    "tags": [],
                    "checklist": [],
                    "position": 0,
                    "archived": False,
                    "completed_at": None,
                },
            )
        )
        db.flush()


def test_extra_workout_set_and_audited_edit_recomputes(client):
    c = client
    h = demo(c)
    session = get(c, h, "/sessions/active")
    exercise = session["exercises"][0]
    session = post(
        c,
        h,
        "/sessions/" + session["id"] + "/sets",
        {
            "version": session["version"],
            "exercise_id": exercise["exercise_id"],
            "load": "500",
            "reps": 1,
            "type": "warmup",
        },
    )
    item = session["exercises"][0]["sets"][-1]
    response = c.put(
        "/api/v1/sessions/" + session["id"] + "/sets/" + item["id"],
        headers=h,
        json={"version": session["version"], "load": "500", "reps": 1, "type": "warmup"},
    )
    assert response.status_code == 200
    session = response.json()
    assert session["pr_count"] == 0 and session["volume"] == "500"
    session = post(
        c, h, "/sessions/" + session["id"] + "/finish", {"version": session["version"], "notes": "Felt good"}
    )
    response = c.put(
        "/api/v1/sessions/" + session["id"] + "/sets/" + item["id"],
        headers=h,
        json={
            "version": session["version"],
            "load": "501",
            "reps": 2,
            "type": "normal",
            "reason": "Correcting recorded load",
        },
    )
    assert response.status_code == 200
    assert response.json()["volume"] == "1002" and response.json()["pr_count"] == 1
    assert response.json()["notes"] == "Felt good"


def test_single_currency_contract_prevents_mixed_totals(client):
    c = client
    h = demo(c)
    assert (
        c.post("/api/v1/accounts", headers=h, json={"name": "Dollar account", "currency": "USD"}).status_code
        == 422
    )
    me = get(c, h, "/me")
    assert (
        c.patch("/api/v1/me", headers=h, json={"version": me["version"], "currency": "USD"}).status_code
        == 409
    )


def test_refund_credit_carries_to_future_installments(client):
    c = client
    h = demo(c)
    today = get(c, h, "/dashboard")["today"]
    card = post(c, h, "/cards", {"name": "Refund credit", "close_day": 28, "due_day": 5})
    purchase = post(
        c,
        h,
        "/purchases",
        {
            "card_id": card["id"],
            "description": "Returned immediately",
            "amount": 3000,
            "installment_count": 3,
            "purchase_date": today,
        },
        "refund-credit-purchase",
    )
    post(c, h, "/purchases/" + purchase["id"] + "/refund", {"reason": "Item returned"}, "refund-credit-apply")
    invoices = get(c, h, "/invoices?card_id=" + card["id"])
    assert sum(i["remaining"] for i in invoices) == 0


def test_telegram_durable_dedup_and_one_use_link(client, monkeypatch):
    from sqlalchemy import select

    from app.config import settings
    from app.db import SessionLocal
    from app.integrations import process_inbox
    from app.models import Inbox, Outbox

    c = client
    from test_local_auth import ORIGIN, PASSWORD, login

    from app.accounts import provision

    monkeypatch.setattr(settings(), "app_mode", "personal")
    monkeypatch.setattr(settings(), "allowed_origins", "https://testserver")
    c.base_url = "https://testserver"
    with SessionLocal.begin() as db:
        user = provision(db, "owner@example.com", PASSWORD)
        c.test_users.append(str(user.id))
    assert login(c).status_code == 200
    h = ORIGIN
    for key in ["telegram_bot_token", "telegram_provider_url", "telegram_provider_key"]:
        monkeypatch.setattr(settings(), key, "configured")
    monkeypatch.setattr(settings(), "telegram_webhook_secret", "test-webhook-secret")
    code = post(c, h, "/integrations/telegram/link", {})["code"]
    body = {
        "update_id": 123456789,
        "message": {"chat": {"id": 50001, "type": "private"}, "text": "/start " + code},
    }
    headers = {"X-Telegram-Bot-Api-Secret-Token": "test-webhook-secret"}
    for _ in range(2):
        assert c.post("/api/v1/integrations/telegram/webhook", headers=headers, json=body).status_code == 200
    assert process_inbox()
    assert get(c, h, "/integrations/telegram")["linked"] is True
    with SessionLocal() as db:
        inboxes = list(db.scalars(select(Inbox).where(Inbox.update_id == str(body["update_id"]))))
        assert len(inboxes) == 1 and inboxes[0].status == "processed"
        assert db.scalar(select(Outbox).where(Outbox.inbox_id == inboxes[0].id)).status == "pending"
    replay = {
        **body,
        "update_id": 123456790,
        "message": {"chat": {"id": 50002, "type": "private"}, "text": "/start " + code},
    }
    assert c.post("/api/v1/integrations/telegram/webhook", headers=headers, json=replay).status_code == 200
    assert process_inbox()
    with SessionLocal.begin() as db:
        for row in db.scalars(select(Inbox).where(Inbox.update_id.in_(["123456789", "123456790"]))):
            db.delete(row)


def test_demo_seed_bounded_query_count(client):
    from sqlalchemy import event

    from app.db import engine

    statements = []

    def track(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", track)
    try:
        demo(client)
    finally:
        event.remove(engine, "before_cursor_execute", track)
    assert len(statements) < 1000


def test_unknown_and_wrong_method_errors_use_problem_json(client):
    for method, path in [("GET", "/api/v1/missing"), ("DELETE", "/api/v1/config")]:
        response = client.request(method, path)
        assert response.headers["content-type"].startswith("application/problem+json")
        assert response.json()["status"] in (404, 405)


def test_dashboard_workout_month_uses_profile_timezone(client, monkeypatch):
    from datetime import UTC, datetime
    from uuid import UUID

    from app.clock import clock
    from app.db import SessionLocal
    from app.models import WorkoutSession

    monkeypatch.setattr(clock, "now", lambda: datetime(2026, 9, 10, 12, tzinfo=UTC))
    h = demo(client)
    before = get(client, h, "/dashboard")
    with SessionLocal.begin() as db:
        session = db.get(WorkoutSession, UUID(before["last_session"]["id"]))
        session.started_at = datetime(2026, 9, 1, 1, tzinfo=UTC)
    assert get(client, h, "/dashboard")["workout_count"] == before["workout_count"] - 1
