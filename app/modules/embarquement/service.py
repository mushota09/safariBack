"""Service d'embarquement.

Le scanner du frontend peut envoyer soit:
  - un numéro de ticket (ancien format, scan basique)
  - une chaîne QR signée (préfixe ``SAFARI:``), pour billet global ou individuel

Toutes les opérations vérifient la signature lorsque le QR signé est fourni.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.passager import Passager, StatutPassager
from app.models.reservation import Reservation, StatutReservation
from app.models.ticket import Ticket
from app.models.vehicule import VehiculeReservation
from app.services.ticket_signing import verify_qr


class EmbarquementService:
    async def _resolve_target(self, db: AsyncSession, code: str) -> Dict[str, Any]:
        """Résout un code (QR signé ou numéro de ticket) en cible scannable."""
        # Cas 1: chaîne QR signée
        if code.startswith("SAFARI:"):
            try:
                payload = verify_qr(code)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid QR signature: {exc}",
                )

            kind = payload.get("kind")
            ticket_number = payload.get("ticket")
            if not kind or not ticket_number:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid QR payload",
                )
            return {"kind": kind, "numero_ticket": ticket_number, "payload": payload}

        # Cas 2: ancien format / numéro direct
        if code.startswith("TKT-P-"):
            return {"kind": "passager", "numero_ticket": code, "payload": None}
        if code.startswith("TKT-V-"):
            return {"kind": "vehicule", "numero_ticket": code, "payload": None}
        return {"kind": "global", "numero_ticket": code, "payload": None}

    async def scan_ticket(self, db: AsyncSession, code: str) -> Dict[str, Any]:
        """Scanne un billet (global, passager ou véhicule) pour embarquement."""
        target = await self._resolve_target(db, code)
        kind = target["kind"]
        numero = target["numero_ticket"]

        if kind == "passager":
            return await self._board_passager(db, numero)
        if kind == "vehicule":
            return await self._board_vehicule(db, numero)
        return await self._board_global(db, numero)

    async def verify_ticket(self, db: AsyncSession, code: str) -> Dict[str, Any]:
        """Vérifie un billet sans le marquer comme embarqué."""
        target = await self._resolve_target(db, code)
        kind = target["kind"]
        numero = target["numero_ticket"]

        if kind == "passager":
            passager = await self._find_passager(db, numero)
            reservation = await self._find_reservation(db, passager.reservation_id)
            return {
                "kind": "passager",
                "numero_ticket": passager.numero_ticket,
                "reference_reservation": reservation.reference_reservation,
                "nom_complet": passager.nom_complet,
                "statut": passager.statut.value,
                "embarque": passager.embarque,
                "date_embarquement": passager.date_embarquement,
            }
        if kind == "vehicule":
            vehic = await self._find_vehicule(db, numero)
            reservation = await self._find_reservation(db, vehic.reservation_id)
            return {
                "kind": "vehicule",
                "numero_ticket": vehic.numero_ticket,
                "reference_reservation": reservation.reference_reservation,
                "immatriculation": vehic.immatriculation,
                "embarque": vehic.embarque,
                "date_embarquement": vehic.date_embarquement,
            }

        ticket = await self._find_global_ticket(db, numero)
        reservation = await self._find_reservation(db, ticket.reservation_id)
        return {
            "kind": "global",
            "numero_ticket": ticket.numero_ticket,
            "reference_reservation": reservation.reference_reservation,
            "statut_reservation": reservation.statut_reservation.value,
            "embarque": ticket.embarque,
            "date_embarquement": ticket.date_embarquement,
            "nombre_passagers": reservation.nombre_passagers,
            "vehicule_inclus": reservation.vehicule_inclus,
        }

    async def _board_global(self, db: AsyncSession, numero: str) -> Dict[str, Any]:
        ticket = await self._find_global_ticket(db, numero)
        if ticket.embarque:
            return {
                "status": "already_boarded",
                "kind": "global",
                "message": "Ticket already used for boarding",
                "date_embarquement": ticket.date_embarquement,
            }

        reservation = await self._find_reservation(db, ticket.reservation_id)
        self._ensure_reservation_boardable(reservation)

        ticket.embarque = True
        ticket.date_embarquement = datetime.utcnow()

        # Marquer aussi tous les passagers/véhicules de la réservation comme embarqués
        result = await db.execute(
            select(Passager).where(Passager.reservation_id == reservation.id)
        )
        for passager in result.scalars().all():
            if not passager.embarque and passager.statut != StatutPassager.annule:
                passager.embarque = True
                passager.date_embarquement = ticket.date_embarquement
                passager.statut = StatutPassager.embarque

        result_v = await db.execute(
            select(VehiculeReservation).where(VehiculeReservation.reservation_id == reservation.id)
        )
        for vehic in result_v.scalars().all():
            if not vehic.embarque and not vehic.annule:
                vehic.embarque = True
                vehic.date_embarquement = ticket.date_embarquement

        await db.commit()

        return {
            "status": "success",
            "kind": "global",
            "message": "Boarding successful",
            "numero_ticket": ticket.numero_ticket,
            "reference_reservation": reservation.reference_reservation,
            "nombre_passagers": reservation.nombre_passagers,
            "vehicule_inclus": reservation.vehicule_inclus,
            "date_embarquement": ticket.date_embarquement,
        }

    async def _board_passager(self, db: AsyncSession, numero: str) -> Dict[str, Any]:
        passager = await self._find_passager(db, numero)
        if passager.statut == StatutPassager.annule:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Passenger ticket has been cancelled",
            )
        if passager.embarque:
            return {
                "status": "already_boarded",
                "kind": "passager",
                "message": "Passenger already boarded",
                "date_embarquement": passager.date_embarquement,
                "nom_complet": passager.nom_complet,
            }

        reservation = await self._find_reservation(db, passager.reservation_id)
        self._ensure_reservation_boardable(reservation)

        passager.embarque = True
        passager.date_embarquement = datetime.utcnow()
        passager.statut = StatutPassager.embarque

        await db.commit()

        return {
            "status": "success",
            "kind": "passager",
            "message": "Passenger boarding successful",
            "numero_ticket": passager.numero_ticket,
            "reference_reservation": reservation.reference_reservation,
            "nom_complet": passager.nom_complet,
            "date_embarquement": passager.date_embarquement,
        }

    async def _board_vehicule(self, db: AsyncSession, numero: str) -> Dict[str, Any]:
        vehic = await self._find_vehicule(db, numero)
        if vehic.annule:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vehicle ticket has been cancelled",
            )
        if vehic.embarque:
            return {
                "status": "already_boarded",
                "kind": "vehicule",
                "message": "Vehicle already boarded",
                "date_embarquement": vehic.date_embarquement,
                "immatriculation": vehic.immatriculation,
            }

        reservation = await self._find_reservation(db, vehic.reservation_id)
        self._ensure_reservation_boardable(reservation)

        vehic.embarque = True
        vehic.date_embarquement = datetime.utcnow()

        await db.commit()

        return {
            "status": "success",
            "kind": "vehicule",
            "message": "Vehicle boarding successful",
            "numero_ticket": vehic.numero_ticket,
            "immatriculation": vehic.immatriculation,
            "date_embarquement": vehic.date_embarquement,
        }

    @staticmethod
    def _ensure_reservation_boardable(reservation: Reservation) -> None:
        if reservation.statut_reservation != StatutReservation.confirme:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Reservation is {reservation.statut_reservation.value}, cannot board",
            )

    @staticmethod
    async def _find_global_ticket(db: AsyncSession, numero: str) -> Ticket:
        result = await db.execute(select(Ticket).where(Ticket.numero_ticket == numero))
        ticket = result.scalar_one_or_none()
        if not ticket:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
        return ticket

    @staticmethod
    async def _find_passager(db: AsyncSession, numero: str) -> Passager:
        result = await db.execute(select(Passager).where(Passager.numero_ticket == numero))
        passager = result.scalar_one_or_none()
        if not passager:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Passenger ticket not found")
        return passager

    @staticmethod
    async def _find_vehicule(db: AsyncSession, numero: str) -> VehiculeReservation:
        result = await db.execute(
            select(VehiculeReservation).where(VehiculeReservation.numero_ticket == numero)
        )
        vehic = result.scalar_one_or_none()
        if not vehic:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle ticket not found")
        return vehic

    @staticmethod
    async def _find_reservation(db: AsyncSession, reservation_id: int) -> Reservation:
        result = await db.execute(select(Reservation).where(Reservation.id == reservation_id))
        reservation = result.scalar_one_or_none()
        if not reservation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
        return reservation


embarquement_service = EmbarquementService()
