from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from typing import AsyncGenerator
import ssl

from app.config import settings
from app.models.base import Base


# Préparer l'URL de la base de données (retirer les paramètres SSL de l'URL)
database_url = settings.DATABASE_URL.split("?")[0] if "?" in settings.DATABASE_URL else settings.DATABASE_URL

# Configurer SSL pour asyncpg
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

engine = create_async_engine(
    database_url,
    echo=settings.DATABASE_ECHO,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args={
        "ssl": ssl_context,
        "server_settings": {
            "application_name": "safari_fast"
        }
    }
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialiser la base de données"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db():
    """Fermer les connexions à la base de données"""
    await engine.dispose()
