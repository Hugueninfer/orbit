"""Local personal accounts. Provisioning/recovery requires database operator access."""

import argparse
import getpass
import hashlib
import re
import secrets
from datetime import timedelta

from fastapi import APIRouter, Depends, Request, Response
from pydantic import ConfigDict, Field, SecretStr, field_validator
from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from .clock import clock
from .config import settings
from .db import SessionLocal, database
from .models import Credential, LoginThrottle, PersonalSession, User
from .responses import Ok
from .schemas import Input
from .store import problem

router = APIRouter()
COOKIE = "orbit_session"
LOGIN_LOCK = 7789103


def email_address(value: str) -> str:
    value = value.strip().casefold()
    if len(value) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", value):
        raise ValueError("Informe um e-mail válido")
    return value


def password_digest(password: str, salt: bytes) -> str:
    return hashlib.scrypt(password.encode(), salt=salt, n=131072, r=8, p=1, maxmem=192 * 1024 * 1024).hex()


def hash_password(password: str) -> str:
    if not 15 <= len(password) <= 128 or len(password.encode()) > 1024:
        raise ValueError("Use uma senha entre 15 e 128 caracteres")
    salt = secrets.token_bytes(16)
    return f"scrypt${salt.hex()}${password_digest(password, salt)}"


def check_password(password: str, encoded: str | None) -> bool:
    # Unknown users incur the same expensive hash; no account discovery shortcut.
    if encoded is None:
        password_digest(password, bytes(16))
        return False
    scheme, salt, expected = encoded.split("$")
    return scheme == "scrypt" and secrets.compare_digest(
        password_digest(password, bytes.fromhex(salt)), expected
    )


def local_only():
    if settings().app_mode not in {"personal", "combined"} or settings().oidc_authority:
        problem(404, "Login local indisponível")


def check_origin(request: Request):
    origins = {origin.strip() for origin in settings().allowed_origins.split(",")}
    if (
        request.headers.get("Origin") not in origins
        or request.headers.get("X-Orbit-CSRF") != "1"
        or request.headers.get("Sec-Fetch-Site") == "cross-site"
    ):
        problem(403, "Origem da solicitação inválida")


def cookie_digest(request: Request) -> str:
    return hashlib.sha256(request.cookies.get(COOKIE, "").encode()).hexdigest()


def local_user(request: Request, db: Session):
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        check_origin(request)
    access = db.get(PersonalSession, cookie_digest(request))
    if access is None or access.expires_at <= clock.now():
        problem(401, "Sessão expirada. Entre novamente.")
    return select(User).where(User.id == access.owner_id, User.expires_at.is_(None), User.issuer == "local")


class Login(Input):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=False)
    email: str = Field(max_length=254)
    password: SecretStr = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize(cls, value: str) -> str:
        return email_address(value)


@router.post("/auth/login", response_model=Ok)
def login(
    body: Login, request: Request, response: Response, db: Session = Depends(database, scope="function")
):
    local_only()
    check_origin(request)
    # Serialize password hashing across workers and keep the limiter durable.
    db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": LOGIN_LOCK})
    now = clock.now()
    limit = db.get(LoginThrottle, "global")
    if limit is None:
        limit = LoginThrottle(key="global", window_start=now, attempts=0)
        db.add(limit)
    if now - limit.window_start >= timedelta(minutes=1):
        limit.window_start, limit.attempts = now, 0
    if limit.attempts >= 30:
        response.status_code = 429
        response.headers["Retry-After"] = "60"
        return {"ok": False}
    limit.attempts += 1
    credential = db.scalar(select(Credential).where(Credential.email == body.email))
    if credential and credential.locked_until:
        if credential.locked_until > now:
            check_password(body.password.get_secret_value(), None)
            response.status_code = 401
            return {"ok": False}
        credential.failures, credential.locked_until = 0, None
    if not check_password(body.password.get_secret_value(), credential.password_hash if credential else None):
        if credential:
            credential.failures += 1
            if credential.failures >= 5:
                credential.locked_until = now + timedelta(minutes=15)
        # Returning a response commits failed attempts; raising would roll them back.
        response.status_code = 401
        return {"ok": False}
    assert credential is not None
    credential.failures, credential.locked_until = 0, None
    db.execute(delete(PersonalSession).where(PersonalSession.expires_at <= now))
    sessions = list(
        db.scalars(
            select(PersonalSession)
            .where(PersonalSession.owner_id == credential.owner_id)
            .order_by(PersonalSession.created_at.desc())
        )
    )
    for old in sessions[9:]:
        db.delete(old)
    token = secrets.token_urlsafe(48)
    expires = now + timedelta(days=7)
    db.add(
        PersonalSession(
            digest=hashlib.sha256(token.encode()).hexdigest(),
            owner_id=credential.owner_id,
            expires_at=expires,
        )
    )
    response.set_cookie(
        COOKIE,
        token,
        max_age=7 * 86400,
        httponly=True,
        secure=settings().session_cookie_secure,
        samesite="strict",
        path="/",
    )
    response.headers["Cache-Control"] = "no-store"
    return {"ok": True}


@router.post("/auth/logout", response_model=Ok)
def logout(request: Request, response: Response, db: Session = Depends(database, scope="function")):
    local_only()
    if "Authorization" in request.headers:
        problem(401, "Use a sessão pessoal para sair")
    check_origin(request)
    db.execute(delete(PersonalSession).where(PersonalSession.digest == cookie_digest(request)))
    response.delete_cookie(
        COOKIE, path="/", secure=settings().session_cookie_secure, httponly=True, samesite="strict"
    )
    response.headers["Cache-Control"] = "no-store"
    return {"ok": True}


def provision(db: Session, email: str, password: str, *, reset: bool = False) -> User:
    local_only()
    email = email_address(email)
    db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": LOGIN_LOCK})
    credential = db.scalar(select(Credential).where(Credential.email == email))
    if bool(credential) != reset:
        raise ValueError("Conta não encontrada" if reset else "Conta já existe; use reset-password")
    encoded = hash_password(password)
    if credential:
        credential.password_hash = encoded
        credential.failures, credential.locked_until = 0, None
        db.execute(delete(PersonalSession).where(PersonalSession.owner_id == credential.owner_id))
        user = db.get(User, credential.owner_id)
        assert user is not None
        return user
    from .identity import default_profile
    from .seed import seed_personal

    user = User(issuer="local", subject=email, profile=default_profile("Minha conta"), expires_at=None)
    db.add(user)
    db.flush()
    db.add(Credential(owner_id=user.id, email=email, password_hash=encoded, failures=0))
    seed_personal(db, user)
    return user


def main():
    parser = argparse.ArgumentParser(description="Criação e recuperação de conta pessoal Orbit")
    parser.add_argument("command", choices=["create", "reset-password"])
    parser.add_argument("email")
    args = parser.parse_args()
    password = getpass.getpass("Senha (15 a 128 caracteres): ")
    if password != getpass.getpass("Confirme a senha: "):
        parser.error("As senhas não coincidem")
    try:
        with SessionLocal.begin() as db:
            provision(db, args.email, password, reset=args.command == "reset-password")
    except ValueError as error:
        parser.error(str(error))
    print("Conta criada." if args.command == "create" else "Senha alterada; sessões anteriores encerradas.")


if __name__ == "__main__":
    main()
