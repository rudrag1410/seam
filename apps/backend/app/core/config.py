from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: Literal["development", "production", "test"] = "development"
    app_url: str = "http://localhost:3000"
    cors_origins: str = "http://localhost:3000"

    database_url: str = "sqlite+aiosqlite:///./data/seam.db"

    jwt_secret: str = "change-me"
    field_encryption_key: str = ""
    access_ttl_minutes: int = 15
    refresh_ttl_days: int = 30
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "none", "strict"] = "lax"
    cookie_domain: str | None = None

    ai_mode: Literal["live", "mock"] = "live"
    mock_stream_delay_s: float = 0.1
    openai_api_key: str = ""
    llm_model_openai_fast: str = "gpt-5-mini"
    llm_model_openai_strong: str = "gpt-5"
    llm_model_openai_vision: str = "gpt-5-mini"
    prompt_version: str = "v1"

    llm_max_output_tokens: int = 6000
    llm_max_jd_tokens: int = 4000
    llm_max_resume_tokens: int = 8000
    llm_reasoning_effort: str = "low"

    typesafe_api_key: str = ""
    typesafe_default_model: str = "jev-1.13.0"
    jev_confidence_high: float = 0.80
    jev_confidence_low: float = 0.50
    jev_timeout_s: float = 6.0

    local_storage_dir: str = "./data/files"
    r2_endpoint: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = "seam"
    signed_url_ttl_seconds: int = 300

    max_upload_mb: int = 5
    max_pages: int = 6
    min_jd_chars: int = 300

    @field_validator("database_url")
    @classmethod
    def _async_driver(cls, url: str) -> str:
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+asyncpg://" + url[len(prefix) :]
        return url

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_jd_chars(self) -> int:
        return self.llm_max_jd_tokens * 4

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

    @property
    def has_llm(self) -> bool:
        return self.is_mock or bool(self.openai_api_key)

    @property
    def is_mock(self) -> bool:
        return self.ai_mode == "mock"


@lru_cache
def get_settings() -> Settings:
    return Settings()
