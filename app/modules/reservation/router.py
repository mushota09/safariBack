from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.utilisateur import Utilisateur
from app.modules.reservation.schemas import (
    ReservationCreate,
    ReservationUpdate,
    ReservationResponse,
    ReservationCancellation,
    BateauStructureResponse,
    ChambresDisponiblesResponse,
    ReservationCreateMultiple
)
from app.modules.reservation.service import reservation_service

router = APIRouter(prefix="/reservations", tags=["Réservations"])


@router.post("", response_model=ReservationResponse)
async def create_reservation(
    reservation_data: ReservationCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Utilisateur, Depends(get_current_user)]
):
    """Crée une nouvelle réservation"""
    return await reservation_service.create_reservation(db, current_user.id, reservation_data)


@router.get("", response_model=List[ReservationResponse])
async def get_user_reservations(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Utilisateur, Depends(get_current_user)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """Récupère les réservations de l'utilisateur connecté"""
    skip = (page - 1) * page_size
    return await reservation_service.get_user_reservations(
        db,
        current_user.id,
        skip=skip,
        limit=page_size
    )


@router.get("/{reservation_id}", response_model=ReservationResponse)
async def get_reservation(
    reservation_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Utilisateur, Depends(get_current_user)]
):
    """Récupère une réservation par son ID"""
    return await reservation_service.get_reservation(db, reservation_id, current_user.id)


@router.put("/{reservation_id}", response_model=ReservationResponse)
async def update_reservation(
    reservation_id: int,
    reservation_data: ReservationUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Utilisateur, Depends(get_current_user)]
):
    """Met à jour une réservation"""
    return await reservation_service.update_reservation(
        db,
        reservation_id,
        current_user.id,
        reservation_data
    )


@router.post("/{reservation_id}/cancel")
async def cancel_reservation(
    reservation_id: int,
    cancellation_data: ReservationCancellation,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Utilisateur, Depends(get_current_user)],
    background_tasks: BackgroundTasks
):
    """Annule une réservation"""
    return await reservation_service.cancel_reservation(
        db,
        reservation_id,
        current_user.id,
        cancellation_data.raison,
        background_tasks
    )


@router.get("/voyage/{voyage_id}/structure", response_model=BateauStructureResponse)
async def get_voyage_boat_structure(
    voyage_id: int,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Récupère la structure du bateau avec les niveaux, chambres et lits disponibles pour un voyage"""
    return await reservation_service.get_voyage_boat_structure(db, voyage_id)


@router.get("/voyage/{voyage_id}/chambres-disponibles", response_model=ChambresDisponiblesResponse)
async def get_chambres_disponibles(
    voyage_id: int,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Récupère toutes les chambres disponibles (structure plate) pour un voyage"""
    return await reservation_service.get_chambres_disponibles(db, voyage_id)


@router.post("/multiple", response_model=ReservationResponse)
async def create_reservation_multiple(
    reservation_data: ReservationCreateMultiple,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Utilisateur, Depends(get_current_user)]
):
    """Crée une réservation pour plusieurs passagers"""
    return await reservation_service.create_reservation_multiple(db, current_user.id, reservation_data)
