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
from sqlalchemy import delete, func, select, text, update
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
        and (config.gemini_api_key or (config.telegram_provider_url and config.telegram_provider_key))
    )


@router.get("/integrations/telegram", response_model=IntegrationStatus)
def status(user: User = Depends(authenticated), db: Session = Depends(database, scope="function")):
    demo = user.expires_at is not None
    return {
        "enabled": not demo and enabled(),
        "linked": any(r.data["chat_id"] for r in rows(db, user, "telegram_link")),
        "provider_mode": "fixture" if demo else "live" if enabled() else "disabled",
        "status": "Simulação identificada; nenhum áudio é enviado."
        if demo
        else "Envie áudios no chat privado do bot. O Gemini interpreta os dados para registrar a despesa."
        if enabled()
        else "Integração desativada: configure bot e provedor de áudio.",
    }


@router.post("/integrations/telegram/link", response_model=LinkCode)
def link(user: User = Depends(authenticated), db: Session = Depends(database, scope="function")):
    if user.expires_at is None and not enabled():
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
    username = settings().telegram_bot_username
    return {
        "code": code,
        "expires_at": expires.isoformat(),
        "bot_url": f"https://t.me/{username}?start={code}" if username else None,
    }


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
    if user.expires_at is None:
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
    db.execute(text("SELECT pg_advisory_xact_lock(7789104)"))
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
    if provider is None:
        if config.gemini_api_key:
            from .gemini import GeminiExpenseProvider

            provider = GeminiExpenseProvider()
        else:
            provider = HttpExpenseProvider()
    with SessionLocal.begin() as db:
        # Serialize the small embedded queue across rolling deploys/CLI workers.
        if not db.scalar(text("SELECT pg_try_advisory_xact_lock(7789105)")):
            return False
        db.execute(
            update(Inbox)
            .where(
                Inbox.status == "needs_clarification",
                Inbox.created_at <= clock.now() - timedelta(minutes=30),
            )
            .values(status="expired", payload={})
        )
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
        owner = db.get(User, inbox.owner_id) if inbox.owner_id else None
        linked_owner = db.get(User, link.owner_id) if link else None
        if any(candidate and candidate.expires_at is not None for candidate in (owner, linked_owner)):
            inbox.status = "ignored"
            inbox.payload = {"mode": "fixture"}
            return True
        if inbox.owner_id and (link is None or link.owner_id != inbox.owner_id):
            inbox.status = "ignored"
            inbox.payload = {"reason": "link_changed"}
            return True
        if text_body.startswith("/start "):
            existing_link = link
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
            code_owner = db.get(User, link.owner_id) if link else None
            if code_owner and code_owner.expires_at is not None:
                inbox.owner_id = code_owner.id
                inbox.status = "ignored"
                inbox.payload = {"mode": "fixture"}
                return True
            if link and existing_link and existing_link.id != link.id:
                response = "Este chat já está vinculado. Desvincule no Orbit antes de usar outra conta."
            elif link:
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
            elif payload.get("voice") or text_body:
                pending_rows = list(
                    db.scalars(
                        select(Inbox)
                        .where(Inbox.owner_id == user.id, Inbox.status == "needs_clarification")
                        .order_by(Inbox.created_at.desc())
                    )
                )
                pending = None
                for previous in pending_rows:
                    if (
                        pending is None
                        and not payload.get("voice")
                        and previous.payload.get("chat_id") == chat_id
                        and previous.created_at > clock.now() - timedelta(minutes=30)
                    ):
                        pending = previous.payload.get("pending")

                def clear_drafts():
                    for previous in pending_rows:
                        previous.payload = {"chat_id": chat_id}
                        previous.status = "processed"

                # Replacement audio and cancellation explicitly abandon the old draft.
                # A text retry preserves it until extraction and validation succeed.
                if payload.get("voice") or text_body == "/cancelar":
                    clear_drafts()
                if not payload.get("voice") and not pending:
                    response = "Envie um áudio de despesa. Para cancelar um esclarecimento, envie /cancelar."
                elif text_body == "/cancelar":
                    response = "Esclarecimento cancelado. Nenhuma despesa foi registrada."
                elif (
                    db.scalar(
                        select(func.count())
                        .select_from(Inbox)
                        .where(
                            Inbox.owner_id == user.id,
                            Inbox.created_at >= clock.now() - timedelta(days=1),
                            Inbox.status.in_(["processed", "needs_clarification"]),
                        )
                    )
                    or 0
                ) >= 50:
                    response = "Limite diário de 50 mensagens atingido. Registre pelo Orbit ou tente amanhã."
                else:
                    try:
                        audio = b""
                        if payload.get("voice"):
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
                                # Stream with a hard cap; don't trust Telegram metadata alone.
                                with client.stream(
                                    "GET",
                                    f"https://api.telegram.org/file/bot{config.telegram_bot_token}/{file_path}",
                                ) as content:
                                    content.raise_for_status()
                                    chunks = []
                                    size = 0
                                    for chunk in content.iter_bytes():
                                        size += len(chunk)
                                        if size > 10_000_000:
                                            raise ValueError("Áudio acima de 10 MB")
                                        chunks.append(chunk)
                                    audio = b"".join(chunks)
                        context = {
                            "locale": user.profile["locale"],
                            "currency": user.profile["currency"],
                            "today": today(user).isoformat(),
                            "message": text_body,
                            "pending": pending,
                            "accounts": [
                                {"id": str(r.id), "name": r.data["name"]}
                                for r in rows(db, user, "account")
                                if not r.data["archived"]
                            ],
                            "categories": [
                                {"id": str(r.id), "name": r.data["name"]}
                                for r in rows(db, user, "category")
                                if not r.data["archived"] and r.data["category_kind"] == "expense"
                            ],
                            "cards": [
                                {"id": str(r.id), "name": r.data["name"]}
                                for r in rows(db, user, "card")
                                if not r.data["archived"]
                            ],
                        }
                        if not context["accounts"] and not context["cards"]:
                            response = "Cadastre uma conta ou cartão em Finanças no Orbit antes de enviar sua despesa."
                        else:
                            extracted = provider.extract(audio, context)
                            del audio
                            with db.begin_nested():
                                result = record_extraction(db, user, extracted)
                            clear_drafts()
                            if result["recorded"]:
                                amount = f"{result['amount'] // 100},{result['amount'] % 100:02d}"
                                response = f"Registrado: {result['description']} — {user.profile['currency']} {amount}. Abra o Orbit para conferir ou corrigir."
                            else:
                                response = (
                                    result["question"]
                                    + " Responda por texto em até 30 minutos ou envie /cancelar."
                                )
                                inbox.status = "needs_clarification"
                                inbox.payload = {"chat_id": chat_id, "pending": extracted}
                    except (ValueError, KeyError, TypeError, httpx.HTTPError, HTTPException):
                        response = "Não consegui interpretar o áudio agora. Nenhuma despesa foi registrada. Tente novamente, informando valor, descrição e conta/cartão; verifique também se o áudio tem até 3 minutos."
            else:
                response = "Envie um áudio de despesa. Esta integração não é um assistente geral."
        if inbox.status != "needs_clarification":
            inbox.status = "processed"
            inbox.payload = {"chat_id": chat_id}  # Audio metadata/text removed after processing.
        db.add(Outbox(inbox_id=inbox.id, payload={"chat_id": chat_id, "text": response}, status="pending"))
    return True


def deliver_outbox():
    if not settings().telegram_bot_token:
        return False
    with SessionLocal.begin() as db:
        next_attempt = Outbox.payload["_next_attempt_at"].as_float()
        row = db.scalar(
            select(Outbox)
            .where(
                Outbox.status == "pending",
                Outbox.attempts < 5,
                next_attempt.is_(None) | (next_attempt <= clock.now().timestamp()),
            )
            .order_by(Outbox.created_at)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        if row is None:
            return False
        inbox = db.get(Inbox, row.inbox_id)
        owner = db.get(User, inbox.owner_id) if inbox and inbox.owner_id else None
        link = db.scalar(select(TelegramLink).where(TelegramLink.chat_id == row.payload.get("chat_id")))
        linked_owner = db.get(User, link.owner_id) if link else None
        if row.payload.get("mode") == "fixture" or any(
            candidate and candidate.expires_at is not None for candidate in (owner, linked_owner)
        ):
            row.status = "simulated"
            return True
        if inbox and inbox.owner_id and (link is None or link.owner_id != inbox.owner_id):
            row.status = "ignored"
            row.payload = {"reason": "link_changed"}
            return True
        row.attempts += 1
        payload = {key: value for key, value in row.payload.items() if key != "_next_attempt_at"}
        response = None
        try:
            response = httpx.post(
                f"https://api.telegram.org/bot{settings().telegram_bot_token}/sendMessage",
                json=payload,
                timeout=20,
            )
            response.raise_for_status()
            row.status = "sent"
            row.payload = payload
        except httpx.HTTPError:
            if row.attempts >= 5:
                row.status = "failed"
                row.payload = payload
            else:
                delay = 30 * 2 ** (row.attempts - 1)
                if response is not None:
                    try:
                        body = response.json()
                    except ValueError:
                        body = {}
                    parameters = body.get("parameters") if isinstance(body, dict) else None
                    retry_after = parameters.get("retry_after") if isinstance(parameters, dict) else None
                    if type(retry_after) is int and retry_after > 0:
                        delay = max(delay, retry_after)
                # The schedule survives process restarts and never enters Telegram's request body.
                row.payload = {**payload, "_next_attempt_at": clock.now().timestamp() + delay}
    return True
