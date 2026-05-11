from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://neondb_owner:npg_gZ4eYlSdwr3o@ep-tiny-sound-agslibpd-pooler.c-2.eu-central-1.aws.neon.tech/safari_db?sslmode=require&channel_binding=require"
    DATABASE_ECHO: bool = False

    # Redis
    REDIS_URL: str = "redis://:Rapha@1996...@31.97.217.126:6379/0"
    REDIS_CACHE_TTL: int = 60

    # JWT
    SECRET_KEY: str = "safari_fast_secret_key_2024_production_secure_random_string_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "mushota09@gmail.com"
    SMTP_PASSWORD: str = "gipm bgxg xdql pioy"
    SMTP_FROM: str = "mushota09@gmail.com"
    SMTP_TLS: bool = True

    # Application
    APP_NAME: str = "Safari Fast - Réservation de Billets de Bateau"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8000,https://safari-fast.com"

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

    # Google OAuth
    GOOGLE_CLIENT_ID: str = "422318066430-t2tfnnq7lisjn4ra9j8rn64c8jch0stc.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET: str = "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"
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]


settings = Settings()
