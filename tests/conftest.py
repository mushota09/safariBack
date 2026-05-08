import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.database import get_db, Base
from app.config import settings

# Base de données de test
TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/compagnie_bateau_test"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
test_session_maker = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)


@pytest.fixture(scope="session")
def event_loop():
    """Crée une boucle d'événements pour toute la session de tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Crée une session de base de données pour chaque test"""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with test_session_maker() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Crée un client HTTP de test"""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def test_user(db_session: AsyncSession):
    """Crée un utilisateur de test"""
    from app.models.utilisateur import Utilisateur
    from app.modules.auth.service import auth_service

    user = Utilisateur(
        username="testuser",
        email="test@example.com",
        numero_telephone="+33600000000",
        hashed_password=auth_service.get_password_hash("test123"),
        nom_complet="Test User",
        is_active=True,
        is_superuser=False
    )

    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    return user


@pytest.fixture
async def auth_headers(client: AsyncClient, test_user):
    """Crée les headers d'authentification"""
    response = await client.post(
        "/auth/login",
        json={"username": "testuser", "password": "test123"}
    )

    token_data = response.json()
    return {"Authorization": f"Bearer {token_data['access_token']}"}
