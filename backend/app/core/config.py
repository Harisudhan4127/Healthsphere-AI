from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "HealthSphere AI"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    debug: bool = False
    base_url: str = "http://localhost:8000"

    database_url: str = "sqlite:///./healthsphere.db"

    jwt_secret: str = "change-me-in-production-use-a-long-random-secret-please-32chars+"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    ai_api_key: str | None = None
    ai_api_url: str | None = None
    ai_model: str = "gpt-4o-mini"

    seed_admin_email: str = "admin@healthsphere.ai"
    seed_admin_password: str = "admin123"

    risk_low_max: int = 24
    risk_moderate_max: int = 49
    risk_elevated_max: int = 74

    @property
    def sqlalchemy_database_url(self) -> str:
        url = self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

    def risk_level(self, score: int) -> str:
        if score <= self.risk_low_max:
            return "LOW"
        if score <= self.risk_moderate_max:
            return "MODERATE"
        if score <= self.risk_elevated_max:
            return "ELEVATED"
        return "HIGH"

    def is_production(self) -> bool:
        return self.app_env.lower() in {"production", "prod"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()