from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException

from . import dashboard, finance, habits, identity, integrations, resources, tasks, workouts
from .config import settings
from .db import database
from .identity import authenticated
from .models import Audit, User
from .responses import AuditOut, Health, RuntimeConfig


@asynccontextmanager
async def lifespan(app):
    settings()  # Fail closed on invalid personal-mode configuration.
    yield


app = FastAPI(
    title="Orbit API",
    version="1.0.0",
    lifespan=lifespan,
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/docs",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings().allowed_origins.split(","),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
)


def error_response(status, detail):
    titles = {
        401: "Não autenticado",
        403: "Acesso negado",
        404: "Não encontrado",
        409: "Conflito",
        422: "Dados inválidos",
        429: "Limite atingido",
        503: "Indisponível",
    }
    return JSONResponse(
        status_code=status,
        content={
            "type": "about:blank",
            "title": titles.get(status, "Erro"),
            "status": status,
            "detail": str(detail),
        },
        media_type="application/problem+json",
    )


@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException):
    return error_response(exc.status_code, exc.detail)


@app.exception_handler(RequestValidationError)
@app.exception_handler(ValidationError)
async def validation_error(request: Request, exc):
    detail = "; ".join(".".join(str(part) for part in e["loc"]) + ": " + e["msg"] for e in exc.errors())
    return error_response(422, detail)


@app.exception_handler(ValueError)
async def value_error(request: Request, exc: ValueError):
    return error_response(422, str(exc))


@app.exception_handler(IntegrityError)
async def integrity_error(request: Request, exc: IntegrityError):
    return error_response(409, "A operação conflita com uma referência ou registro existente.")


@app.get("/api/v1/config", response_model=RuntimeConfig)
def config():
    value = settings()
    return {k: getattr(value, k) for k in ["app_mode", "oidc_authority", "oidc_client_id", "oidc_audience"]}


@app.get("/api/v1/health", response_model=Health)
def health(db: Session = Depends(database)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "ok"}


@app.get("/api/v1/audit", response_model=list[AuditOut])
def audit_log(user: User = Depends(authenticated), db: Session = Depends(database)):
    return [
        {
            "id": str(row.id),
            "action": row.action,
            "entity_type": row.entity_type,
            "entity_id": row.entity_id,
            "created_at": row.created_at.isoformat(),
            "detail": row.detail,
        }
        for row in db.scalars(
            select(Audit).where(Audit.owner_id == user.id).order_by(Audit.created_at.desc()).limit(100)
        )
    ]


# Static command routes are registered before generic /{identifier} resource routes.
for router in [
    identity.router,
    tasks.router,
    habits.router,
    finance.router,
    workouts.router,
    integrations.router,
    resources.router,
    dashboard.router,
]:
    app.include_router(router, prefix="/api/v1")


@app.get("/health/live", response_model=dict[str, str])
def liveness():
    return {"status": "ok"}
