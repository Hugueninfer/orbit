from datetime import datetime, timedelta
from uuid import uuid4

from test_api import demo, get, post

from app.clock import clock


def start(c, h, **values):
    return post(c, h, "/focus/start", {"duration_minutes": 25, "species": "oak", **values}, str(uuid4()))


def command(c, h, row, action):
    return c.post(f"/api/v1/focus/{row['id']}/{action}", headers=h, json={"version": row["version"]})


def test_focus_pause_resume_and_award_once(client, monkeypatch):
    h = demo(client)
    now = clock.now()
    monkeypatch.setattr(clock, "now", lambda: now)
    row = start(client, h)
    assert get(client, h, "/focus")["active"]["id"] == row["id"]
    assert command(client, h, row, "complete").status_code == 409
    now += timedelta(minutes=10)
    paused = command(client, h, row, "pause").json()
    assert paused["remaining_seconds"] == 900
    now += timedelta(hours=2)
    assert get(client, h, "/focus")["active"]["remaining_seconds"] == 900
    resumed = command(client, h, paused, "resume").json()
    assert command(client, h, row, "pause").status_code == 409
    now += timedelta(minutes=15)
    before = get(client, h, "/focus")["stats"]["trees"]
    finished = command(client, h, resumed, "complete")
    assert finished.status_code == 200, finished.text
    assert finished.json()["status"] == "completed"
    assert command(client, h, resumed, "complete").status_code == 200
    assert get(client, h, "/focus")["stats"]["trees"] == before + 1
    assert get(client, h, "/focus")["active"] is None


def test_focus_isolation_single_active_cancel_and_break(client, monkeypatch):
    a, b = demo(client), demo(client)
    now = clock.now()
    monkeypatch.setattr(clock, "now", lambda: now)
    before = get(client, a, "/focus")["stats"]["trees"]
    row = start(client, a)
    assert command(client, b, row, "pause").status_code == 404
    duplicate = client.post(
        "/api/v1/focus/start", headers={**a, "Idempotency-Key": str(uuid4())}, json={"duration_minutes": 1}
    )
    assert duplicate.status_code == 409
    assert command(client, a, row, "cancel").json()["status"] == "cancelled"
    rest = start(client, a, session_kind="break", duration_minutes=5)
    now += timedelta(minutes=5)
    assert command(client, a, rest, "complete").json()["status"] == "completed"
    assert get(client, a, "/focus")["stats"]["trees"] == before


def test_focus_idempotency_and_finish_before_new_session(client, monkeypatch):
    h = demo(client)
    now = clock.now()
    monkeypatch.setattr(clock, "now", lambda: now)
    key = str(uuid4())
    body = {"duration_minutes": 1, "species": "sakura"}
    first = post(client, h, "/focus/start", body, key)
    assert post(client, h, "/focus/start", body, key)["id"] == first["id"]
    now += timedelta(minutes=2)
    second = start(client, h)
    assert second["id"] != first["id"]
    garden = get(client, h, "/focus/history?garden=true")
    assert garden["items"][0]["id"] == first["id"]
    assert datetime.fromisoformat(garden["items"][0]["finished_at"]) == now - timedelta(minutes=1)


def test_demo_has_prepared_isolated_garden(client):
    a, b = demo(client), demo(client)
    first = get(client, a, "/focus/history?garden=true")["items"]
    second = get(client, b, "/focus/history?garden=true")["items"]
    assert len(first) == 10
    assert all(row["species"] in {"oak", "pine", "sakura"} for row in first)
    assert not {row["id"] for row in first} & {row["id"] for row in second}
    assert get(client, a, "/focus")["active"] is None


def test_concurrent_starts_are_serialized(client):
    from concurrent.futures import ThreadPoolExecutor

    h = demo(client)
    with ThreadPoolExecutor(2) as pool:
        results = list(
            pool.map(
                lambda _: client.post(
                    "/api/v1/focus/start",
                    headers={**h, "Idempotency-Key": str(uuid4())},
                    json={"duration_minutes": 25},
                ),
                range(2),
            )
        )
    assert sorted(r.status_code for r in results) == [201, 409]


def test_focus_reset_preserves_other_owner_and_restores_base(client):
    a, b = demo(client), demo(client)
    row = start(client, a)
    other = start(client, b)
    reset = client.post("/api/v1/auth/demo/reset", headers=a, json={})
    assert reset.status_code in (200, 204), reset.text
    assert get(client, a, "/focus")["active"] is None
    assert len(get(client, a, "/focus/history?garden=true")["items"]) == 10
    assert get(client, b, "/focus")["active"]["id"] == other["id"]
    assert command(client, a, row, "cancel").status_code == 404
