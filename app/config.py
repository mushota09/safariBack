"""Configuration settings for Safari Fast application.

All sensitive values MUST come from environment variables.
Never hardcode secrets in this file.
"""
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"
    )

    # Database - MUST be set in .env
    DATABASE_URL: str
    DATABASE_ECHO: bool = False

    # Redis - MUST be set in .env
    REDIS_URL: str
    REDIS_CACHE_TTL: int = 60

    # JWT - MUST be set in .env
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Email - MUST be set in .env
    SMTP_HOST: str
    SMTP_PORT: int = 587
    SMTP_USER: str
    SMTP_PASSWORD: str
    SMTP_FROM: str
    SMTP_TLS: bool = True

    # Application
    APP_NAME: str = "Safari Fast - Réservation de Billets de Bateau"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False  # Default to False for security
    ALLOWED_ORIGINS: str

    # Réservation
    RESERVATION_EXPIRATION_MINUTES: int = 30

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 100

    # Files
    UPLOAD_DIR: str = "uploads"
    PDF_DIR: str = "pdfs"
    QR_CODE_DIR: str = "qrcodes"

    # Paiement
    PAIEMENT_SUCCESS_RATE: float = 0.95

    # Google OAuth - MUST be set in .env
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str

    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse ALLOWED_ORIGINS string into a list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()
