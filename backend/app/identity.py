import hashlib
import secrets
from datetime import timedelta
from functools import lru_cache

import httpx
import jwt
from fastapi import APIRouter, Depends, Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.orm import Session

from .clock import clock
from .config import settings
from .db import database
from .models import MODELS, Audit, Idempotency, Inbox, Token, User
from .responses import DemoToken, Ok, Profile
from .schemas import ProfilePatch
from .store import problem, rows

router = APIRouter()


def profile(user: User):
    return {
        "id": str(user.id),
        **user.profile,
        "version": user.version,
        "is_demo": user.expires_at is not None,
    }


def default_profile(name="Alex Morgan"):
    return {
        "name": name,
        "timezone": "America/Sao_Paulo",
        "currency": "BRL",
        "locale": "pt-BR",
        "week_start": 0,
        "weight_unit": "kg",
    }


@lru_cache
def jwks():
    config = settings()
    url = config.oidc_jwks_url
    if not url:
        try:
            response = httpx.get(
                config.oidc_authority.rstrip("/") + "/.well-known/openid-configuration", timeout=10
            )
            response.raise_for_status()
            metadata = response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise jwt.PyJWKClientError("OIDC discovery unavailable") from error
        if metadata.get("issuer") != config.oidc_authority or not isinstance(metadata.get("jwks_uri"), str):
            raise jwt.PyJWKClientError("OIDC discovery issuer mismatch")
        url = metadata["jwks_uri"]
    return jwt.PyJWKClient(url, cache_keys=True, lifespan=300)


def authenticated(
    request: Request,
    db: Session = Depends(database, scope="function"),
    credentials: HTTPAuthorizationCredentials | None = Security(HTTPBearer(auto_error=False)),
) -> User:
    header = request.headers.get("Authorization", "")
    config = settings()
    if config.app_mode == "personal" and not config.oidc_authority:
        from .accounts import local_user

        query = local_user(request, db)
    elif config.app_mode == "demo":
        if not header.startswith("Bearer "):
            problem(401, "Autenticação necessária")
        token = header[7:]
        digest = hashlib.sha256(token.encode()).hexdigest()
        access = db.get(Token, digest)
        if not access or access.expires_at <= clock.now():
            problem(401, "Sessão demo expirada")
        query = select(User).where(User.id == access.owner_id, User.expires_at > clock.now())
    else:
        if not header.startswith("Bearer "):
            problem(401, "Autenticação necessária")
        token = header[7:]
        try:
            signing_key = jwks().get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256"],
                audience=config.oidc_audience,
                issuer=config.oidc_authority,
                options={"require": ["exp", "iat", "iss", "sub", "aud"]},
            )
        except (jwt.PyJWTError, ValueError):
            problem(401, "Token OIDC inválido")
        subject = claims["sub"]
        # Concurrent first requests for the same subject serialize before INSERT.
        db.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:key,0))"),
            {"key": config.oidc_authority + subject},
        )
        user = db.scalar(select(User).where(User.issuer == config.oidc_authority, User.subject == subject))
        if user is None:
            user = User(
                issuer=config.oidc_authority,
                subject=subject,
                profile=default_profile(claims.get("name", "Minha conta")),
                expires_at=None,
            )
            db.add(user)
            db.flush()
            from .seed import seed_personal

            seed_personal(db, user)
        query = select(User).where(User.id == user.id)
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        query = query.with_for_update()
    user = db.scalar(query.execution_options(populate_existing=True))
    if user is None:
        problem(401, "Sessão inválida")
    return user


def cleanup_demo(db):
    db.execute(text("SELECT pg_advisory_xact_lock(7789102)"))
    expired = list(
        db.scalars(select(User).where(User.expires_at.is_not(None), User.expires_at <= clock.now()))
    )
    for user in expired:
        clear_user(db, user)
        db.delete(user)
    db.flush()
    return len(expired)


def clear_user(db, user):
    # Child-first deletes honor relational foreign keys and leave other owners intact.
    db.execute(delete(Inbox).where(Inbox.owner_id == user.id))
    for kind in [
        "transaction",
        "payment",
        "installment",
        "purchase",
        "invoice",
        "transfer",
        "recurrence",
        "card",
        "checkin",
        "task",
        "session",
        "routine",
        "exercise",
        "habit",
        "category",
        "account",
        "task_list",
        "telegram_link",
    ]:
        model = MODELS[kind]
        db.execute(delete(model).where(model.owner_id == user.id))
    db.execute(delete(Audit).where(Audit.owner_id == user.id))
    db.execute(delete(Idempotency).where(Idempotency.owner_id == user.id))
    db.execute(
        update(User)
        .where(User.id == user.id)
        .values(demo_write_count=0)
        .execution_options(synchronize_session=False)
    )
    db.flush()


@router.post("/auth/demo", status_code=201, response_model=DemoToken)
def demo(db: Session = Depends(database, scope="function")):
    config = settings()
    if config.app_mode != "demo":
        problem(404, "Demonstração indisponível")
    db.execute(text("SELECT pg_advisory_xact_lock(7789102)"))
    cleanup_demo(db)
    count = db.scalar(select(func.count()).select_from(User).where(User.expires_at.is_not(None)))
    if (count or 0) >= config.demo_max_sessions:
        problem(429, "Demonstração temporariamente cheia. Tente novamente mais tarde.")
    expires = clock.now() + timedelta(hours=config.demo_ttl_hours)
    user = User(
        issuer="demo", subject=secrets.token_urlsafe(24), profile=default_profile(), expires_at=expires
    )
    db.add(user)
    db.flush()
    token = secrets.token_urlsafe(48)
    db.add(Token(digest=hashlib.sha256(token.encode()).hexdigest(), owner_id=user.id, expires_at=expires))
    from .seed import seed_demo

    seed_demo(db, user)
    return {"access_token": token, "expires_at": expires.isoformat()}


@router.post("/auth/demo/reset", response_model=Ok)
def reset(user: User = Depends(authenticated), db: Session = Depends(database, scope="function")):
    if settings().app_mode != "demo" or user.expires_at is None:
        problem(404, "Demonstração indisponível")
    clear_user(db, user)
    from .seed import seed_demo

    seed_demo(db, user)
    return {"ok": True}


@router.get("/me", response_model=Profile)
def me(user: User = Depends(authenticated)):
    return profile(user)


@router.patch("/me", response_model=Profile)
def edit_me(
    body: ProfilePatch, user: User = Depends(authenticated), db: Session = Depends(database, scope="function")
):
    if body.version != user.version:
        problem(409, "Perfil atualizado em outra aba")
    changes = body.model_dump(exclude={"version"}, exclude_unset=True)
    if any(value is None for value in changes.values()):
        problem(422, "Preferências não podem ser nulas")
    if changes.get("currency", user.profile["currency"]) != user.profile["currency"] and any(
        rows(db, user, kind) for kind in ("account", "card", "transaction", "recurrence", "transfer")
    ):
        problem(409, "A moeda não pode ser alterada após cadastrar contas, cartões ou movimentos financeiros")
    user.profile = {**user.profile, **changes}
    user.version += 1
    db.flush()
    return profile(user)
