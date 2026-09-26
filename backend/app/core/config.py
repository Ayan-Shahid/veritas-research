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