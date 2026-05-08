from typing import Annotated
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import verify_api_key
from app.models.ticket import Ticket
from app.models.reservation import Reservation, StatutReservation

router = APIRouter(prefix="/embarquement", tags=["Embarquement"])


@router.post("/scan/{numero_ticket}")
async def scan_ticket(
    numero_ticket: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[bool, Depends(verify_api_key)]
):
    """
    Scanne un billet pour l'embarquement (nécessite une clé API).

    Marque le billet comme embarqué et vérifie sa validité.
    """
    # Récupérer le ticket
    result = await db.execute(
        select(Ticket).where(Ticket.numero_ticket == numero_ticket)
    )
    ticket = result.scalar_one_or_none()

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    # Vérifier si déjà embarqué
    if ticket.embarque:
        return {
            "status": "already_boarded",
            "message": "Ticket already used for boarding",
            "date_embarquement": ticket.date_embarquement
        }

    # Récupérer la réservation
    result = await db.execute(
        select(Reservation).where(Reservation.id == ticket.reservation_id)
    )
    reservation = result.scalar_one()

    # Vérifier le statut de la réservation
    if reservation.statut_reservation != StatutReservation.confirme:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Reservation is {reservation.statut_reservation.value}, cannot board"
        )

    # Marquer comme embarqué
    ticket.embarque = True
    ticket.date_embarquement = datetime.utcnow()

    await db.commit()

    return {
        "status": "success",
        "message": "Boarding successful",
        "numero_ticket": ticket.numero_ticket,
        "reference_reservation": reservation.reference_reservation,
        "nombre_passagers": reservation.nombre_passagers,
        "vehicule_inclus": reservation.vehicule_inclus,
        "date_embarquement": ticket.date_embarquement
    }


@router.get("/verify/{numero_ticket}")
async def verify_ticket(
    numero_ticket: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[bool, Depends(verify_api_key)]
):
    """Vérifie la validité d'un billet sans l'embarquer"""
    result = await db.execute(
        select(Ticket).where(Ticket.numero_ticket == numero_ticket)
    )
    ticket = result.scalar_one_or_none()

    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )

    result = await db.execute(
        select(Reservation).where(Reservation.id == ticket.reservation_id)
    )
    reservation = result.scalar_one()

    return {
        "numero_ticket": ticket.numero_ticket,
        "reference_reservation": reservation.reference_reservation,
        "statut_reservation": reservation.statut_reservation.value,
        "embarque": ticket.embarque,
        "date_embarquement": ticket.date_embarquement,
        "nombre_passagers": reservation.nombre_passagers,
        "vehicule_inclus": reservation.vehicule_inclus
    }
