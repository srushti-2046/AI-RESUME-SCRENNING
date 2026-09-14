"""
config.py — Environment configuration for Unified FastAPI Backend.
All configuration loads from .env or system environment variables.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Supabase
    supabase_url: str
    supabase_service_role_key: str
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = ""

    # Gemini AI
    gemini_api_key: str = ""

    # FastAPI Server
    host: str = "0.0.0.0"
    port: int = 8000
    environment: str = "development"

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://localhost:3000"

    # App metadata
    app_version: str = "1.0.0"

    # Rate Limiting (Configurable via .env)
    rate_limit_enabled: bool = True
    rate_limit_auth_per_ip_max: int = 5
    rate_limit_auth_per_account_max: int = 5
    rate_limit_auth_window_seconds: int = 300
    rate_limit_auth_backoff_base_seconds: int = 2
    rate_limit_auth_backoff_max_seconds: int = 900
    rate_limit_public_max: int = 60
    rate_limit_public_window_seconds: int = 60
    rate_limit_auth_user_max: int = 300
    rate_limit_auth_user_window_seconds: int = 60

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
