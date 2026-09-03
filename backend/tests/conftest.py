import os
from importlib import import_module

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("APP_MODE", "demo")
os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://orbit:orbit-test@localhost:55432/orbit_test")


@pytest.fixture
def client():
    try:
        app = import_module("app.main").app
    except ModuleNotFoundError:
        pytest.fail("Persistent API not implemented")
    with TestClient(app) as c:
        c.test_users = []
        yield c
        from uuid import UUID

        from app.db import SessionLocal
        from app.identity import clear_user
        from app.models import User

        with SessionLocal.begin() as db:
            for identifier in c.test_users:
                user = db.get(User, UUID(identifier))
                if user:
                    clear_user(db, user)
                    db.delete(user)
