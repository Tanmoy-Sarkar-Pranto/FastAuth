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


@lru_cache
def get_settings() -> Settings:
    return Settings()
