from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_SECRET_KEY = "YOUR_DEVELOPMENT_JWT_SECRET_KEY_MIN_32_CHARS_LONG"


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "Fieldmark"
    SECRET_KEY: str = DEFAULT_SECRET_KEY
    API_PREFIX: str = "/api/v1"
    LOG_LEVEL: str = "INFO"
    MAX_PAGE_SIZE: int = 100
    SYNC_MAX_BATCH_SIZE: int = 100
    SYNC_MAX_PULL_LIMIT: int = 100

    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/field_inspection_db"
    TEST_DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/field_inspection_test_db"
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800

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
    # Vercel injects VERCEL_URL at runtime. PUBLIC_APP_URL is the stable custom
    # domain, when one is configured. Both are derived rather than hardcoded.
    VERCEL_URL: str | None = None
    PUBLIC_APP_URL: str | None = None

    @field_validator("DATABASE_URL", "TEST_DATABASE_URL", mode="before")
    @classmethod
    def normalize_postgres_driver(cls, value: str) -> str:
        """Accept managed-provider URLs that omit the psycopg driver name."""
        if isinstance(value, str) and value.startswith("postgresql://"):
            return f"postgresql+psycopg://{value[len('postgresql://') :]}"
        return value

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"

    @property
    def frontend_origins(self) -> list[str]:
        origins = {
            value.strip().rstrip("/")
            for value in self.FRONTEND_ORIGINS.split(",")
            if value.strip()
        }

        if self.VERCEL_URL:
            vercel_url = self.VERCEL_URL.strip().rstrip("/")
            origins.add(vercel_url if vercel_url.startswith("http") else f"https://{vercel_url}")
        if self.PUBLIC_APP_URL:
            public_url = self.PUBLIC_APP_URL.strip().rstrip("/")
            origins.add(public_url if public_url.startswith("http") else f"https://{public_url}")

        if self.is_production:
            origins = {
                origin
                for origin in origins
                if not origin.startswith("http://localhost")
                and not origin.startswith("http://127.0.0.1")
            }

        return sorted(origins)

    @model_validator(mode="after")
    def enforce_production_security(self) -> "Settings":
        if not self.is_production:
            return self

        self.REFRESH_COOKIE_SECURE = True
        self.CSRF_COOKIE_SECURE = True

        if self.SECRET_KEY == DEFAULT_SECRET_KEY or len(self.SECRET_KEY) < 32:
            raise ValueError("Production requires a unique SECRET_KEY of at least 32 characters.")
        if not self.frontend_origins:
            raise ValueError("Production requires FRONTEND_ORIGINS, PUBLIC_APP_URL, or VERCEL_URL.")
        if any(not origin.startswith("https://") for origin in self.frontend_origins):
            raise ValueError("Production frontend origins must use HTTPS.")

        return self

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
