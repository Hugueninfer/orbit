from uuid import uuid4

from test_api import demo, get, post
from test_focus import command, start


def test_random_catalog_exhausts_before_repeating_and_avoids_last_after_reset():
    from app.tree_collection import draw_variant

    used, last = [], None
    for _ in range(10):
        variant, used, rollover = draw_variant(used, last)
        assert variant != last
        assert rollover is False
        last = variant
    assert set(used) == set(range(10))
    variant, used, rollover = draw_variant(used, last)
    assert rollover is True and variant != last and used == [variant]
    variant, used, rollover = draw_variant([], last)
    assert variant != last and len(used) == 1


def test_draw_is_persisted_idempotent_and_reset_preserves_garden(client):
    h = demo(client)
    state = get(client, h, "/focus")
    assert state["stats"]["trees"] == 10
    assert state["collection"]["used_count"] == 10
    ids = {r["variant_id"] for r in get(client, h, "/focus/history?garden=true")["items"]}
    assert len(ids) == 10
    key = str(uuid4())
    body = {"duration_minutes": 1}
    row = post(client, h, "/focus/start", body, key)
    assert row["variant_id"] != get(client, h, "/focus/history?garden=true")["items"][0]["variant_id"]
    assert get(client, h, "/focus")["collection"]["cycle"] == 2
    assert post(client, h, "/focus/start", body, key)["variant_id"] == row["variant_id"]
    assert get(client, h, "/focus")["collection"]["used_count"] == 1
    assert get(client, h, "/focus")["active"]["variant_id"] == row["variant_id"]
    assert command(client, h, row, "cancel").status_code == 200
    before = get(client, h, "/focus")["collection"]
    resetkey = str(uuid4())
    reset = post(client, h, "/focus/collection/reset", {"version": before["version"]}, resetkey)
    assert reset["used_count"] == 0
    assert post(client, h, "/focus/collection/reset", {"version": before["version"]}, resetkey) == reset
    assert get(client, h, "/focus")["stats"]["trees"] == 10
    following = start(client, h)
    assert following["variant_id"] != row["variant_id"]


def test_break_does_not_draw_and_demo_reset_rerolls_ten(client, monkeypatch):
    h = demo(client)
    before = get(client, h, "/focus")
    tree_ids = [r["variant_id"] for r in get(client, h, "/focus/history?garden=true")["items"]]
    row = start(client, h, session_kind="break")
    assert row["variant_id"] is None
    assert get(client, h, "/focus")["collection"] == before["collection"]
    from types import SimpleNamespace

    monkeypatch.setattr(
        "app.demo_template.SystemRandom", lambda: SimpleNamespace(sample=lambda pool, count: tree_ids[::-1])
    )
    post(client, h, "/auth/demo/reset", {})
    after = get(client, h, "/focus")
    assert after["collection"]["used_count"] == 10
    assert after["stats"]["trees"] == 10
    assert tree_ids[::-1] == [r["variant_id"] for r in get(client, h, "/focus/history?garden=true")["items"]]


def test_legacy_start_retry_without_variant_field_still_works(client):
    from uuid import UUID

    from app.db import SessionLocal
    from app.models import Idempotency

    h = demo(client)
    key = str(uuid4())
    body = {"duration_minutes": 1, "species": "oak"}
    original = post(client, h, "/focus/start", body, key)
    owner_id = UUID(get(client, h, "/me")["id"])
    with SessionLocal.begin() as db:
        record = db.get(Idempotency, (owner_id, key))
        record.response = {k: v for k, v in record.response.items() if k != "variant_id"}
    replay = post(client, h, "/focus/start", body, key)
    assert replay["id"] == original["id"]
    assert replay["variant_id"] is None
