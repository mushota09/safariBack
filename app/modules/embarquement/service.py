"""Service d'embarquement.

Le scanner du frontend peut envoyer soit:
  - un numéro de ticket (ancien format, scan basique)
  - une chaîne QR signée (préfixe ``SAFARI:``), pour billet global ou individuel

Toutes les opérations vérifient la signature lorsque le QR signé est fourni.

Le QR global (ticket de la réservation) permet d'embarquer plusieurs personnes
en une seule action OU de cocher individuellement les passagers à embarquer.

Le QR individuel (passager / véhicule) ne s'applique qu'à un seul ticket.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.passager import Passager, StatutPassager
from app.models.reservation import (
    Reservation,
    ReservationPassager,
    ReservationVehicule,
    StatutReservation,
)
from app.models.ticket import Ticket
from app.models.vehicule import VehiculeReservation
from app.models.voyage import ProgrammeVoyage
from app.models.compagnie import Bateau
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

    # ------------------------------------------------------------------
    # Scan complet : embarque tout (cas individuel, ou global "tout cocher")
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # Verify : retourne les détails sans embarquer (avec liste passagers
    # pour QR global, pour permettre la sélection par l'agent)
    # ------------------------------------------------------------------

    async def verify_ticket(self, db: AsyncSession, code: str) -> Dict[str, Any]:
        """Vérifie un billet sans le marquer comme embarqué.

        Pour un QR global, retourne aussi la liste des passagers/véhicules
        de la réservation pour que l'agent puisse cocher individuellement.
        """
        target = await self._resolve_target(db, code)
        kind = target["kind"]
        numero = target["numero_ticket"]

        if kind == "passager":
            return await self._verify_passager(db, numero)
        if kind == "vehicule":
            return await self._verify_vehicule(db, numero)
        return await self._verify_global(db, numero)

    async def _verify_passager(self, db: AsyncSession, numero: str) -> Dict[str, Any]:
        passager = await self._find_passager(db, numero)
        reservation = await self._find_reservation(db, passager.reservation_id)
        bateau_nom, voyage_libelle = await self._get_voyage_context(db, reservation.voyage_id)
        return {
            "kind": "passager",
            "numero_ticket": passager.numero_ticket,
            "reference_reservation": reservation.reference_reservation,
            "nom_complet": passager.nom_complet,
            "statut": passager.statut.value,
            "embarque": passager.embarque,
            "date_embarquement": passager.date_embarquement,
            "voyage": {"id": reservation.voyage_id, "libelle": voyage_libelle},
            "bateau": {"nom": bateau_nom} if bateau_nom else None,
        }

    async def _verify_vehicule(self, db: AsyncSession, numero: str) -> Dict[str, Any]:
        vehic = await self._find_vehicule(db, numero)
        reservation = await self._find_reservation(db, vehic.reservation_id)
        bateau_nom, voyage_libelle = await self._get_voyage_context(db, reservation.voyage_id)
        return {
            "kind": "vehicule",
            "numero_ticket": vehic.numero_ticket,
            "reference_reservation": reservation.reference_reservation,
            "immatriculation": vehic.immatriculation,
            "embarque": vehic.embarque,
            "date_embarquement": vehic.date_embarquement,
            "voyage": {"id": reservation.voyage_id, "libelle": voyage_libelle},
            "bateau": {"nom": bateau_nom} if bateau_nom else None,
        }

    async def _verify_global(self, db: AsyncSession, numero: str) -> Dict[str, Any]:
        ticket = await self._find_global_ticket(db, numero)
        # Charger la réservation + tous ses passagers/véhicules associés
        q = (
            select(Reservation)
            .where(Reservation.id == ticket.reservation_id)
            .options(
                selectinload(Reservation.passagers_details),
                selectinload(Reservation.vehicules_details),
            )
        )
        reservation = (await db.execute(q)).scalar_one_or_none()
        if not reservation:
            raise HTTPException(status_code=404, detail="Reservation not found")

        # Tickets individuels passagers (table `passager`) si présents
        ind_passagers = await self._individual_passagers(db, reservation.id)
        ind_passagers_by_email = {p.email: p for p in ind_passagers if p.email}
        ind_passagers_by_name = {p.nom_complet: p for p in ind_passagers if p.nom_complet}

        # Liste enrichie pour permettre la sélection côté agent
        passagers_list: List[Dict[str, Any]] = []
        for p in reservation.passagers_details:
            ind = (
                (p.email and ind_passagers_by_email.get(p.email))
                or ind_passagers_by_name.get(p.nom_complet)
            )
            passagers_list.append({
                "id": p.id,
                "nom_complet": p.nom_complet,
                "email": p.email,
                "telephone": p.telephone,
                "chambre_id": p.chambre_id,
                "lit_id": p.lit_id,
                "is_principal": p.is_principal,
                "statut": ind.statut.value if ind else "en_attente",
                "embarque": ind.embarque if ind else ticket.embarque,
                "date_embarquement": (ind.date_embarquement if ind else ticket.date_embarquement),
                "numero_ticket": ind.numero_ticket if ind else None,
            })

        vehicules_list: List[Dict[str, Any]] = []
        for v in reservation.vehicules_details:
            # match vehicule_reservation par immatriculation
            vr_q = await db.execute(
                select(VehiculeReservation).where(
                    VehiculeReservation.reservation_id == reservation.id,
                    VehiculeReservation.immatriculation == v.immatriculation,
                )
            )
            vr = vr_q.scalar_one_or_none()
            vehicules_list.append({
                "id": v.id,
                "type_vehicule": v.type_vehicule.value,
                "immatriculation": v.immatriculation,
                "marque": v.marque,
                "modele": v.modele,
                "embarque": vr.embarque if vr else ticket.embarque,
                "annule": vr.annule if vr else False,
                "numero_ticket": vr.numero_ticket if vr else None,
            })

        bateau_nom, voyage_libelle = await self._get_voyage_context(db, reservation.voyage_id)

        return {
            "kind": "global",
            "numero_ticket": ticket.numero_ticket,
            "reference_reservation": reservation.reference_reservation,
            "statut_reservation": reservation.statut_reservation.value,
            "embarque": ticket.embarque,
            "date_embarquement": ticket.date_embarquement,
            "nombre_passagers": reservation.nombre_passagers,
            "vehicule_inclus": reservation.vehicule_inclus,
            "passagers": passagers_list,
            "vehicules": vehicules_list,
            "voyage": {"id": reservation.voyage_id, "libelle": voyage_libelle},
            "bateau": {"nom": bateau_nom} if bateau_nom else None,
        }

    # ------------------------------------------------------------------
    # Boarding atomique global / individuel
    # ------------------------------------------------------------------

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

        # Marquer aussi tous les passagers/véhicules individuels comme embarqués
        result = await db.execute(
            select(Passager).where(Passager.reservation_id == reservation.id)
        )
        passagers_embarques = []
        for passager in result.scalars().all():
            if not passager.embarque and passager.statut != StatutPassager.annule:
                passager.embarque = True
                passager.date_embarquement = ticket.date_embarquement
                passager.statut = StatutPassager.embarque
                passagers_embarques.append({"id": passager.id, "nom_complet": passager.nom_complet})

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
            "passagers_embarques": passagers_embarques,
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

    # ------------------------------------------------------------------
    # Embarquement sélectif (depuis QR global, cocher une partie)
    # ------------------------------------------------------------------

    async def scan_selective(
        self,
        db: AsyncSession,
        code: str,
        passager_ids: List[int],
        vehicule_ids: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """Embarque uniquement les passagers/véhicules dont l'`id` (issu de
        ``reservation_passager`` / ``reservation_vehicule``) est cité.

        Si toute la réservation a été cochée, on marque aussi le ticket global
        comme embarqué.
        """
        vehicule_ids = vehicule_ids or []
        target = await self._resolve_target(db, code)
        if target["kind"] != "global":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selective boarding is only available for global tickets",
            )

        ticket = await self._find_global_ticket(db, target["numero_ticket"])
        reservation = await self._find_reservation(db, ticket.reservation_id)
        self._ensure_reservation_boardable(reservation)

        now = datetime.utcnow()
        boarded: List[Dict[str, Any]] = []
        skipped: List[Dict[str, Any]] = []

        # --- Passagers ---
        if passager_ids:
            q = await db.execute(
                select(ReservationPassager).where(
                    ReservationPassager.reservation_id == reservation.id,
                    ReservationPassager.id.in_(passager_ids),
                )
            )
            rp_list = list(q.scalars().all())
            if len(rp_list) != len(set(passager_ids)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="One or more passenger ids do not belong to this reservation",
                )

            # Pour chaque ReservationPassager, on tente de retrouver le Passager
            # individuel correspondant (par email/nom) afin d'y marquer l'embarquement.
            ind_all = await self._individual_passagers(db, reservation.id)
            ind_by_email = {p.email: p for p in ind_all if p.email}
            ind_by_name = {p.nom_complet: p for p in ind_all if p.nom_complet}

            for rp in rp_list:
                ind = (
                    (rp.email and ind_by_email.get(rp.email))
                    or ind_by_name.get(rp.nom_complet)
                )
                if ind is not None:
                    if ind.embarque:
                        skipped.append({"id": rp.id, "reason": "already_boarded"})
                        continue
                    if ind.statut == StatutPassager.annule:
                        skipped.append({"id": rp.id, "reason": "cancelled"})
                        continue
                    ind.embarque = True
                    ind.date_embarquement = now
                    ind.statut = StatutPassager.embarque
                boarded.append({
                    "id": rp.id,
                    "nom_complet": rp.nom_complet,
                    "numero_ticket": ind.numero_ticket if ind else None,
                })

        # --- Véhicules ---
        if vehicule_ids:
            qv = await db.execute(
                select(ReservationVehicule).where(
                    ReservationVehicule.reservation_id == reservation.id,
                    ReservationVehicule.id.in_(vehicule_ids),
                )
            )
            rv_list = list(qv.scalars().all())
            if len(rv_list) != len(set(vehicule_ids)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="One or more vehicle ids do not belong to this reservation",
                )

            for rv in rv_list:
                vr_q = await db.execute(
                    select(VehiculeReservation).where(
                        VehiculeReservation.reservation_id == reservation.id,
                        VehiculeReservation.immatriculation == rv.immatriculation,
                    )
                )
                vr = vr_q.scalar_one_or_none()
                if vr is not None:
                    if vr.embarque:
                        skipped.append({"id": rv.id, "reason": "already_boarded"})
                        continue
                    if vr.annule:
                        skipped.append({"id": rv.id, "reason": "cancelled"})
                        continue
                    vr.embarque = True
                    vr.date_embarquement = now
                boarded.append({"id": rv.id, "immatriculation": rv.immatriculation})

        # Si tous les passagers/véhicules de la réservation sont désormais embarqués,
        # on marque aussi le ticket global comme embarqué (pour cohérence).
        all_boarded = await self._all_individuals_boarded(db, reservation.id)
        if all_boarded and not ticket.embarque:
            ticket.embarque = True
            ticket.date_embarquement = now

        await db.commit()

        return {
            "status": "partial" if not all_boarded else "success",
            "kind": "global",
            "message": f"{len(boarded)} ticket(s) embarqué(s)",
            "reference_reservation": reservation.reference_reservation,
            "numero_ticket": ticket.numero_ticket,
            "date_embarquement": now,
            "passagers_embarques": [b for b in boarded if "nom_complet" in b],
            "vehicules_embarques": [b for b in boarded if "immatriculation" in b],
            "skipped": skipped,
            "global_complete": all_boarded,
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

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

    @staticmethod
    async def _individual_passagers(db: AsyncSession, reservation_id: int) -> List[Passager]:
        result = await db.execute(
            select(Passager).where(Passager.reservation_id == reservation_id)
        )
        return list(result.scalars().all())

    async def _all_individuals_boarded(self, db: AsyncSession, reservation_id: int) -> bool:
        """Vrai si tous les passagers/véhicules individuels actifs sont embarqués."""
        # Passagers (table individuelle si présente)
        ind_passagers = await self._individual_passagers(db, reservation_id)
        for p in ind_passagers:
            if p.statut != StatutPassager.annule and not p.embarque:
                return False

        # Véhicules
        result_v = await db.execute(
            select(VehiculeReservation).where(VehiculeReservation.reservation_id == reservation_id)
        )
        for v in result_v.scalars().all():
            if not v.annule and not v.embarque:
                return False
        return True

    async def _get_voyage_context(self, db: AsyncSession, voyage_id: int) -> tuple[Optional[str], Optional[str]]:
        """Retourne (bateau_nom, voyage_libelle) pour enrichir le retour scanner."""
        q = (
            select(ProgrammeVoyage)
            .where(ProgrammeVoyage.id == voyage_id)
            .options(
                selectinload(ProgrammeVoyage.bateau),
                selectinload(ProgrammeVoyage.port_depart),
                selectinload(ProgrammeVoyage.port_arrivee),
            )
        )
        v = (await db.execute(q)).scalar_one_or_none()
        if not v:
            return None, None
        bateau_nom = v.bateau.nom if v.bateau else None
        depart = v.port_depart.nom if v.port_depart else "?"
        arrivee = v.port_arrivee.nom if v.port_arrivee else "?"
        libelle = f"{depart} → {arrivee}"
        return bateau_nom, libelle


embarquement_service = EmbarquementService()
