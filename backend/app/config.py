from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_mode: Literal["demo", "personal"] = "personal"
    database_url: str = "postgresql+psycopg://orbit:orbit@localhost:5432/orbit"
    oidc_authority: str = ""
    oidc_client_id: str = "orbit-web"
    oidc_audience: str = "orbit-api"
    oidc_jwks_url: str = ""
    allowed_origins: str = "http://localhost:5173,http://localhost:8080"
    demo_ttl_hours: int = 24
    demo_max_sessions: int = 100
    demo_max_records: int = 5000
    telegram_webhook_secret: str = ""
    telegram_bot_token: str = ""
    telegram_provider_url: str = ""
    telegram_provider_key: str = ""

    @model_validator(mode="after")
    def safe_config(self):
        if not self.database_url.startswith("postgresql"):
            raise ValueError("PostgreSQL is required")
        if self.app_mode == "personal" and not self.oidc_authority:
            raise ValueError("Personal mode requires OIDC_AUTHORITY")
        if not 1 <= self.demo_ttl_hours <= 48:
            raise ValueError("Demo expiry must be between 1 and 48 hours")
        return self


@lru_cache
def settings() -> Settings:
    return Settings()
