from typing import Annotated
from fastapi import APIRouter, Depends, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.utilisateur import Utilisateur
from app.modules.paiement.schemas import PaiementCreate, PaiementResponse
from app.modules.paiement.service import paiement_service

router = APIRouter(prefix="/paiements", tags=["Paiements"])


@router.post("", response_model=PaiementResponse)
async def process_payment(
    paiement_data: PaiementCreate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Utilisateur, Depends(get_current_user)]
):
    """Traite un paiement pour une réservation"""
    # Ajouter les informations du client
    paiement_data.ip_client = request.client.host
    paiement_data.user_agent = request.headers.get("user-agent")

    return await paiement_service.process_payment(
        db,
        current_user.id,
        paiement_data,
        background_tasks
    )


@router.get("/{paiement_id}", response_model=PaiementResponse)
async def get_payment(
    paiement_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Utilisateur, Depends(get_current_user)]
):
    """Récupère les détails d'un paiement"""
    return await paiement_service.get_payment(db, paiement_id, current_user.id)


@router.get("/reservation/{reservation_id}", response_model=PaiementResponse)
async def get_payment_by_reservation(
    reservation_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Utilisateur, Depends(get_current_user)]
):
    """Récupère le paiement d'une réservation"""
    return await paiement_service.get_payment_by_reservation(db, reservation_id, current_user.id)
