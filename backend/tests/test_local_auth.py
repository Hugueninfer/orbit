from datetime import timedelta

import pytest
from sqlalchemy import delete, select

ORIGIN = {"Origin": "https://testserver", "X-Orbit-CSRF": "1"}
EMAIL = "owner@example.com"
PASSWORD = "uma senha longa de teste 2026"


@pytest.fixture
def personal(client, monkeypatch):
    from app.accounts import provision
    from app.config import settings
    from app.db import SessionLocal
    from app.models import LoginThrottle

    monkeypatch.setattr(settings(), "app_mode", "personal")
    monkeypatch.setattr(settings(), "oidc_authority", "")
    monkeypatch.setattr(settings(), "allowed_origins", "https://testserver")
    monkeypatch.setattr(settings(), "session_cookie_secure", True)
    client.base_url = "https://testserver"
    with SessionLocal.begin() as db:
        db.execute(delete(LoginThrottle))
        user = provision(db, EMAIL, PASSWORD)
        client.test_users.append(str(user.id))
    yield client
    with SessionLocal.begin() as db:
        db.execute(delete(LoginThrottle))


def login(client, **values):
    return client.post(
        "/api/v1/auth/login", headers=ORIGIN, json={"email": EMAIL, "password": PASSWORD, **values}
    )


def test_personal_config_does_not_require_oidc():
    from app.config import Settings

    assert Settings(app_mode="personal", oidc_authority="").app_mode == "personal"


def test_login_cookie_and_private_data_survive_reload(personal):
    from app.db import SessionLocal
    from app.models import Credential, PersonalSession

    assert personal.get("/api/v1/me").status_code == 401
    result = login(personal, email="OWNER@example.com")
    assert result.status_code == 200, result.text
    cookie = result.headers["set-cookie"]
    assert all(value in cookie for value in ["HttpOnly", "Secure", "SameSite=strict"])
    assert "access_token" not in result.json()
    with SessionLocal() as db:
        credential = db.scalar(select(Credential).where(Credential.email == EMAIL))
        assert credential.password_hash.startswith("scrypt$") and PASSWORD not in credential.password_hash
        session = db.scalar(select(PersonalSession).where(PersonalSession.owner_id == credential.owner_id))
        assert personal.cookies.get("orbit_session") != session.digest
    assert personal.get("/api/v1/me").json()["is_demo"] is False
    created = personal.post("/api/v1/task-lists", headers=ORIGIN, json={"name": "Minha lista privada"})
    assert created.status_code == 201, created.text
    assert any(row["id"] == created.json()["id"] for row in personal.get("/api/v1/task-lists").json())
    assert personal.post("/api/v1/auth/demo", json={}).status_code == 404
    assert personal.post("/api/v1/auth/register", json={}).status_code == 404


def test_login_errors_are_generic_and_persist_attempt_limit(personal):
    missing = login(personal, email="unknown@example.com", password="incorrect")
    wrong = login(personal, password="incorrect")
    assert missing.status_code == wrong.status_code == 401
    assert missing.json() == wrong.json()
    for _ in range(4):
        assert login(personal, password="incorrect").status_code == 401
    locked = login(personal)
    unknown = login(personal, email="unknown@example.com", password="incorrect")
    assert locked.status_code == unknown.status_code == 401
    assert locked.json() == unknown.json()
    assert "Retry-After" not in locked.headers
    from app.db import SessionLocal
    from app.models import Credential

    with SessionLocal() as db:
        credential = db.scalar(select(Credential).where(Credential.email == EMAIL))
        assert credential.failures == 5 and credential.locked_until is not None


def test_local_auth_requires_origin_and_csrf_header(personal):
    body = {"email": EMAIL, "password": PASSWORD}
    assert personal.post("/api/v1/auth/login", json=body).status_code == 403
    assert (
        personal.post(
            "/api/v1/auth/login", headers={**ORIGIN, "Origin": "https://attacker.example"}, json=body
        ).status_code
        == 403
    )
    assert login(personal).status_code == 200
    assert personal.post("/api/v1/task-lists", json={"name": "CSRF"}).status_code == 403
    assert (
        personal.post("/api/v1/auth/logout", headers={**ORIGIN, "Sec-Fetch-Site": "cross-site"}).status_code
        == 403
    )
    assert personal.get("/api/v1/me").status_code == 200


def test_logout_revokes_session_and_expired_session_is_rejected(personal):
    from app.clock import clock
    from app.db import SessionLocal
    from app.models import PersonalSession

    assert login(personal).status_code == 200
    old_cookie = personal.cookies.get("orbit_session")
    assert personal.post("/api/v1/auth/logout", headers=ORIGIN).status_code == 200
    personal.cookies.set("orbit_session", old_cookie)
    assert personal.get("/api/v1/me").status_code == 401
    personal.cookies.clear()
    assert login(personal).status_code == 200
    with SessionLocal.begin() as db:
        session = db.scalar(
            select(PersonalSession).where(PersonalSession.owner_id == personal.test_users[-1])
        )
        session.expires_at = clock.now() - timedelta(seconds=1)
    assert personal.get("/api/v1/me").status_code == 401


def test_password_reset_revokes_sessions_and_preserves_data(personal):
    from app.accounts import provision
    from app.db import SessionLocal

    assert login(personal).status_code == 200
    owner = personal.get("/api/v1/me").json()["id"]
    with SessionLocal.begin() as db:
        provision(db, EMAIL, "outra senha muito longa 2026", reset=True)
    assert personal.get("/api/v1/me").status_code == 401
    assert login(personal).status_code == 401
    assert login(personal, password="outra senha muito longa 2026").status_code == 200
    assert personal.get("/api/v1/me").json()["id"] == owner


def test_demo_does_not_accept_local_login(client):
    assert login(client).status_code == 404


def test_personal_accounts_cannot_read_each_others_records(personal):
    from app.accounts import provision
    from app.db import SessionLocal

    assert login(personal).status_code == 200
    row = personal.post("/api/v1/task-lists", headers=ORIGIN, json={"name": "Privada"}).json()
    with SessionLocal.begin() as db:
        other = provision(db, "other@example.com", PASSWORD)
        personal.test_users.append(str(other.id))
    assert login(personal, email="other@example.com").status_code == 200
    assert personal.get("/api/v1/task-lists/" + row["id"]).status_code == 404


def test_global_limiter_also_bounds_unknown_accounts(personal):
    from app.db import SessionLocal
    from app.models import LoginThrottle

    assert login(personal, email="unknown@example.com").status_code == 401
    with SessionLocal.begin() as db:
        limit = db.get(LoginThrottle, "global")
        assert limit.attempts == 1
        limit.attempts = 30
    assert login(personal, email="another-unknown@example.com").status_code == 429


def test_password_whitespace_is_preserved(personal):
    from app.accounts import provision
    from app.db import SessionLocal

    password = "  minha frase secreta com espaços  "
    with SessionLocal.begin() as db:
        provision(db, EMAIL, password, reset=True)
    assert login(personal, password=password).status_code == 200


def test_personal_cookie_does_not_override_explicit_authorization(personal):
    assert login(personal).status_code == 200
    for authorization in ["Bearer invalid", "Basic abc", ""]:
        assert personal.get("/api/v1/me", headers={"Authorization": authorization}).status_code == 401
    assert personal.get("/api/v1/me").status_code == 200
