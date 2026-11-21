from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "Fieldmark"
    SECRET_KEY: str = "YOUR_DEVELOPMENT_JWT_SECRET_KEY_MIN_32_CHARS_LONG"
    API_PREFIX: str = "/api/v1"
    LOG_LEVEL: str = "INFO"

    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/field_inspection_db"
    TEST_DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/field_inspection_test_db"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    OFFLINE_SESSION_EXPIRE_DAYS: int = 7

    FRONTEND_ORIGINS: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
