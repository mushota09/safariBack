"""Service d'embarquement pour le système de tickets globaux.

Permet de:
- Scanner un QR code global
- Voir les détails (passagers, véhicules, colis)
- Marquer l'embarquement individuel ou en masse
- Vérifier si ticket déjà scanné ou expiré
- Annuler embarquement
- Gérer les absents (no-show)
- Vérifier l'identité
- Statistiques temps réel
- Recherche et filtrage
"""
from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.ticket import Ticket
from app.models.reservation import (
    Reservation,
    StatutReservation,
    ReservationPassager,
    ReservationVehicule,
    ReservationColis,
)
from app.models.voyage import ProgrammeVoyage
from app.models.embarquement_log import EmbarquementLog, TypeActionEmbarquement
from app.services.ticket_signing import verify_qr


class EmbarquementService:
    def _determiner_statut_scan(
        self, ticket: Ticket, voyage: ProgrammeVoyage
    ) -> Dict[str, Any]:
        """
        Détermine le statut d'un ticket lors du scan.

        Returns:
            Dict avec:
            - code: "valide", "deja_scanne", "expire", "voyage_termine"
            - message: Message descriptif
            - peut_embarquer: Boolean
            - details: Informations supplémentaires
        """
        now = datetime.utcnow()
        date_depart = voyage.date_depart_programme

        # 1. Vérifier si le voyage est terminé
        if voyage.statut.value == "termine":
            return {
                "code": "voyage_termine",
                "message": "Le voyage est déjà terminé",
                "peut_embarquer": False,
                "details": {
                    "date_depart": date_depart,
                    "statut_voyage": voyage.statut.value,
                }
            }

        # 2. Vérifier si le ticket est déjà complètement embarqué
        if ticket.embarque:
            return {
                "code": "deja_scanne",
                "message": "Ticket déjà scanné - Tous les éléments sont embarqués",
                "peut_embarquer": False,
                "details": {
                    "date_embarquement": ticket.date_embarquement,
                    "nombre_passagers": ticket.nombre_passagers,
                    "nombre_vehicules": ticket.nombre_vehicules,
                    "nombre_colis": ticket.nombre_colis,
                }
            }

        # 3. Vérifier si le ticket est expiré (voyage déjà parti)
        # On considère qu'on peut embarquer jusqu'à 30 min après le départ programmé
        limite_embarquement = date_depart + timedelta(minutes=30)

        if now > limite_embarquement:
            return {
                "code": "expire",
                "message": f"Ticket expiré - Le départ était prévu le {date_depart.strftime('%d/%m/%Y à %H:%M')}",
                "peut_embarquer": False,
                "details": {
                    "date_depart_programme": date_depart,
                    "limite_embarquement": limite_embarquement,
                    "date_actuelle": now,
                }
            }

        # 4. Avertissement si proche du départ (moins de 1h)
        temps_restant = (date_depart - now).total_seconds() / 60

        if temps_restant < 60:
            return {
                "code": "valide_urgent",
                "message": f"Ticket valide - ATTENTION: Départ dans {int(temps_restant)} minutes!",
                "peut_embarquer": True,
                "details": {
                    "date_depart_programme": date_depart,
                    "minutes_avant_depart": int(temps_restant),
                    "statut_voyage": voyage.statut.value,
                }
            }

        # 5. Ticket valide
        return {
            "code": "valide",
            "message": "Ticket valide - Prêt pour l'embarquement",
            "peut_embarquer": True,
            "details": {
                "date_depart_programme": date_depart,
                "heures_avant_depart": round(temps_restant / 60, 1),
                "statut_voyage": voyage.statut.value,
            }
        }

    async def scan_ticket_global(
        self, db: AsyncSession, code: str
    ) -> Dict[str, Any]:
        """
        Scanne un QR code global et retourne tous les détails.

        Args:
            code: Soit le numéro de ticket, soit la chaîne QR signée (SAFARI:...)

        Returns:
            Dict avec:
            - statut_scan: statut du ticket (valide, deja_scanne, expire)
            - ticket: info ticket
            - reservation: info réservation
            - voyage: info voyage (dates, statut)
            - passagers: liste des passagers avec statut embarquement
            - vehicules: liste des véhicules avec statut embarquement
            - colis: liste des colis avec statut embarquement
        """
        # Résoudre le numéro de ticket
        numero_ticket = await self._resolve_ticket_number(code)

        # Récupérer le ticket avec la réservation, le voyage et tous les détails
        query = (
            select(Ticket)
            .where(Ticket.numero_ticket == numero_ticket)
            .options(
                selectinload(Ticket.reservation).selectinload(
                    Reservation.voyage
                ),
                selectinload(Ticket.reservation).selectinload(
                    Reservation.passagers_details
                ),
                selectinload(Ticket.reservation).selectinload(
                    Reservation.vehicules_details
                ),
                selectinload(Ticket.reservation).selectinload(
                    Reservation.colis_details
                ),
            )
        )

        result = await db.execute(query)
        ticket = result.scalar_one_or_none()

        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found"
            )

        reservation = ticket.reservation
        voyage = reservation.voyage

        # Déterminer le statut du scan
        statut_scan_info = self._determiner_statut_scan(ticket, voyage)

        # Vérifier que la réservation est confirmée
        if reservation.statut_reservation != StatutReservation.confirme:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Reservation status is {reservation.statut_reservation.value}, must be 'confirme' to board"
            )

        # Construire la réponse avec tous les détails
        return {
            "statut_scan": statut_scan_info,
            "ticket": {
                "numero_ticket": ticket.numero_ticket,
                "embarque": ticket.embarque,
                "date_embarquement": ticket.date_embarquement,
                "nombre_passagers": ticket.nombre_passagers,
                "nombre_vehicules": ticket.nombre_vehicules,
                "nombre_colis": ticket.nombre_colis,
            },
            "reservation": {
                "id": reservation.id,
                "reference_reservation": reservation.reference_reservation,
                "type_reservation": reservation.type_reservation.value,
                "statut_reservation": reservation.statut_reservation.value,
                "montant_total": reservation.montant_total,
            },
            "voyage": {
                "id": voyage.id,
                "date_depart_programme": voyage.date_depart_programme,
                "date_arrivee_programmee": voyage.date_arrivee_programmee,
                "statut": voyage.statut.value,
            },
            "passagers": [
                {
                    "id": p.id,
                    "nom_complet": p.nom_complet,
                    "email": p.email,
                    "telephone": p.telephone,
                    "classe_passager": p.classe_passager.value,
                    "is_principal": p.is_principal,
                    "embarque": p.embarque,
                    "date_embarquement": p.date_embarquement,
                }
                for p in reservation.passagers_details
            ],
            "vehicules": [
                {
                    "id": v.id,
                    "immatriculation": v.immatriculation,
                    "marque": v.marque,
                    "modele": v.modele,
                    "couleur": v.couleur,
                    "embarque": v.embarque,
                    "date_embarquement": v.date_embarquement,
                }
                for v in reservation.vehicules_details
            ],
            "colis": [
                {
                    "id": c.id,
                    "description_marchandises": c.description_marchandises,
                    "poids_kg": c.poids_kg,
                    "montant_total": c.montant_total,
                    "destinataire_nom": c.destinataire_nom,
                    "embarque": c.embarque,
                    "date_embarquement": c.date_embarquement,
                }
                for c in reservation.colis_details
            ],
        }

    async def marquer_embarquement(
        self,
        db: AsyncSession,
        numero_ticket: str,
        selection: Dict[str, Any],
        agent_id: int = None,
        agent_nom: str = None
    ) -> Dict[str, Any]:
        """
        Marque l'embarquement des éléments sélectionnés.

        Args:
            numero_ticket: Numéro du ticket global
            selection: Dict avec:
                - tout: bool (si true, embarquer tout)
                - passagers_ids: List[int] (IDs des passagers à embarquer)
                - vehicules_ids: List[int] (IDs des véhicules à embarquer)
                - colis_ids: List[int] (IDs des colis à embarquer)

        Returns:
            Résumé de l'embarquement avec compteurs
        """
        # Récupérer le ticket avec la réservation et le voyage
        query = (
            select(Ticket)
            .where(Ticket.numero_ticket == numero_ticket)
            .options(
                selectinload(Ticket.reservation).selectinload(
                    Reservation.voyage
                ),
                selectinload(Ticket.reservation).selectinload(
                    Reservation.passagers_details
                ),
                selectinload(Ticket.reservation).selectinload(
                    Reservation.vehicules_details
                ),
                selectinload(Ticket.reservation).selectinload(
                    Reservation.colis_details
                ),
            )
        )

        result = await db.execute(query)
        ticket = result.scalar_one_or_none()

        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found"
            )

        reservation = ticket.reservation
        voyage = reservation.voyage

        # Vérifier le statut avant d'embarquer
        statut_scan = self._determiner_statut_scan(ticket, voyage)

        if not statut_scan["peut_embarquer"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot board: {statut_scan['message']}"
            )

        # Vérifier que la réservation est confirmée
        if reservation.statut_reservation != StatutReservation.confirme:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot board: reservation is {reservation.statut_reservation.value}"
            )

        date_embarquement = datetime.utcnow()
        compteurs = {
            "passagers_embarques": 0,
            "vehicules_embarques": 0,
            "colis_embarques": 0,
        }

        passagers_ids_embarques = []
        vehicules_ids_embarques = []
        colis_ids_embarques = []

        # Cas 1: Tout sélectionner
        if selection.get("tout", False):
            # Embarquer tous les passagers
            for passager in reservation.passagers_details:
                if not passager.embarque:
                    passager.embarque = True
                    passager.date_embarquement = date_embarquement
                    if agent_id and agent_nom:
                        passager.agent_embarquement_id = agent_id
                        passager.agent_embarquement_nom = agent_nom
                    compteurs["passagers_embarques"] += 1
                    passagers_ids_embarques.append(passager.id)

            # Embarquer tous les véhicules
            for vehicule in reservation.vehicules_details:
                if not vehicule.embarque:
                    vehicule.embarque = True
                    vehicule.date_embarquement = date_embarquement
                    if agent_id and agent_nom:
                        vehicule.agent_embarquement_id = agent_id
                        vehicule.agent_embarquement_nom = agent_nom
                    compteurs["vehicules_embarques"] += 1
                    vehicules_ids_embarques.append(vehicule.id)

            # Embarquer tous les colis
            for colis in reservation.colis_details:
                if not colis.embarque:
                    colis.embarque = True
                    colis.date_embarquement = date_embarquement
                    if agent_id and agent_nom:
                        colis.agent_embarquement_id = agent_id
                        colis.agent_embarquement_nom = agent_nom
                    compteurs["colis_embarques"] += 1
                    colis_ids_embarques.append(colis.id)

        # Cas 2: Sélection individuelle
        else:
            # Embarquer passagers sélectionnés
            passagers_ids = selection.get("passagers_ids", [])
            if passagers_ids:
                for passager in reservation.passagers_details:
                    if passager.id in passagers_ids and not passager.embarque:
                        passager.embarque = True
                        passager.date_embarquement = date_embarquement
                        if agent_id and agent_nom:
                            passager.agent_embarquement_id = agent_id
                            passager.agent_embarquement_nom = agent_nom
                        compteurs["passagers_embarques"] += 1
                        passagers_ids_embarques.append(passager.id)

            # Embarquer véhicules sélectionnés
            vehicules_ids = selection.get("vehicules_ids", [])
            if vehicules_ids:
                for vehicule in reservation.vehicules_details:
                    if vehicule.id in vehicules_ids and not vehicule.embarque:
                        vehicule.embarque = True
                        vehicule.date_embarquement = date_embarquement
                        if agent_id and agent_nom:
                            vehicule.agent_embarquement_id = agent_id
                            vehicule.agent_embarquement_nom = agent_nom
                        compteurs["vehicules_embarques"] += 1
                        vehicules_ids_embarques.append(vehicule.id)

            # Embarquer colis sélectionnés
            colis_ids = selection.get("colis_ids", [])
            if colis_ids:
                for colis in reservation.colis_details:
                    if colis.id in colis_ids and not colis.embarque:
                        colis.embarque = True
                        colis.date_embarquement = date_embarquement
                        if agent_id and agent_nom:
                            colis.agent_embarquement_id = agent_id
                            colis.agent_embarquement_nom = agent_nom
                        compteurs["colis_embarques"] += 1
                        colis_ids_embarques.append(colis.id)

        # Vérifier si tout est embarqué maintenant
        tous_passagers_embarques = all(
            p.embarque for p in reservation.passagers_details
        )
        tous_vehicules_embarques = all(
            v.embarque for v in reservation.vehicules_details
        )
        tous_colis_embarques = all(
            c.embarque for c in reservation.colis_details
        )

        # Marquer le ticket global comme embarqué si tout est embarqué
        if (
            tous_passagers_embarques
            and tous_vehicules_embarques
            and tous_colis_embarques
        ):
            if not ticket.embarque:
                ticket.embarque = True
                ticket.date_embarquement = date_embarquement

        # Log de l'embarquement si agent fourni
        if agent_id and agent_nom:
            log = EmbarquementLog(
                ticket_id=ticket.id,
                numero_ticket=numero_ticket,
                agent_id=agent_id,
                agent_nom=agent_nom,
                action=TypeActionEmbarquement.embarquement,
                details={
                    "passagers_ids": passagers_ids_embarques,
                    "vehicules_ids": vehicules_ids_embarques,
                    "colis_ids": colis_ids_embarques,
                    "tout": selection.get("tout", False),
                }
            )
            db.add(log)

        await db.commit()

        return {
            "status": "success",
            "message": "Embarquement enregistré avec succès",
            "ticket_global_embarque": ticket.embarque,
            "date_embarquement": date_embarquement,
            **compteurs,
            "total_passagers": len(reservation.passagers_details),
            "total_vehicules": len(reservation.vehicules_details),
            "total_colis": len(reservation.colis_details),
        }

    async def _resolve_ticket_number(self, code: str) -> str:
        """
        Résout un code en numéro de ticket.

        Args:
            code: Soit un numéro direct, soit une chaîne QR signée (SAFARI:...)

        Returns:
            Numéro de ticket
        """
        # Cas 1: QR code signé
        if code.startswith("SAFARI:"):
            try:
                payload = verify_qr(code)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid QR signature: {exc}",
                ) from exc

            ticket_number = payload.get("ticket")
            if not ticket_number:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid QR payload: missing ticket number",
                )

            return ticket_number

        # Cas 2: Numéro de ticket direct
        return code

    async def annuler_embarquement(
        self,
        db: AsyncSession,
        numero_ticket: str,
        agent_id: int,
        agent_nom: str,
        raison: str,
        passagers_ids: List[int] = None,
        vehicules_ids: List[int] = None,
        colis_ids: List[int] = None
    ) -> Dict[str, Any]:
        """Annule l'embarquement d'éléments."""

        query = (
            select(Ticket)
            .where(Ticket.numero_ticket == numero_ticket)
            .options(
                selectinload(Ticket.reservation).selectinload(
                    Reservation.passagers_details
                ),
                selectinload(Ticket.reservation).selectinload(
                    Reservation.vehicules_details
                ),
                selectinload(Ticket.reservation).selectinload(
                    Reservation.colis_details
                ),
            )
        )

        result = await db.execute(query)
        ticket = result.scalar_one_or_none()

        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found"
            )

        reservation = ticket.reservation
        compteurs = {
            "passagers_debarques": 0,
            "vehicules_debarques": 0,
            "colis_debarques": 0,
        }

        # Débarquer passagers
        if passagers_ids:
            for passager in reservation.passagers_details:
                if passager.id in passagers_ids and passager.embarque:
                    passager.embarque = False
                    passager.date_embarquement = None
                    passager.agent_embarquement_id = None
                    passager.agent_embarquement_nom = None
                    compteurs["passagers_debarques"] += 1

        # Débarquer véhicules
        if vehicules_ids:
            for vehicule in reservation.vehicules_details:
                if vehicule.id in vehicules_ids and vehicule.embarque:
                    vehicule.embarque = False
                    vehicule.date_embarquement = None
                    vehicule.agent_embarquement_id = None
                    vehicule.agent_embarquement_nom = None
                    compteurs["vehicules_debarques"] += 1

        # Débarquer colis
        if colis_ids:
            for colis in reservation.colis_details:
                if colis.id in colis_ids and colis.embarque:
                    colis.embarque = False
                    colis.date_embarquement = None
                    colis.agent_embarquement_id = None
                    colis.agent_embarquement_nom = None
                    compteurs["colis_debarques"] += 1

        # Démarquer ticket global
        ticket.embarque = False
        ticket.date_embarquement = None

        # Log de l'annulation
        log = EmbarquementLog(
            ticket_id=ticket.id,
            numero_ticket=numero_ticket,
            agent_id=agent_id,
            agent_nom=agent_nom,
            action=TypeActionEmbarquement.annulation,
            commentaire=raison,
            details={
                "passagers_ids": passagers_ids or [],
                "vehicules_ids": vehicules_ids or [],
                "colis_ids": colis_ids or [],
            }
        )
        db.add(log)

        await db.commit()

        return {
            "status": "success",
            "message": "Annulation effectuée",
            **compteurs,
            "raison": raison
        }

    async def marquer_absents(
        self,
        db: AsyncSession,
        numero_ticket: str,
        agent_id: int,
        agent_nom: str,
        passagers_ids: List[int] = None,
        colis_ids: List[int] = None,
        raison: str = None
    ) -> Dict[str, Any]:
        """Marque des éléments comme absents (no-show)."""

        query = (
            select(Ticket)
            .where(Ticket.numero_ticket == numero_ticket)
            .options(
                selectinload(Ticket.reservation).selectinload(
                    Reservation.passagers_details
                ),
                selectinload(Ticket.reservation).selectinload(
                    Reservation.colis_details
                ),
            )
        )

        result = await db.execute(query)
        ticket = result.scalar_one_or_none()

        if not ticket:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ticket not found"
            )

        reservation = ticket.reservation
        date_marquage = datetime.utcnow()

        compteurs = {"passagers_absents": 0, "colis_absents": 0}

        # Note: For passagers, would need to add est_absent field in future
        # For now, only tracking colis absents

        # Marquer colis absents
        if colis_ids:
            for colis in reservation.colis_details:
                if colis.id in colis_ids and not colis.embarque:
                    colis.est_absent = True
                    colis.date_marquage_absent = date_marquage
                    colis.raison_absence = raison
                    compteurs["colis_absents"] += 1

        # Log
        log = EmbarquementLog(
            ticket_id=ticket.id,
            numero_ticket=numero_ticket,
            agent_id=agent_id,
            agent_nom=agent_nom,
            action=TypeActionEmbarquement.marquage_absent,
            commentaire=raison,
            details={
                "passagers_ids": passagers_ids or [],
                "colis_ids": colis_ids or [],
            }
        )
        db.add(log)

        await db.commit()

        return {
            "status": "success",
            "message": "Absents marqués",
            **compteurs
        }

    async def verifier_identite(
        self,
        db: AsyncSession,
        passager_id: int,
        agent_id: int,
        agent_nom: str,
        document_type: str,
        document_numero: str
    ) -> Dict[str, Any]:
        """Vérifie et enregistre l'identité d'un passager."""

        query = select(ReservationPassager).where(
            ReservationPassager.id == passager_id
        )
        result = await db.execute(query)
        passager = result.scalar_one_or_none()

        if not passager:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Passenger not found"
            )

        # Marquer identité vérifiée
        passager.identite_verifiee = True
        passager.document_verifie_type = document_type
        passager.document_verifie_numero = document_numero

        # Log
        log = EmbarquementLog(
            ticket_id=passager.reservation.ticket.id,
            numero_ticket=passager.reservation.ticket.numero_ticket,
            agent_id=agent_id,
            agent_nom=agent_nom,
            action=TypeActionEmbarquement.verification_identite,
            details={
                "passager_id": passager_id,
                "document_type": document_type,
            }
        )
        db.add(log)

        await db.commit()

        return {
            "status": "success",
            "message": "Identité vérifiée",
            "passager_id": passager_id,
            "document_type": document_type
        }

    async def get_statistiques_voyage(
        self,
        db: AsyncSession,
        voyage_id: int
    ) -> Dict[str, Any]:
        """Retourne les statistiques d'embarquement d'un voyage via agrégations SQL."""

        # Récupérer le voyage
        voyage_query = select(ProgrammeVoyage).where(
            ProgrammeVoyage.id == voyage_id
        )
        voyage_result = await db.execute(voyage_query)
        voyage = voyage_result.scalar_one_or_none()

        if not voyage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Voyage not found"
            )

        # Récupérer les réservations confirmées avec chargement eager
        # (une seule requête au lieu de N+1)
        reservations_query = (
            select(Reservation)
            .where(
                Reservation.voyage_id == voyage_id,
                Reservation.statut_reservation == StatutReservation.confirme
            )
            .options(
                selectinload(Reservation.passagers_details),
                selectinload(Reservation.vehicules_details),
                selectinload(Reservation.colis_details),
                selectinload(Reservation.ticket),
            )
        )

        result = await db.execute(reservations_query)
        reservations = result.scalars().all()

        # Calcul en une passe avec compréhensions (évite les sous-boucles)
        total_passagers = sum(len(r.passagers_details) for r in reservations)
        total_vehicules = sum(len(r.vehicules_details) for r in reservations)
        total_colis = sum(len(r.colis_details) for r in reservations)

        passagers_embarques = sum(
            sum(1 for p in r.passagers_details if p.embarque) for r in reservations
        )
        vehicules_embarques = sum(
            sum(1 for v in r.vehicules_details if v.embarque) for r in reservations
        )
        colis_embarques = sum(
            sum(1 for c in r.colis_details if c.embarque) for r in reservations
        )

        colis_absents = sum(
            sum(1 for c in r.colis_details if c.est_absent) for r in reservations
        )

        # Dernière activité (max date parmi tous les éléments)
        toutes_dates = [
            p.date_embarquement for r in reservations
            for p in r.passagers_details if p.date_embarquement
        ] + [
            v.date_embarquement for r in reservations
            for v in r.vehicules_details if v.date_embarquement
        ] + [
            c.date_embarquement for r in reservations
            for c in r.colis_details if c.date_embarquement
        ]
        derniere_activite = max(toutes_dates) if toutes_dates else None

        # Réservations avec ticket global embarqué
        reservations_avec_embarquement = sum(
            1 for r in reservations if r.ticket and r.ticket.embarque
        )

        # Calculs des taux
        taux_passagers = (
            (passagers_embarques / total_passagers * 100)
            if total_passagers > 0 else 0
        )
        taux_vehicules = (
            (vehicules_embarques / total_vehicules * 100)
            if total_vehicules > 0 else 0
        )

        return {
            "voyage_id": voyage_id,
            "total_reservations": len(reservations),
            "reservations_avec_embarquement": reservations_avec_embarquement,

            "total_passagers_attendus": total_passagers,
            "passagers_embarques": passagers_embarques,
            "passagers_absents": 0,  # Champ à ajouter sur ReservationPassager
            "passagers_en_attente": total_passagers - passagers_embarques,
            "taux_embarquement_passagers": round(taux_passagers, 2),

            "total_vehicules_attendus": total_vehicules,
            "vehicules_embarques": vehicules_embarques,
            "vehicules_en_attente": total_vehicules - vehicules_embarques,
            "taux_embarquement_vehicules": round(taux_vehicules, 2),

            "total_colis_attendus": total_colis,
            "colis_embarques": colis_embarques,
            "colis_absents": colis_absents,
            "colis_en_attente": total_colis - colis_embarques - colis_absents,

            "derniere_activite": derniere_activite,
            "date_depart_programme": voyage.date_depart_programme,
        }

    async def lister_reservations_voyage(
        self,
        db: AsyncSession,
        voyage_id: int,
        filtre: str = None  # "tout", "embarque", "non_embarque", "partiel"
    ) -> Dict[str, Any]:
        """Liste les réservations d'un voyage avec statut d'embarquement."""

        query = (
            select(Reservation)
            .where(
                Reservation.voyage_id == voyage_id,
                Reservation.statut_reservation == StatutReservation.confirme
            )
            .options(
                selectinload(Reservation.utilisateur),
                selectinload(Reservation.passagers_details),
                selectinload(Reservation.vehicules_details),
                selectinload(Reservation.colis_details),
                selectinload(Reservation.ticket),
            )
        )

        result = await db.execute(query)
        reservations = result.scalars().all()

        resultats = []

        for reservation in reservations:
            # Calculer statuts
            total_elements = (
                len(reservation.passagers_details) +
                len(reservation.vehicules_details) +
                len(reservation.colis_details)
            )

            elements_embarques = (
                sum(1 for p in reservation.passagers_details if p.embarque) +
                sum(1 for v in reservation.vehicules_details if v.embarque) +
                sum(1 for c in reservation.colis_details if c.embarque)
            )

            tout_embarque = (
                elements_embarques == total_elements and total_elements > 0
            )
            partiellement_embarque = (
                0 < elements_embarques < total_elements
            )
            aucun_embarque = elements_embarques == 0

            # Appliquer filtre
            if filtre == "embarque" and not tout_embarque:
                continue
            if filtre == "non_embarque" and not aucun_embarque:
                continue
            if filtre == "partiel" and not partiellement_embarque:
                continue

            resultats.append({
                "reservation_id": reservation.id,
                "reference_reservation": reservation.reference_reservation,
                "numero_ticket": (
                    reservation.ticket.numero_ticket
                    if reservation.ticket else None
                ),
                "type_reservation": reservation.type_reservation.value,

                "nombre_passagers": len(reservation.passagers_details),
                "nombre_vehicules": len(reservation.vehicules_details),
                "nombre_colis": len(reservation.colis_details),

                "passagers_embarques": sum(
                    1 for p in reservation.passagers_details if p.embarque
                ),
                "vehicules_embarques": sum(
                    1 for v in reservation.vehicules_details if v.embarque
                ),
                "colis_embarques": sum(
                    1 for c in reservation.colis_details if c.embarque
                ),

                "tout_embarque": tout_embarque,
                "partiellement_embarque": partiellement_embarque,
                "aucun_embarque": aucun_embarque,

                "utilisateur_nom": getattr(
                    reservation.utilisateur, "nom_complet", None
                ),
                "utilisateur_email": getattr(
                    reservation.utilisateur, "email", None
                ),
            })

        return {
            "resultats": resultats,
            "total": len(resultats)
        }

    async def rechercher_reservation(
        self,
        db: AsyncSession,
        voyage_id: int,
        nom: str = None,
        reference: str = None,
        numero_ticket: str = None
    ) -> Dict[str, Any]:
        """Recherche une réservation par nom, référence ou numéro ticket."""

        query = (
            select(Reservation)
            .where(
                Reservation.voyage_id == voyage_id,
                Reservation.statut_reservation == StatutReservation.confirme
            )
            .options(
                selectinload(Reservation.utilisateur),
                selectinload(Reservation.passagers_details),
                selectinload(Reservation.vehicules_details),
                selectinload(Reservation.colis_details),
                selectinload(Reservation.ticket),
            )
        )

        result = await db.execute(query)
        reservations = result.scalars().all()

        resultats = []

        for reservation in reservations:
            # Filtrer par critères
            match = False

            if numero_ticket and reservation.ticket:
                if numero_ticket.lower() in (
                    reservation.ticket.numero_ticket.lower()
                ):
                    match = True

            if reference:
                if reference.lower() in (
                    reservation.reference_reservation.lower()
                ):
                    match = True

            if nom:
                # Recherche dans les passagers
                for passager in reservation.passagers_details:
                    if nom.lower() in passager.nom_complet.lower():
                        match = True
                        break

            if not match and not (nom or reference or numero_ticket):
                match = True  # Pas de filtre = tout retourner

            if match:
                resultats.append({
                    "reservation_id": reservation.id,
                    "reference_reservation": reservation.reference_reservation,
                    "numero_ticket": (
                        reservation.ticket.numero_ticket
                        if reservation.ticket else None
                    ),
                    "type_reservation": reservation.type_reservation.value,

                    "nombre_passagers": len(reservation.passagers_details),
                    "nombre_vehicules": len(reservation.vehicules_details),
                    "nombre_colis": len(reservation.colis_details),

                    "passagers_embarques": sum(
                        1 for p in reservation.passagers_details if p.embarque
                    ),
                    "vehicules_embarques": sum(
                        1 for v in reservation.vehicules_details if v.embarque
                    ),
                    "colis_embarques": sum(
                        1 for c in reservation.colis_details if c.embarque
                    ),

                    "utilisateur_nom": getattr(
                        reservation.utilisateur, "nom_complet", None
                    ),
                    "utilisateur_email": getattr(
                        reservation.utilisateur, "email", None
                    ),
                })

        return {
            "resultats": resultats,
            "total": len(resultats)
        }


embarquement_service = EmbarquementService()
