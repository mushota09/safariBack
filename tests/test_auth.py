import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register(client: AsyncClient):
    """Test d'inscription d'un nouvel utilisateur"""
    response = await client.post(
        "/auth/register",
        json={
            "username": "newuser",
            "email": "newuser@example.com",
            "numero_telephone": "+33600000001",
            "password": "password123",
            "nom_complet": "New User"
        }
    )

    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "newuser"
    assert data["email"] == "newuser@example.com"
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_username(client: AsyncClient, test_user):
    """Test d'inscription avec un username déjà existant"""
    response = await client.post(
        "/auth/register",
        json={
            "username": "testuser",
            "email": "another@example.com",
            "numero_telephone": "+33600000002",
            "password": "password123"
        }
    )

    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user):
    """Test de connexion réussie"""
    response = await client.post(
        "/auth/login",
        json={
            "username": "testuser",
            "password": "test123"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, test_user):
    """Test de connexion avec mauvais mot de passe"""
    response = await client.post(
        "/auth/login",
        json={
            "username": "testuser",
            "password": "wrongpassword"
        }
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user(client: AsyncClient, auth_headers):
    """Test de récupération du profil utilisateur"""
    response = await client.get("/auth/me", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_get_current_user_unauthorized(client: AsyncClient):
    """Test d'accès au profil sans authentification"""
    response = await client.get("/auth/me")

    assert response.status_code == 401
