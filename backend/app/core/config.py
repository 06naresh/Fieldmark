from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "Fieldmark"
    SECRET_KEY: str = "YOUR_DEVELOPMENT_JWT_SECRET_KEY_MIN_32_CHARS_LONG"
    API_PREFIX: str = "/api/v1"
    LOG_LEVEL: str = "INFO"
    MAX_PAGE_SIZE: int = 100
    SYNC_MAX_BATCH_SIZE: int = 100
    SYNC_MAX_PULL_LIMIT: int = 100

    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/field_inspection_db"
    TEST_DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/field_inspection_test_db"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    OFFLINE_SESSION_EXPIRE_DAYS: int = 7

    JWT_ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "fieldmark-api"
    JWT_AUDIENCE: str = "fieldmark-client"

    REFRESH_COOKIE_NAME: str = "fieldmark_refresh"
    REFRESH_COOKIE_PATH: str = "/api/v1/auth"
    REFRESH_COOKIE_SECURE: bool = False
    REFRESH_COOKIE_SAMESITE: str = "lax"
    CSRF_COOKIE_NAME: str = "fieldmark_csrf"
    CSRF_COOKIE_PATH: str = "/"
    CSRF_COOKIE_SECURE: bool = False
    CSRF_HEADER_NAME: str = "X-CSRF-Token"

    LOGIN_RATE_LIMIT_MAX_ATTEMPTS: int = 5
    LOGIN_RATE_LIMIT_WINDOW_SECONDS: int = 60
    LOGIN_RATE_LIMIT_MAX_KEYS: int = 10_000

    FRONTEND_ORIGINS: str = "http://localhost:5173"

    @model_validator(mode="after")
    def enforce_production_cookie_security(self) -> "Settings":
        if self.APP_ENV.lower() == "production":
            self.REFRESH_COOKIE_SECURE = True
            self.CSRF_COOKIE_SECURE = True
        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
