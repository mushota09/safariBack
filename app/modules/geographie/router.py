"""Module de géographie - Routes pour les ports et villes"""
import asyncio
import json
import math
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.geographie import Port, Ville
from app.models.voyage import ProgrammeVoyage

router = APIRouter(prefix="/geographie", tags=["Géographie"])


@router.get("/ports")
async def get_all_ports(db: Annotated[AsyncSession, Depends(get_db)]):
    """Récupère tous les ports"""
    query = select(Port).options(
        selectinload(Port.ville).selectinload(Ville.pays)
    )
    result = await db.execute(query)
    ports = result.scalars().all()

    return [
        {
            "id": p.id,
            "nom": p.nom,
            "code_international": p.code_international,
            "latitude": p.latitude,
            "longitude": p.longitude,
            "ville": {
                "id": p.ville.id,
                "nom": p.ville.nom,
                "pays": {
                    "id": p.ville.pays.id,
                    "nom": p.ville.pays.nom,
                    "code": p.ville.pays.code
                }
            }
        }
        for p in ports
    ]


@router.get("/ports/nearest")
async def get_nearest_port(
    db: Annotated[AsyncSession, Depends(get_db)],
    latitude: float = Query(..., description="Latitude de l'utilisateur"),
    longitude: float = Query(..., description="Longitude de l'utilisateur")
):
    """Trouve le port le plus proche"""
    print(f"🔍 Recherche port: lat={latitude}, lon={longitude}")

    # Récupérer tous les ports avec coordonnées
    query = (
        select(Port)
        .options(selectinload(Port.ville).selectinload(Ville.pays))
        .where(and_(Port.latitude.isnot(None), Port.longitude.isnot(None)))
    )

    result = await db.execute(query)
    ports = result.scalars().all()

    print(f"📍 {len(ports)} ports trouvés")

    if not ports:
        raise HTTPException(status_code=404, detail="Aucun port avec GPS")

    # Calculer distances (Haversine)
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)
        a = (math.sin(delta_lat / 2) ** 2 +
             math.cos(lat1_rad) * math.cos(lat2_rad) *
             math.sin(delta_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c

    # Trouver le plus proche
    nearest_port = None
    min_distance = float('inf')

    for port in ports:
        distance = haversine(latitude, longitude, port.latitude, port.longitude)
        print(f"  {port.nom}: {distance:.2f} km")
        if distance < min_distance:
            min_distance = distance
            nearest_port = port

    print(f"✅ Plus proche: {nearest_port.nom} ({min_distance:.2f} km)")

    return {
        "id": nearest_port.id,
        "nom": nearest_port.nom,
        "code_international": nearest_port.code_international,
        "latitude": nearest_port.latitude,
        "longitude": nearest_port.longitude,
        "distance_km": round(min_distance, 2),
        "ville": {
            "id": nearest_port.ville.id,
            "nom": nearest_port.ville.nom,
            "pays": {
                "id": nearest_port.ville.pays.id,
                "nom": nearest_port.ville.pays.nom,
                "code": nearest_port.ville.pays.code
            }
        }
    }


@router.get("/ports/{port_id}/programme")
async def get_port_programme(
    port_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    date_debut: datetime = Query(None),
    date_fin: datetime = Query(None)
):
    """Récupère le programme d'un port"""
    if not date_debut:
        date_debut = datetime.now()
    if not date_fin:
        date_fin = date_debut + timedelta(days=7)

    async def generate():
        # Départs
        query_departs = (
            select(ProgrammeVoyage)
            .where(
                and_(
                    ProgrammeVoyage.port_depart_id == port_id,
                    ProgrammeVoyage.date_depart_programme >= date_debut,
                    ProgrammeVoyage.date_depart_programme <= date_fin,
                    ProgrammeVoyage.statut.in_(['programme', 'confirme', 'retarde'])
                )
            )
            .options(
                selectinload(ProgrammeVoyage.port_depart),
                selectinload(ProgrammeVoyage.port_arrivee),
                selectinload(ProgrammeVoyage.bateau),
                selectinload(ProgrammeVoyage.compagnie)
            )
            .order_by(ProgrammeVoyage.date_depart_programme)
        )

        result = await db.execute(query_departs)
        departs = result.scalars().all()

        for v in departs:
            data = {
                "type": "depart",
                "id": v.id,
                "bateau": {"nom": v.bateau.nom, "compagnie": v.compagnie.nom},
                "destination": v.port_arrivee.nom,
                "date": v.date_depart_programme.isoformat(),
                "heure": v.date_depart_programme.strftime("%H:%M"),
                "statut": v.statut.value,
                "places_disponibles": v.places_disponibles_passagers
            }
            yield (json.dumps(data) + '\n').encode('utf-8')
            await asyncio.sleep(0)

        # Arrivées
        query_arrivees = (
            select(ProgrammeVoyage)
            .where(
                and_(
                    ProgrammeVoyage.port_arrivee_id == port_id,
                    ProgrammeVoyage.date_arrivee_programmee >= date_debut,
                    ProgrammeVoyage.date_arrivee_programmee <= date_fin,
                    ProgrammeVoyage.statut.in_(['programme', 'confirme', 'retarde'])
                )
            )
            .options(
                selectinload(ProgrammeVoyage.port_depart),
                selectinload(ProgrammeVoyage.port_arrivee),
                selectinload(ProgrammeVoyage.bateau),
                selectinload(ProgrammeVoyage.compagnie)
            )
            .order_by(ProgrammeVoyage.date_arrivee_programmee)
        )

        result = await db.execute(query_arrivees)
        arrivees = result.scalars().all()

        for v in arrivees:
            data = {
                "type": "arrivee",
                "id": v.id,
                "bateau": {"nom": v.bateau.nom, "compagnie": v.compagnie.nom},
                "provenance": v.port_depart.nom,
                "date": v.date_arrivee_programmee.isoformat(),
                "heure": v.date_arrivee_programmee.strftime("%H:%M"),
                "statut": v.statut.value
            }
            yield (json.dumps(data) + '\n').encode('utf-8')
            await asyncio.sleep(0)

    return StreamingResponse(
        generate(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


@router.get("/villes")
async def get_all_villes(db: Annotated[AsyncSession, Depends(get_db)]):
    """Récupère toutes les villes"""
    query = select(Ville).options(selectinload(Ville.pays))
    result = await db.execute(query)
    villes = result.scalars().all()

    return [
        {
            "id": v.id,
            "nom": v.nom,
            "pays": {
                "id": v.pays.id,
                "nom": v.pays.nom,
                "code": v.pays.code
            }
        }
        for v in villes
    ]
