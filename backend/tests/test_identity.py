from datetime import timedelta
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from test_api import demo, get


@pytest.mark.parametrize("mode", ["personal", "combined"])
def test_oidc_signed_issuer_audience_expiration_and_personal_rejects_demo(client, monkeypatch, mode):
    from app import identity
    from app.clock import clock
    from app.config import settings

    c = client
    demo_headers = demo(c)
    config = settings()
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public = private.public_key()
    monkeypatch.setattr(config, "app_mode", mode)
    monkeypatch.setattr(config, "oidc_authority", "https://issuer.example/realms/orbit")
    monkeypatch.setattr(
        identity,
        "jwks",
        lambda: SimpleNamespace(get_signing_key_from_jwt=lambda token: SimpleNamespace(key=public)),
    )
    now = clock.now()
    claims = {
        "iss": config.oidc_authority,
        "sub": "test-personal-owner",
        "aud": config.oidc_audience,
        "iat": now,
        "exp": now + timedelta(minutes=5),
        "name": "OIDC Owner",
    }
    token = jwt.encode(claims, private, algorithm="RS256")
    headers = {"Authorization": "Bearer " + token}
    response = c.get("/api/v1/me", headers=headers)
    assert response.status_code == 200, response.text
    c.test_users.append(response.json()["id"])
    assert response.json()["is_demo"] is False
    assert c.get("/api/v1/me", headers=demo_headers).status_code == (401 if mode == "personal" else 200)
    if mode == "personal":
        assert c.post("/api/v1/auth/demo", json={}).status_code == 404
    else:
        demo(c)
    for override in [
        {"aud": "wrong"},
        {"iss": "https://attacker.example"},
        {"exp": now - timedelta(minutes=1)},
    ]:
        wrong = jwt.encode({**claims, **override}, private, algorithm="RS256")
        assert c.get("/api/v1/me", headers={"Authorization": "Bearer " + wrong}).status_code == 401
    forged = jwt.encode(
        claims, rsa.generate_private_key(public_exponent=65537, key_size=2048), algorithm="RS256"
    )
    assert c.get("/api/v1/me", headers={"Authorization": "Bearer " + forged}).status_code == 401


def test_expired_demo_is_rejected_and_cleaned(client):
    from uuid import UUID

    from app.clock import clock
    from app.db import SessionLocal
    from app.identity import cleanup_demo
    from app.models import User

    c = client
    h = demo(c)
    user_id = get(c, h, "/me")["id"]
    with SessionLocal.begin() as db:
        user = db.get(User, UUID(user_id))
        user.expires_at = clock.now() - timedelta(seconds=1)
    assert c.get("/api/v1/tasks", headers=h).status_code == 401
    with SessionLocal.begin() as db:
        assert cleanup_demo(db) >= 1
    with SessionLocal() as db:
        assert db.get(User, UUID(user_id)) is None


def test_personal_local_config_defaults_to_secure_cookies():
    from app.config import Settings

    config = Settings(app_mode="personal", oidc_authority="")
    assert config.session_cookie_secure is True


def test_standard_oidc_discovery_validates_issuer(monkeypatch):
    from app import identity
    from app.config import settings

    config = settings()
    monkeypatch.setattr(config, "oidc_authority", "https://tenant.example/")
    monkeypatch.setattr(config, "oidc_jwks_url", "")
    identity.jwks.cache_clear()
    calls = []

    def discovery(url, **kwargs):
        calls.append(url)
        return SimpleNamespace(
            raise_for_status=lambda: None,
            json=lambda: {"issuer": config.oidc_authority, "jwks_uri": "https://tenant.example/keys"},
        )

    monkeypatch.setattr(identity, "httpx", SimpleNamespace(get=discovery, HTTPError=Exception), raising=False)
    result = identity.jwks()
    assert calls == ["https://tenant.example/.well-known/openid-configuration"]
    assert result.uri == "https://tenant.example/keys"
    identity.jwks.cache_clear()
    monkeypatch.setattr(
        identity,
        "httpx",
        SimpleNamespace(
            HTTPError=Exception,
            get=lambda *args, **kwargs: SimpleNamespace(
                raise_for_status=lambda: None,
                json=lambda: {
                    "issuer": "https://attacker.example",
                    "jwks_uri": "https://attacker.example/keys",
                },
            ),
        ),
    )
    with pytest.raises(jwt.PyJWKClientError):
        identity.jwks()
    identity.jwks.cache_clear()
