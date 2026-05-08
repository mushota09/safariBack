import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.compagnie import CompagnieBateau


@pytest.fixture
async def test_compagnie(db_session: AsyncSession):
    """Crée une compagnie de test"""
    compagnie = CompagnieBateau(
        nom="Test Ferry Company",
        telephone="+33491234567",
        email="test@ferry.com",
        numero_licence="TEST-001",
        pays_immatriculation="France",
        taux_commission=0.05
    )

    db_session.add(compagnie)
    await db_session.commit()
    await db_session.refresh(compagnie)

    return compagnie


@pytest.mark.asyncio
async def test_get_compagnies(client: AsyncClient, test_compagnie):
    """Test de récupération de toutes les compagnies"""
    response = await client.get("/compagnies")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["nom"] == "Test Ferry Company"


@pytest.mark.asyncio
async def test_get_compagnie_by_id(client: AsyncClient, test_compagnie):
    """Test de récupération d'une compagnie par ID"""
    response = await client.get(f"/compagnies/{test_compagnie.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_compagnie.id
    assert data["nom"] == "Test Ferry Company"


@pytest.mark.asyncio
async def test_get_compagnie_not_found(client: AsyncClient):
    """Test de récupération d'une compagnie inexistante"""
    response = await client.get("/compagnies/99999")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_pagination(client: AsyncClient, db_session: AsyncSession):
    """Test de la pagination"""
    # Créer plusieurs compagnies
    for i in range(25):
        compagnie = CompagnieBateau(
            nom=f"Company {i}",
            numero_licence=f"LIC-{i:03d}",
            taux_commission=0.05
        )
        db_session.add(compagnie)

    await db_session.commit()

    # Test avec pagination
    response = await client.get("/compagnies?page=1&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 10

    # Test sans pagination
    response = await client.get("/compagnies?no_pagination=true")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 25
