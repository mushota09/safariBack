import pytest
from datetime import datetime, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.compagnie import CompagnieBateau, Bateau
from app.models.geographie import Pays, Ville, Port
from app.models.traversee import Traversee as Route
from app.models.voyage import ProgrammeVoyage, StatutVoyage


@pytest.fixture
async def test_voyage(db_session: AsyncSession):
    """Crée un voyage de test complet"""
    # Pays et villes
    france = Pays(nom="France", code="FR")
    espagne = Pays(nom="Espagne", code="ES")
    db_session.add_all([france, espagne])
    await db_session.commit()

    marseille = Ville(pays_id=france.id, nom="Marseille")
    barcelone = Ville(pays_id=espagne.id, nom="Barcelone")
    db_session.add_all([marseille, barcelone])
    await db_session.commit()

    # Ports
    port_marseille = Port(
        ville_id=marseille.id,
        nom="Port de Marseille",
        code_international="FRMRS"
    )
    port_barcelone = Port(
        ville_id=barcelone.id,
        nom="Port de Barcelone",
        code_international="ESBCN"
    )
    db_session.add_all([port_marseille, port_barcelone])
    await db_session.commit()

    # Compagnie et bateau
    compagnie = CompagnieBateau(
        nom="Test Ferry",
        numero_licence="TEST-001",
        taux_commission=0.05
    )
    db_session.add(compagnie)
    await db_session.commit()

    bateau = Bateau(
        compagnie_id=compagnie.id,
        nom="Test Ship",
        immatriculation="TEST-SHIP-001",
        capacite_passagers=500,
        capacite_vehicules=100,
        en_maintenance=False
    )
    db_session.add(bateau)
    await db_session.commit()

    # Route
    route = Route(
        compagnie_id=compagnie.id,
        port_depart_id=port_marseille.id,
        port_arrivee_id=port_barcelone.id,
        prix_base=80.0,
        distance_milles=250,
        duree_estimative=480
    )
    db_session.add(route)
    await db_session.commit()

    # Voyage
    depart = datetime.utcnow() + timedelta(days=7)
    arrivee = depart + timedelta(hours=8)

    voyage = ProgrammeVoyage(
        bateau_id=bateau.id,
        compagnie_id=compagnie.id,
        port_depart_id=port_marseille.id,
        port_arrivee_id=port_barcelone.id,
        route_id=route.id,
        date_depart_programme=depart,
        date_arrivee_programmee=arrivee,
        prix_base=80.0,
        statut=StatutVoyage.confirme,
        places_disponibles_passagers=500,
        places_disponibles_vehicules=100,
        places_vendues_passagers=0,
        places_vendues_vehicules=0
    )
    db_session.add(voyage)
    await db_session.commit()
    await db_session.refresh(voyage)

    return voyage


@pytest.mark.asyncio
async def test_create_reservation(client: AsyncClient, auth_headers, test_voyage):
    """Test de création d'une réservation"""
    response = await client.post(
        "/reservations",
        headers=auth_headers,
        json={
            "voyage_id": test_voyage.id,
            "type_reservation": "passager",
            "nombre_passagers": 2,
            "vehicule_inclus": False
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["voyage_id"] == test_voyage.id
    assert data["nombre_passagers"] == 2
    assert data["statut_reservation"] == "en_attente"
    assert "reference_reservation" in data


@pytest.mark.asyncio
async def test_create_reservation_with_vehicle(client: AsyncClient, auth_headers, test_voyage):
    """Test de création d'une réservation avec véhicule"""
    response = await client.post(
        "/reservations",
        headers=auth_headers,
        json={
            "voyage_id": test_voyage.id,
            "type_reservation": "mixte",
            "nombre_passagers": 2,
            "vehicule_inclus": True,
            "type_vehicule": "voiture",
            "immatriculation_vehicule": "AB-123-CD"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["vehicule_inclus"] is True
    assert data["type_vehicule"] == "voiture"
    assert data["immatriculation_vehicule"] == "AB-123-CD"


@pytest.mark.asyncio
async def test_get_user_reservations(client: AsyncClient, auth_headers, test_voyage):
    """Test de récupération des réservations de l'utilisateur"""
    # Créer une réservation
    await client.post(
        "/reservations",
        headers=auth_headers,
        json={
            "voyage_id": test_voyage.id,
            "type_reservation": "passager",
            "nombre_passagers": 1,
            "vehicule_inclus": False
        }
    )

    # Récupérer les réservations
    response = await client.get("/reservations", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_create_reservation_insufficient_seats(
    client: AsyncClient,
    auth_headers,
    test_voyage,
    db_session: AsyncSession
):
    """Test de création d'une réservation sans places suffisantes"""
    # Remplir le voyage
    test_voyage.places_vendues_passagers = 499
    await db_session.commit()

    response = await client.post(
        "/reservations",
        headers=auth_headers,
        json={
            "voyage_id": test_voyage.id,
            "type_reservation": "passager",
            "nombre_passagers": 2,
            "vehicule_inclus": False
        }
    )

    assert response.status_code == 400
    assert "not enough" in response.json()["detail"].lower()
