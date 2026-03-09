from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"

    # Issuer
    issuer_url: str = "http://localhost:8000"

    # Token expiry
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    # Database
    database_url: str = "postgresql://fastauth:fastauth@db:5432/fastauth"

    # RSA keypair paths
    private_key_path: str = "keys/private.pem"
    public_key_path: str = "keys/public.pem"

    # Active key ID — embedded in JWT header and JWKS
    key_id: str = "key-1"

    # Secondary key (optional) — kept in JWKS during rotation for old token verification
    secondary_key_id: str | None = None
    secondary_public_key_path: str | None = None

    # Redis
    redis_url: str = "redis://redis:6379"

    # Rate limiting
    rate_limit_requests: int = 10
    rate_limit_window_seconds: int = 60

    # Admin API protection
    admin_api_key: str = "change-me-in-production"

    # Registration mode
    allow_public_registration: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
