# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS web
WORKDIR /build/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM ghcr.io/astral-sh/uv:0.8.15 AS uv
FROM python:3.14-slim-bookworm AS runtime
COPY --from=uv /uv /usr/local/bin/uv
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_LINK_MODE=copy PYTHONPATH=/app/backend \
    PATH="/app/backend/.venv/bin:$PATH" WEB_DIST=/app/web/dist PORT=8080
WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY backend/app ./app
COPY backend/migrations ./migrations
COPY backend/alembic.ini ./
COPY infra/serve.py /app/serve.py
COPY --from=web /build/web/dist /app/web/dist
RUN useradd --system --uid 10001 --create-home orbit && chown -R orbit:orbit /app
USER orbit
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:'+__import__('os').environ.get('PORT','8080')+'/api/v1/health',timeout=4)"
CMD ["sh", "-c", "exec uvicorn serve:app --app-dir /app --host 0.0.0.0 --port ${PORT:-8080} --no-access-log"]
