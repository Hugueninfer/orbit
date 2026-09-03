"""Production adapter: same-origin SPA, API, health and safe request telemetry."""
import json
import logging
import os
import time
from pathlib import Path
from uuid import uuid4

from fastapi import Request
from fastapi.responses import FileResponse, JSONResponse
from app.main import app

logger = logging.getLogger("orbit.requests")
web_root = Path(os.environ.get("WEB_DIST", "/app/web/dist")).resolve()


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = str(uuid4())
    started = time.monotonic()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("Unhandled request failure: %s", request_id)
        response = JSONResponse({"type":"about:blank","title":"Erro interno","status":500,"detail":"Não foi possível concluir. Tente novamente.","request_id":request_id},status_code=500,media_type="application/problem+json")
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
        "font-src 'self'; img-src 'self' data:; connect-src 'self' https: http://localhost:8081; "
        "frame-src https: http://localhost:8081; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    )
    if request.url.path == "/api/docs":
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https://fastapi.tiangolo.com; frame-ancestors 'none'; base-uri 'self'"
    if request.url.path.startswith("/api"):
        response.headers["Cache-Control"] = "no-store"
    logger.info(json.dumps({
        "event": "http_request", "request_id": request_id,
        "method": request.method, "route": getattr(request.scope.get("route"), "path", "unmatched"),
        "status": response.status_code, "duration_ms": round((time.monotonic() - started) * 1000, 2),
    }))
    return response


@app.get("/{path:path}", include_in_schema=False)
def spa(path: str):
    if path.startswith(("api/", "health/")) or path in {"api", "health"}:
        return JSONResponse({"type": "about:blank", "title": "Not found", "status": 404}, status_code=404)
    candidate = (web_root / path).resolve()
    if not candidate.is_relative_to(web_root):
        return JSONResponse({"detail": "Not found"}, status_code=404)
    if candidate.is_file():
        response = FileResponse(candidate)
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable" if path.startswith("assets/") else "no-cache"
        return response
    if path.startswith("assets/") or Path(path).suffix:
        return JSONResponse({"detail": "Not found"}, status_code=404)
    if (web_root / "index.html").is_file():
        return FileResponse(web_root / "index.html", headers={"Cache-Control": "no-cache"})
    return JSONResponse({"detail": "Frontend build unavailable"}, status_code=503)
