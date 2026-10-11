from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "Veritas Research API"
    ENV: str = "local"
    DATABASE_URL: str = "postgresql+asyncpg://veritas:veritas@localhost:5432/veritas"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "change-me-in-prod"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    EDGAR_USER_AGENT: str = "Veritas Research contact@example.com"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    # Supabase Auth (GoTrue). Self-hosted: SUPABASE_JWT_SECRET = GoTrue's GOTRUE_JWT_SECRET (HS256)
    # and SUPABASE_URL empty. SUPABASE_URL is only for asymmetric keys fetched from its JWKS.
    SUPABASE_URL: str = ""
    SUPABASE_JWT_SECRET: str = ""
    # Reject tokens whose GoTrue session was revoked (needs auth_bridge from deploy/initdb).
    AUTH_SESSION_CHECK: bool = True
    # Shared secret for machine-to-machine writes (scripts/record_finetune_run.py sends it as
    # X-Service-Token). Empty = those endpoints are disabled and always refuse.
    SERVICE_API_TOKEN: str = ""
    # Interactive /docs, /redoc and /openapi.json. Off in production unless explicitly enabled.
    API_DOCS_ENABLED: bool | None = None

    @property
    def docs_enabled(self) -> bool:
        return self.API_DOCS_ENABLED if self.API_DOCS_ENABLED is not None else self.ENV != "production"

    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-5"

    MEMO_RETRIEVAL_TOP_K: int = 20
    MEMO_CACHE_TTL_SECONDS: int = 60 * 60 * 24  # 1 day

    @property
    def SYNC_DATABASE_URL(self) -> str:
        """Celery workers use a sync driver (psycopg3) rather than
        asyncpg, since Celery tasks run outside an event loop."""
        return self.DATABASE_URL.replace("+asyncpg", "+psycopg")


settings = Settings()