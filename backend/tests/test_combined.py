import hashlib
from datetime import timedelta
from uuid import UUID

import pytest
from sqlalchemy import select
from test_api import demo, get, post
from test_local_auth import ORIGIN, login, personal  # noqa: F401


@pytest.fixture
def combined(personal, monkeypatch):  # noqa: F811
    from app.config import settings

    monkeypatch.setattr(settings(), "app_mode", "combined")
    assert login(personal).status_code == 200
    return personal


def test_combined_default(monkeypatch):
    from app.config import Settings

    monkeypatch.delenv("APP_MODE", raising=False)
    assert Settings(_env_file=None).app_mode == "combined"


def test_cookie_bearer_isolation_reset_cleanup_and_quota(combined, monkeypatch):
    from app.clock import clock
    from app.config import settings
    from app.db import SessionLocal
    from app.identity import cleanup_demo
    from app.models import User

    c = combined
    owner = get(c, {}, "/me")["id"]
    private = post(c, ORIGIN, "/task-lists", {"name": "Private"})
    a, b = demo(c), demo(c)
    assert get(c, a, "/me")["id"] != owner
    assert c.get("/api/v1/task-lists/" + private["id"], headers=a).status_code == 404
    public = post(c, a, "/task-lists", {"name": "Demo only"})
    for h in [{}, b]:
        assert c.get("/api/v1/task-lists/" + public["id"], headers=h).status_code == 404
    assert c.post("/api/v1/auth/demo/reset", headers=ORIGIN).status_code == 404
    assert c.post("/api/v1/auth/demo/reset", headers=a).status_code == 200
    assert get(c, {}, "/task-lists/" + private["id"])["name"] == "Private"
    monkeypatch.setattr(settings(), "demo_max_records", 1)
    assert c.post("/api/v1/task-lists", headers=a, json={"name": "Over quota"}).status_code == 429
    assert c.post("/api/v1/task-lists", headers=ORIGIN, json={"name": "Owner unaffected"}).status_code == 201
    monkeypatch.setattr(settings(), "demo_max_records", 5000)
    demo_id = get(c, a, "/me")["id"]
    with SessionLocal.begin() as db:
        db.get(User, UUID(demo_id)).expires_at = clock.now() - timedelta(seconds=1)
    assert c.get("/api/v1/me", headers=a).status_code == 401
    with SessionLocal.begin() as db:
        cleanup_demo(db)
    assert get(c, {}, "/me")["id"] == owner
    assert get(c, b, "/me")["is_demo"] is True


@pytest.mark.parametrize("authorization", ["", "Basic abc", "Bearer", "Bearer invalid", "Bearer "])
def test_explicit_bad_authorization_never_falls_back(combined, authorization):
    assert combined.get("/api/v1/me", headers={"Authorization": authorization}).status_code == 401


def test_demo_expiration_and_logout_independence(combined):
    from app.clock import clock
    from app.db import SessionLocal
    from app.models import Token

    c = combined
    a, b = demo(c), demo(c)
    assert c.post("/api/v1/auth/logout", headers={**ORIGIN, **a}).status_code == 401
    assert c.get("/api/v1/me").status_code == 200
    assert c.post("/api/v1/auth/demo/logout", headers=a).status_code == 200
    assert c.get("/api/v1/me", headers=a).status_code == 401
    assert get(c, {}, "/me")["is_demo"] is False
    assert c.post("/api/v1/auth/demo/logout", headers=ORIGIN).status_code == 404
    with SessionLocal.begin() as db:
        db.get(Token, hashlib.sha256(b["Authorization"][7:].encode()).hexdigest()).expires_at = (
            clock.now() - timedelta(seconds=1)
        )
    assert c.get("/api/v1/me", headers=b).status_code == 401
    live = demo(c)
    assert c.post("/api/v1/auth/logout", headers=ORIGIN).status_code == 200
    assert c.get("/api/v1/me").status_code == 401
    assert get(c, live, "/me")["is_demo"] is True


def test_demo_telegram_stays_fixture_and_worker_never_links_or_sends(combined, monkeypatch):
    from app.config import settings
    from app.db import SessionLocal
    from app.integrations import deliver_outbox, process_inbox
    from app.models import Inbox, Outbox, TelegramLink

    c = combined
    for key in [
        "telegram_bot_token",
        "telegram_webhook_secret",
        "telegram_provider_url",
        "telegram_provider_key",
    ]:
        monkeypatch.setattr(settings(), key, "configured")
    a = demo(c)
    assert get(c, a, "/integrations/telegram")["provider_mode"] == "fixture"
    assert get(c, a, "/integrations/telegram")["enabled"] is False
    assert get(c, {}, "/integrations/telegram")["provider_mode"] == "live"
    assert post(c, a, "/integrations/telegram/simulate", {"text": "fixture"})["mode"] == "fixture"
    code = post(c, a, "/integrations/telegram/link", {})["code"]
    owner = UUID(get(c, a, "/me")["id"])
    assert (
        c.post(
            "/api/v1/integrations/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "configured"},
            json={
                "update_id": 991234,
                "message": {"chat": {"id": "combined-chat", "type": "private"}, "text": "/start " + code},
            },
        ).status_code
        == 200
    )
    assert process_inbox()
    with SessionLocal.begin() as db:
        link = db.scalar(select(TelegramLink).where(TelegramLink.owner_id == owner))
        assert link.chat_id is None
        # Legacy linked demo and pending outbox must also remain offline.
        link.chat_id = "combined-chat"
        inbox = Inbox(
            update_id="combined-voice",
            owner_id=owner,
            payload={"chat_id": "combined-chat", "voice": {"file_id": "never-download"}},
            status="pending",
        )
        db.add(inbox)
        db.flush()
        db.add(
            Outbox(
                inbox_id=inbox.id,
                payload={"chat_id": "combined-chat", "text": "never-send"},
                status="pending",
            )
        )
    assert process_inbox()
    assert deliver_outbox()
    with SessionLocal() as db:
        messages = list(db.scalars(select(Outbox).join(Inbox).where(Inbox.owner_id == owner)))
        assert all(row.status != "pending" for row in messages)
