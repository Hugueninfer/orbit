from datetime import timedelta
from uuid import UUID, uuid4

import httpx
import pytest
from sqlalchemy import select
from test_local_auth import personal  # noqa: F401


def queue_reply(personal, monkeypatch, chat="78001"):  # noqa: F811
    from app.clock import clock
    from app.config import settings
    from app.db import SessionLocal
    from app.models import Inbox, Outbox, TelegramLink

    monkeypatch.setattr(settings(), "telegram_bot_token", "fake")
    owner = UUID(personal.test_users[-1])
    with SessionLocal.begin() as db:
        db.add(
            TelegramLink(
                owner_id=owner,
                code_digest=uuid4().hex * 2,
                expires_at=clock.now() + timedelta(minutes=10),
                chat_id=chat,
            )
        )
        inbox = Inbox(owner_id=owner, update_id=str(uuid4()), status="processed", payload={"chat_id": chat})
        db.add(inbox)
        db.flush()
        reply = Outbox(inbox_id=inbox.id, payload={"chat_id": chat, "text": "Despesa privada: 35 reais"})
        db.add(reply)
        db.flush()
        return reply.id


@pytest.mark.parametrize("replacement", [False, True])
def test_pending_financial_reply_is_suppressed_after_unlink_or_relink(personal, monkeypatch, replacement):  # noqa: F811
    from app.accounts import provision
    from app.db import SessionLocal
    from app.integrations import deliver_outbox
    from app.models import Outbox, TelegramLink

    reply_id = queue_reply(personal, monkeypatch)
    with SessionLocal.begin() as db:
        link = db.scalar(select(TelegramLink).where(TelegramLink.chat_id == "78001"))
        if replacement:
            other = provision(db, "delivery-other@example.com", "long test password 2026")
            personal.test_users.append(str(other.id))
            link.owner_id = other.id
        else:
            db.delete(link)

    def forbidden(*args, **kwargs):
        pytest.fail("Revoked owner data must never be sent to Telegram")

    monkeypatch.setattr("app.integrations.httpx.post", forbidden)
    assert deliver_outbox()
    with SessionLocal() as db:
        reply = db.get(Outbox, reply_id)
        assert reply.status == "ignored" and reply.attempts == 0


def test_rate_limit_survives_new_session_and_does_not_block_other_chats(personal, monkeypatch):  # noqa: F811
    from app.clock import clock
    from app.db import SessionLocal
    from app.integrations import deliver_outbox
    from app.models import Outbox

    instant = clock.now()
    monkeypatch.setattr(clock, "now", lambda: instant)
    first = queue_reply(personal, monkeypatch)
    sent_payloads = []

    def send(url, json, **kwargs):
        sent_payloads.append(json)
        request = httpx.Request("POST", url)
        if len(sent_payloads) == 1:
            return httpx.Response(
                429,
                request=request,
                json={
                    "ok": False,
                    "error_code": 429,
                    "description": "Too Many Requests",
                    "parameters": {"retry_after": 90},
                },
            )
        return httpx.Response(200, request=request, json={"ok": True, "result": {"message_id": 1}})

    monkeypatch.setattr("app.integrations.httpx.post", send)
    assert deliver_outbox()
    assert not deliver_outbox()
    with SessionLocal() as db:
        assert db.get(Outbox, first).attempts == 1
    second = queue_reply(personal, monkeypatch, "78002")
    assert deliver_outbox()
    with SessionLocal() as db:
        assert db.get(Outbox, second).status == "sent"
        assert db.get(Outbox, first).status == "pending"
    instant += timedelta(seconds=89)
    assert not deliver_outbox()
    instant += timedelta(seconds=1)
    assert deliver_outbox()
    with SessionLocal() as db:
        assert db.get(Outbox, first).status == "sent"
    assert all(set(payload) == {"chat_id", "text"} for payload in sent_payloads)


@pytest.mark.parametrize("failure", ["network", "503"])
def test_transient_delivery_failure_is_spaced_and_eventually_bounded(personal, monkeypatch, failure):  # noqa: F811
    from app.clock import clock
    from app.db import SessionLocal
    from app.integrations import deliver_outbox
    from app.models import Outbox

    instant = clock.now()
    monkeypatch.setattr(clock, "now", lambda: instant)
    reply_id = queue_reply(personal, monkeypatch)

    def fail(url, **kwargs):
        request = httpx.Request("POST", url)
        if failure == "network":
            raise httpx.ConnectError("temporary outage", request=request)
        return httpx.Response(503, request=request, json={"ok": False, "description": "Unavailable"})

    monkeypatch.setattr("app.integrations.httpx.post", fail)
    for _ in range(5):
        assert deliver_outbox()
        assert not deliver_outbox()
        instant += timedelta(hours=1)
    with SessionLocal() as db:
        reply = db.get(Outbox, reply_id)
        assert reply.status == "failed" and reply.attempts == 5
    assert not deliver_outbox()
