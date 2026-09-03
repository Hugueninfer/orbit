"""Optional Telegram adapter with durable inbox/outbox and explicit provider ports."""

import base64
import hashlib
import json
import secrets
from datetime import timedelta
from typing import Protocol

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import Field
from sqlalchemy import delete, func, select, text
from sqlalchemy.orm import Session

from .clock import clock
from .config import settings
from .db import SessionLocal, database
from .finance import create_purchase
from .identity import authenticated
from .models import Inbox, Outbox, TelegramLink, User
from .resources import create_resource
from .responses import IntegrationStatus, LinkCode, Ok, SimulationOut
from .schemas import Input, PurchaseCreate, TransactionCreate
from .store import add, problem, rows, today

router = APIRouter()


class ExpenseProvider(Protocol):
    def extract(self, audio: bytes, context: dict) -> dict: ...


class HttpExpenseProvider:
    """Operator-supplied transcription+extraction gateway. No general assistant."""

    def extract(self, audio: bytes, context: dict) -> dict:
        config = settings()
        with httpx.Client(timeout=45) as client:
            response = client.post(
                config.telegram_provider_url,
                headers={"Authorization": "Bearer " + config.telegram_provider_key},
                json={
                    "audio_base64": base64.b64encode(audio).decode(),
                    "mime_type": "audio/ogg",
                    "context": context,
                },
            )
            response.raise_for_status()
            return response.json()


def enabled():
    config = settings()
    return bool(
        config.telegram_bot_token
        and config.telegram_webhook_secret
        and config.telegram_provider_url
        and config.telegram_provider_key
    )


@router.get("/integrations/telegram", response_model=IntegrationStatus)
def status(user: User = Depends(authenticated), db: Session = Depends(database, scope="function")):
    demo = settings().app_mode == "demo"
    return {
        "enabled": enabled(),
        "linked": any(r.data["chat_id"] for r in rows(db, user, "telegram_link")),
        "provider_mode": "fixture" if demo else "live" if enabled() else "disabled",
        "status": "Simulação identificada; nenhum áudio é enviado."
        if demo
        else "Provedor configurado; processamento pelo worker."
        if enabled()
        else "Integração desativada: configure bot e provedor de áudio.",
    }


@router.post("/integrations/telegram/link", response_model=LinkCode)
def link(user: User = Depends(authenticated), db: Session = Depends(database, scope="function")):
    if settings().app_mode != "demo" and not enabled():
        problem(503, "Integração Telegram não configurada")
    for row in rows(db, user, "telegram_link"):
        db.delete(row)
    db.flush()
    code = secrets.token_hex(4).upper()
    expires = clock.now() + timedelta(minutes=10)
    add(
        db,
        user,
        "telegram_link",
        {
            "code_digest": hashlib.sha256(code.encode()).hexdigest(),
            "expires_at": expires.isoformat(),
            "chat_id": None,
        },
    )
    return {"code": code, "expires_at": expires.isoformat()}


@router.delete("/integrations/telegram/link", response_model=Ok)
def unlink(user: User = Depends(authenticated), db: Session = Depends(database, scope="function")):
    db.execute(delete(TelegramLink).where(TelegramLink.owner_id == user.id))
    return {"ok": True}


def record_extraction(db, user, extracted):
    """Provider output is untrusted input and always passes the normal domain rules."""
    if extracted.get("needs_clarification"):
        return {
            "recorded": False,
            "question": str(extracted.get("question", "Confirme os dados da despesa."))[:1000],
        }
    payload = dict(extracted)
    kind = payload.pop("entry_type", "transaction")
    payload.setdefault("currency", user.profile["currency"])
    if kind == "purchase":
        payload.pop("currency", None)
        payload.setdefault("purchase_date", today(user).isoformat())
        payload.setdefault("installment_count", 1)
        data = PurchaseCreate.model_validate(payload).model_dump(mode="json")
        result = create_purchase(db, user, data)
    else:
        payload.setdefault("date", today(user).isoformat())
        payload.setdefault("kind", "expense")
        data = TransactionCreate.model_validate(payload).model_dump(mode="json")
        if data["kind"] != "expense":
            raise ValueError("A integração registra somente despesas")
        result = create_resource(db, user, "transaction", data)
    return {
        "recorded": True,
        "entry_type": kind,
        "id": result["id"],
        "amount": result["amount"],
        "description": result["description"],
    }


class Simulation(Input):
    text: str = Field(min_length=1, max_length=10000)


@router.post("/integrations/telegram/simulate", response_model=SimulationOut)
def simulate(
    body: Simulation, user: User = Depends(authenticated), db: Session = Depends(database, scope="function")
):
    if settings().app_mode != "demo":
        problem(404, "Simulação disponível somente na demonstração")
    try:
        extracted = json.loads(body.text)
    except json.JSONDecodeError:
        return {
            "id": None,
            "status": "needs_clarification",
            "mode": "fixture",
            "result": {
                "recorded": False,
                "question": 'Simulação determinística: informe JSON com account_id, amount em centavos, description, date e kind="expense".',
            },
        }
    result = record_extraction(db, user, extracted)
    inbox = Inbox(
        update_id="fixture:" + secrets.token_hex(16),
        owner_id=user.id,
        payload={"mode": "fixture"},
        status="processed",
    )
    db.add(inbox)
    db.flush()
    db.add(Outbox(inbox_id=inbox.id, payload={"mode": "fixture", "result": result}, status="simulated"))
    return {
        "id": str(inbox.id),
        "status": "processed" if result["recorded"] else "needs_clarification",
        "mode": "fixture",
        "result": result,
    }


@router.post("/integrations/telegram/webhook", response_model=Ok)
async def webhook(request: Request, db: Session = Depends(database, scope="function")):
    secret = settings().telegram_webhook_secret
    if not secret or not secrets.compare_digest(
        request.headers.get("X-Telegram-Bot-Api-Secret-Token", ""), secret
    ):
        problem(401, "Webhook não autorizado")
    body = await request.json()
    if not isinstance(body, dict) or not isinstance(body.get("update_id"), int):
        problem(422, "Update inválido")
    message = body.get("message", {})
    if message.get("chat", {}).get("type") != "private":
        return {"ok": True}
    db.execute(text("SELECT pg_advisory_xact_lock(7789103)"))
    update_id = str(body["update_id"])
    if db.scalar(select(Inbox).where(Inbox.update_id == update_id)):
        return {"ok": True}
    # Persist minimum required transport fields; never preserve full Telegram user profile.
    payload = {
        "chat_id": str(message["chat"]["id"]),
        "text": message.get("text", "")[:2000],
        "voice": message.get("voice"),
        "message_date": message.get("date"),
    }
    linked = db.scalar(select(TelegramLink).where(TelegramLink.chat_id == payload["chat_id"]))
    if (
        linked is None
        and (db.scalar(select(func.count()).select_from(Inbox).where(Inbox.owner_id.is_(None))) or 0)
        >= settings().integration_unlinked_inbox_limit
    ):
        problem(429, "Fila de integração temporariamente cheia")
    db.add(
        Inbox(
            update_id=update_id,
            owner_id=linked.owner_id if linked else None,
            payload=payload,
            status="pending",
        )
    )
    return {"ok": True}


def process_inbox(provider: ExpenseProvider | None = None):
    """One-shot worker; execute repeatedly via host scheduler or worker loop."""
    config = settings()
    provider = provider or HttpExpenseProvider()
    with SessionLocal.begin() as db:
        inbox = db.scalar(
            select(Inbox)
            .where(Inbox.status == "pending")
            .order_by(Inbox.created_at)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if inbox is None:
            return False
        payload = inbox.payload
        chat_id = payload["chat_id"]
        link = db.scalar(select(TelegramLink).where(TelegramLink.chat_id == chat_id))
        text_body = payload.get("text", "")
        response = "Envie /start CÓDIGO para vincular sua conta Orbit."
        if text_body.startswith("/start "):
            digest = hashlib.sha256(text_body[7:].strip().upper().encode()).hexdigest()
            link = db.scalar(
                select(TelegramLink)
                .where(
                    TelegramLink.code_digest == digest,
                    TelegramLink.chat_id.is_(None),
                    TelegramLink.expires_at > clock.now(),
                )
                .with_for_update()
            )
            if link:
                link.chat_id = chat_id
                inbox.owner_id = link.owner_id
                link.code_digest = secrets.token_hex(32)
                response = "Conta vinculada. Envie um áudio de despesa."
            else:
                response = "Código inválido, expirado ou já utilizado."
        elif link:
            user = db.scalar(select(User).where(User.id == link.owner_id).with_for_update())
            if user is None:
                inbox.status = "orphaned"
                return True
            inbox.owner_id = user.id
            if user.expires_at and user.expires_at <= clock.now():
                response = "Sessão expirada. Vincule novamente."
            elif not enabled():
                response = "Integração de áudio desativada. Nenhuma despesa foi registrada."
            elif payload.get("voice"):
                try:
                    voice = payload["voice"]
                    if voice.get("file_size", 0) > 10_000_000 or voice.get("duration", 0) > 180:
                        raise ValueError("Áudio acima do limite de 10 MB ou 3 minutos")
                    with httpx.Client(timeout=45) as client:
                        meta = client.get(
                            f"https://api.telegram.org/bot{config.telegram_bot_token}/getFile",
                            params={"file_id": voice["file_id"]},
                        )
                        meta.raise_for_status()
                        file_path = meta.json()["result"]["file_path"]
                        content = client.get(
                            f"https://api.telegram.org/file/bot{config.telegram_bot_token}/{file_path}"
                        )
                        content.raise_for_status()
                        audio = content.content
                    if len(audio) > 10_000_000:
                        raise ValueError("Áudio acima de 10 MB")
                    context = {
                        "locale": user.profile["locale"],
                        "accounts": [
                            {"id": str(r.id), "name": r.data["name"]} for r in rows(db, user, "account")
                        ],
                        "categories": [
                            {"id": str(r.id), "name": r.data["name"]} for r in rows(db, user, "category")
                        ],
                        "cards": [{"id": str(r.id), "name": r.data["name"]} for r in rows(db, user, "card")],
                    }
                    extracted = provider.extract(audio, context)
                    del audio
                    # Savepoint: malformed or ambiguous extraction never partially writes finance.
                    with db.begin_nested():
                        result = record_extraction(db, user, extracted)
                    response = (
                        f"Registrado: {result['description']} ({result['amount']} centavos). Abra o Orbit para editar ou desfazer."
                        if result["recorded"]
                        else result["question"]
                    )
                except (ValueError, KeyError, httpx.HTTPError, HTTPException):
                    response = "Não foi possível validar a despesa. Confirme os campos no Orbit; nenhum registro parcial foi salvo."
            else:
                response = "Envie um áudio de despesa. Esta integração não é um assistente geral."
        inbox.status = "processed"
        inbox.payload = {"chat_id": chat_id}  # Audio metadata/text removed after processing.
        db.add(Outbox(inbox_id=inbox.id, payload={"chat_id": chat_id, "text": response}, status="pending"))
    return True


def deliver_outbox():
    if not settings().telegram_bot_token:
        return False
    with SessionLocal.begin() as db:
        row = db.scalar(
            select(Outbox)
            .where(Outbox.status == "pending", Outbox.attempts < 5)
            .order_by(Outbox.created_at)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if row is None:
            return False
        row.attempts += 1
        try:
            response = httpx.post(
                f"https://api.telegram.org/bot{settings().telegram_bot_token}/sendMessage",
                json=row.payload,
                timeout=20,
            )
            response.raise_for_status()
            row.status = "sent"
        except httpx.HTTPError:
            if row.attempts >= 5:
                row.status = "failed"
    return True
