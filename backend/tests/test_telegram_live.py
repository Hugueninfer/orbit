import hashlib
import threading
from datetime import timedelta

from sqlalchemy import select
from test_api import get, post
from test_local_auth import ORIGIN, login, personal  # noqa: F401


def configure(monkeypatch):
    from app.config import settings

    for key, value in {
        "telegram_bot_token": "fake",
        "telegram_webhook_secret": "test-secret",
        "telegram_provider_url": "",
        "telegram_provider_key": "",
        "gemini_api_key": "fake",
        "telegram_bot_username": "OrbitTestBot",
    }.items():
        monkeypatch.setattr(settings(), key, value, raising=False)


def test_gemini_configuration_enables_bot_and_deep_link(personal, monkeypatch):  # noqa: F811
    configure(monkeypatch)
    assert login(personal).status_code == 200
    status = get(personal, {}, "/integrations/telegram")
    assert status["enabled"] is True
    code = post(personal, ORIGIN, "/integrations/telegram/link", {})
    assert code["bot_url"] == "https://t.me/OrbitTestBot?start=" + code["code"]


def test_voice_clarification_text_records_once_and_clears_draft(personal, monkeypatch):  # noqa: F811
    from uuid import UUID

    import httpx

    from app.clock import clock
    from app.db import SessionLocal
    from app.integrations import process_inbox
    from app.models import Inbox, Outbox, TelegramLink

    configure(monkeypatch)
    assert login(personal).status_code == 200
    account = post(personal, ORIGIN, "/accounts", {"name": "Conta teste", "type": "checking"})
    owner = get(personal, {}, "/me")["id"]
    chat = "70123"
    with SessionLocal.begin() as db:
        db.add(
            TelegramLink(
                owner_id=UUID(owner),
                code_digest=hashlib.sha256(b"x").hexdigest(),
                expires_at=clock.now() + timedelta(minutes=10),
                chat_id=chat,
            )
        )
    real_client = httpx.Client

    def transport(req):
        if req.url.path.endswith("/getFile"):
            return httpx.Response(200, json={"ok": True, "result": {"file_path": "voice/test.ogg"}})
        return httpx.Response(200, content=b"OggS-test")

    monkeypatch.setattr(
        "app.integrations.httpx.Client",
        lambda **kw: real_client(transport=httpx.MockTransport(transport), **kw),
    )

    class Provider:
        def extract(self, audio, context):
            if audio:
                return {
                    "needs_clarification": True,
                    "question": "Qual foi o valor?",
                    "description": "Almoço",
                    "account_id": account["id"],
                }
            assert context["message"] == "35 reais"
            assert context["pending"]["description"] == "Almoço"
            return {
                "entry_type": "transaction",
                "account_id": account["id"],
                "amount": 3500,
                "description": "Almoço",
            }

    def send(identifier, message):
        body = {"update_id": identifier, "message": {"chat": {"id": int(chat), "type": "private"}, **message}}
        r = personal.post(
            "/api/v1/integrations/telegram/webhook",
            headers={"X-Telegram-Bot-Api-Secret-Token": "test-secret"},
            json=body,
        )
        assert r.status_code == 200

    send(990001, {"voice": {"file_id": "test", "duration": 3, "file_size": 20}})
    assert process_inbox(Provider())
    assert get(personal, {}, "/transactions") == []
    with SessionLocal() as db:
        draft = db.scalar(select(Inbox).where(Inbox.update_id == "990001"))
        assert draft.status == "needs_clarification"
    send(990002, {"text": "35 reais"})
    assert process_inbox(Provider())
    send(990002, {"text": "35 reais"})
    assert not process_inbox(Provider())
    rows = get(personal, {}, "/transactions")
    assert len(rows) == 1 and rows[0]["amount"] == 3500
    with SessionLocal() as db:
        draft = db.scalar(select(Inbox).where(Inbox.update_id == "990001"))
        assert "pending" not in draft.payload
        result = db.scalar(select(Inbox).where(Inbox.update_id == "990002"))
        reply = db.scalar(select(Outbox).where(Outbox.inbox_id == result.id))
        assert "35,00" in reply.payload["text"]


def test_embedded_worker_drains_saved_messages_and_stops(monkeypatch):
    from app import telegram_worker

    processed = threading.Event()
    sent = threading.Event()
    stop = threading.Event()

    def process():
        if processed.is_set():
            return False
        processed.set()
        return True

    def deliver():
        if processed.is_set():
            sent.set()
        stop.set()
        return True

    monkeypatch.setattr(telegram_worker, "process_inbox", process)
    monkeypatch.setattr(telegram_worker, "deliver_outbox", deliver)
    thread = threading.Thread(target=telegram_worker.run, args=(stop,))
    thread.start()
    thread.join(timeout=3)
    assert processed.is_set() and sent.is_set() and not thread.is_alive()


def test_queued_audio_cannot_cross_a_changed_chat_owner(personal, monkeypatch):  # noqa: F811
    from uuid import UUID

    from app.accounts import provision
    from app.clock import clock
    from app.db import SessionLocal
    from app.integrations import process_inbox
    from app.models import Inbox, TelegramLink

    configure(monkeypatch)
    assert login(personal).status_code == 200
    first = UUID(get(personal, {}, "/me")["id"])
    with SessionLocal.begin() as db:
        second = provision(db, "second@example.com", "a long test password 2026")
        personal.test_users.append(str(second.id))
        db.add(
            TelegramLink(
                owner_id=second.id,
                code_digest="x" * 64,
                expires_at=clock.now() + timedelta(minutes=10),
                chat_id="70124",
            )
        )
        db.add(
            Inbox(
                update_id="990003",
                owner_id=first,
                payload={"chat_id": "70124", "voice": {"file_id": "old"}},
                status="pending",
            )
        )

    class NeverProvider:
        def extract(self, *args):
            raise AssertionError("A relinked chat must not process old-owner audio")

    assert process_inbox(NeverProvider())
    with SessionLocal() as db:
        assert db.scalar(select(Inbox).where(Inbox.update_id == "990003")).status == "ignored"


def test_linking_an_already_owned_chat_does_not_poison_queue(personal, monkeypatch):  # noqa: F811
    from uuid import UUID

    from app.accounts import provision
    from app.clock import clock
    from app.db import SessionLocal
    from app.integrations import process_inbox
    from app.models import Inbox, TelegramLink

    configure(monkeypatch)
    assert login(personal).status_code == 200
    first = UUID(get(personal, {}, "/me")["id"])
    code = "ANOTHERCODE"
    with SessionLocal.begin() as db:
        second = provision(db, "another@example.com", "a long test password 2026")
        personal.test_users.append(str(second.id))
        db.add(
            TelegramLink(
                owner_id=first,
                code_digest="x" * 64,
                expires_at=clock.now() + timedelta(minutes=10),
                chat_id="70125",
            )
        )
        db.add(
            TelegramLink(
                owner_id=second.id,
                code_digest=hashlib.sha256(code.encode()).hexdigest(),
                expires_at=clock.now() + timedelta(minutes=10),
                chat_id=None,
            )
        )
        db.add(
            Inbox(
                update_id="990004",
                owner_id=first,
                payload={"chat_id": "70125", "text": "/start " + code},
                status="pending",
            )
        )
    assert process_inbox()
    assert not process_inbox()
    with SessionLocal() as db:
        assert db.scalar(select(TelegramLink).where(TelegramLink.chat_id == "70125")).owner_id == first


def test_worker_expires_old_clarification_without_calling_ai(personal, monkeypatch):  # noqa: F811
    from uuid import UUID

    from app.clock import clock
    from app.db import SessionLocal
    from app.integrations import process_inbox
    from app.models import Inbox

    configure(monkeypatch)
    assert login(personal).status_code == 200
    owner = UUID(get(personal, {}, "/me")["id"])
    with SessionLocal.begin() as db:
        db.add(
            Inbox(
                update_id="990005",
                owner_id=owner,
                status="needs_clarification",
                created_at=clock.now() - timedelta(minutes=31),
                payload={"chat_id": "70126", "pending": {"description": "private draft"}},
            )
        )
    assert not process_inbox()
    with SessionLocal() as db:
        row = db.scalar(select(Inbox).where(Inbox.update_id == "990005"))
        assert row.status == "expired" and row.payload == {}


def test_clarification_survives_provider_failure(personal, monkeypatch):  # noqa: F811
    from uuid import UUID

    from app.clock import clock
    from app.db import SessionLocal
    from app.integrations import process_inbox
    from app.models import Inbox, TelegramLink

    configure(monkeypatch)
    assert login(personal).status_code == 200
    account = post(personal, ORIGIN, "/accounts", {"name": "Conta", "type": "checking"})
    owner = UUID(get(personal, {}, "/me")["id"])
    with SessionLocal.begin() as db:
        db.add(
            TelegramLink(
                owner_id=owner,
                code_digest="z" * 64,
                expires_at=clock.now() + timedelta(minutes=10),
                chat_id="70127",
            )
        )
        db.add(
            Inbox(
                update_id="990006",
                owner_id=owner,
                status="needs_clarification",
                payload={
                    "chat_id": "70127",
                    "pending": {"description": "Almoço", "account_id": account["id"]},
                },
            )
        )
        db.add(
            Inbox(
                update_id="990007",
                owner_id=owner,
                status="pending",
                payload={"chat_id": "70127", "text": "35 reais"},
            )
        )

    class Unavailable:
        def extract(self, audio, context):
            raise ValueError("Gemini unavailable (HTTP 503)")

    assert process_inbox(Unavailable())
    with SessionLocal() as db:
        draft = db.scalar(select(Inbox).where(Inbox.update_id == "990006"))
        assert draft.status == "needs_clarification"
        assert draft.payload["pending"]["description"] == "Almoço"
    assert get(personal, {}, "/transactions") == []
