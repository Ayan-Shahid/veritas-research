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


settings = Settings()
