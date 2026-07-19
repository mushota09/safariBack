import uuid
import json
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status, BackgroundTasks

from app.config import settings
from app.models.reservation import (
    Reservation,
    ReservationPassager,
    ReservationVehicule,
    StatutReservation,
    TypeReservation,
    ReservationColis,
    ClassePassager,
)
from app.models.voyage import ProgrammeVoyage, StatutVoyage
from app.models.utilisateur import Utilisateur
from app.models.compagnie import Bateau, Niveau, Chambre, Lit
from app.models.ticket import Ticket
from app.modules.reservation.schemas import (
    ReservationUpdate,
    ReservationCreateUnified,
    ReservationFrontCreate,
    PassagerFrontInfo,
    ColisCreateInfo,
)
from app.models.pricing import (
    PricingPassager,
    PricingVehicule,
    PricingColis,
)
from app.redis_client import redis_client
from app.websocket_manager import websocket_manager
from app.services.qrcode import qrcode_service
from app.services.ticket_signing import build_global_ticket


class ReservationService:
    async def get_user_reservations(
        self,
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Reservation]:
        """Récupère les réservations d'un utilisateur"""
        query = (
            select(Reservation)
            .where(Reservation.utilisateur_id == user_id)
            .options(
                selectinload(Reservation.passagers_details),
                selectinload(Reservation.vehicules_details),
            )
            .order_by(Reservation.date_reservation.desc())
            .offset(skip)
            .limit(limit)
        )

        result = await db.execute(query)
        return result.scalars().all()

    async def get_reservation(
        self,
        db: AsyncSession,
        reservation_id: int,
        user_id: int
    ) -> Reservation:
        """Récupère une réservation par son ID"""
        query = (
            select(Reservation)
            .where(
                Reservation.id == reservation_id,
                Reservation.utilisateur_id == user_id,
            )
            .options(
                selectinload(Reservation.passagers_details),
                selectinload(Reservation.vehicules_details),
            )
        )

        result = await db.execute(query)
        reservation = result.scalar_one_or_none()

        if not reservation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reservation not found"
            )

        return reservation

    async def update_reservation(
        self,
        db: AsyncSession,
        reservation_id: int,
        user_id: int,
        reservation_data: ReservationUpdate
    ) -> Reservation:
        """Met à jour une réservation"""
        reservation = await self.get_reservation(db, reservation_id, user_id)

        # Vérifier que la réservation peut être modifiée
        if reservation.statut_reservation not in [StatutReservation.en_attente, StatutReservation.confirme]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot update this reservation"
            )

        # Mettre à jour les champs
        update_data = reservation_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(reservation, field, value)

        await db.commit()
        await db.refresh(reservation)

        return reservation

    async def cancel_reservation(
        self,
        db: AsyncSession,
        reservation_id: int,
        user_id: int,
        raison: Optional[str],
        background_tasks: BackgroundTasks
    ) -> dict:
        """Annule une réservation SANS remboursement (agent, fraude, no-show)."""
        reservation = await self.get_reservation(db, reservation_id, user_id)

        if reservation.statut_reservation in [StatutReservation.annule, StatutReservation.termine]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel this reservation"
            )

        result = await db.execute(
            select(ProgrammeVoyage).where(ProgrammeVoyage.id == reservation.voyage_id)
        )
        voyage = result.scalar_one()

        reservation.statut_reservation = StatutReservation.annule
        now = datetime.utcnow()
        reservation.date_annulation = now
        reservation.raison_annulation = raison
        reservation.frais_annulation = reservation.montant_total

        # Marquer chaque élément comme annulé
        if reservation.passagers_details:
            for p in reservation.passagers_details:
                p.rembourse = True
                p.frais_annulation = p.montant or 0
                p.date_annulation = now
                p.raison_annulation = raison
        if reservation.vehicules_details:
            for v in reservation.vehicules_details:
                v.rembourse = True
                v.frais_annulation = v.montant or 0
                v.date_annulation = now
                v.raison_annulation = raison
        if reservation.colis_details:
            for c in reservation.colis_details:
                c.rembourse = True
                c.frais_annulation = c.montant_total or 0
                c.date_annulation = now
                c.raison_annulation = raison

        nb_passagers = len(reservation.passagers_details) if reservation.passagers_details else 0
        nb_vehicules = len(reservation.vehicules_details) if reservation.vehicules_details else 0
        voyage.places_vendues_passagers -= nb_passagers
        if nb_vehicules > 0:
            voyage.places_vendues_vehicules -= nb_vehicules

        if reservation.passagers_details:
            lit_ids = [p.lit_id for p in reservation.passagers_details if p.lit_id]
            if lit_ids:
                lits_result = await db.execute(
                    select(Lit).where(Lit.id.in_(lit_ids)).with_for_update()
                )
                for lit in lits_result.scalars().all():
                    lit.disponible = True

        await db.commit()

        await redis_client.delete(f"voyage:disponibilite:{voyage.id}")
        await websocket_manager.publish_update(voyage.id, voyage.get_disponibilite())

        from app.services.email import email_service
        result_user = await db.execute(
            select(Utilisateur).where(Utilisateur.id == user_id)
        )
        user = result_user.scalar_one()

        background_tasks.add_task(
            email_service.send_cancellation_email,
            user.email,
            {
                "reference": reservation.reference_reservation,
                "frais_annulation": reservation.montant_total,
                "montant_rembourse": 0,
                "montant_total": reservation.montant_total
            }
        )

        return {
            "message": "Reservation cancelled without refund",
            "frais_annulation": reservation.montant_total,
            "montant_rembourse": 0
        }

    async def get_voyage_boat_structure(
        self,
        db: AsyncSession,
        voyage_id: int
    ) -> dict:
        """Récupère la structure du bateau avec les niveaux, chambres et lits disponibles"""
        # Récupérer le voyage avec le bateau et toute sa structure
        query = select(ProgrammeVoyage).where(
            ProgrammeVoyage.id == voyage_id
        ).options(
            selectinload(ProgrammeVoyage.bateau).selectinload(Bateau.niveaux).selectinload(Niveau.chambres).selectinload(Chambre.lits)
        )

        result = await db.execute(query)
        voyage = result.scalar_one_or_none()

        if not voyage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Voyage not found"
            )

        # Récupérer les réservations existantes pour ce voyage pour marquer les lits occupés
        reservations_query = select(Reservation).where(
            Reservation.voyage_id == voyage_id,
            Reservation.statut_reservation.in_([StatutReservation.en_attente, StatutReservation.confirme])
        )
        reservations_result = await db.execute(reservations_query)
        reservations = reservations_result.scalars().all()

        # Créer un set des IDs de lits réservés
        lits_reserves = {r.lit_id for r in reservations if r.lit_id}

        # Construire la structure
        niveaux_data = []
        for niveau in voyage.bateau.niveaux:
            chambres_data = []
            for chambre in niveau.chambres:
                lits_data = []
                for lit in chambre.lits:
                    lits_data.append({
                        "id": lit.id,
                        "numero_lit": lit.numero_lit,
                        "disponible": lit.disponible and lit.id not in lits_reserves,
                        "prix_supplementaire": lit.prix_supplementaire,
                        "type_lit": lit.type_lit,
                        "taille": lit.taille
                    })

                chambres_data.append({
                    "id": chambre.id,
                    "numero_chambre": chambre.numero_chambre,
                    "prix_base": chambre.prix_base,
                    "type_chambre": chambre.type_chambre,
                    "fenetre": chambre.fenetre,
                    "salle_de_bain": chambre.salle_de_bain,
                    "lits": lits_data
                })

            niveaux_data.append({
                "id": niveau.id,
                "numero_niveau": niveau.numero_niveau,
                "nom": niveau.nom,
                "multiplicateur_prix": niveau.multiplicateur_prix,
                "description": niveau.description,
                "chambres": chambres_data
            })

        return {
            "bateau_id": voyage.bateau.id,
            "bateau_nom": voyage.bateau.nom,
            "voyage_id": voyage.id,
            "prix_base": voyage.prix_base,
            "prix_promotionnel": voyage.prix_promotionnel,
            "has_niveaux": len(niveaux_data) > 0,
            "niveaux": niveaux_data
        }

    async def get_chambres_disponibles(
        self,
        db: AsyncSession,
        voyage_id: int
    ) -> dict:
        """Récupère toutes les chambres disponibles (structure plate)"""
        # Récupérer le voyage avec le bateau et toute sa structure
        query = select(ProgrammeVoyage).where(
            ProgrammeVoyage.id == voyage_id
        ).options(
            selectinload(ProgrammeVoyage.bateau).selectinload(Bateau.niveaux).selectinload(Niveau.chambres).selectinload(Chambre.lits)
        )

        result = await db.execute(query)
        voyage = result.scalar_one_or_none()

        if not voyage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Voyage not found"
            )

        # Récupérer les réservations existantes
        reservations_query = select(Reservation).where(
            Reservation.voyage_id == voyage_id,
            Reservation.statut_reservation.in_([StatutReservation.en_attente, StatutReservation.confirme])
        )
        reservations_result = await db.execute(reservations_query)
        reservations = reservations_result.scalars().all()

        # Créer un set des IDs de lits réservés
        lits_reserves = {r.lit_id for r in reservations if r.lit_id}

        # Construire la liste plate de chambres
        chambres_data = []
        for niveau in voyage.bateau.niveaux:
            for chambre in niveau.chambres:
                lits_disponibles = []
                for lit in chambre.lits:
                    if lit.disponible and lit.id not in lits_reserves:
                        lits_disponibles.append({
                            "id": lit.id,
                            "numero_lit": lit.numero_lit,
                            "disponible": True,
                            "prix_supplementaire": lit.prix_supplementaire,
                            "type_lit": lit.type_lit,
                            "taille": lit.taille
                        })

                # Inclure seulement les chambres avec au moins 1 lit disponible
                if lits_disponibles:
                    chambres_data.append({
                        "id": chambre.id,
                        "numero_chambre": chambre.numero_chambre,
                        "prix_base": chambre.prix_base,
                        "type_chambre": chambre.type_chambre,
                        "fenetre": chambre.fenetre,
                        "salle_de_bain": chambre.salle_de_bain,
                        "niveau_id": niveau.id,
                        "niveau_nom": niveau.nom,
                        "niveau_numero": niveau.numero_niveau,
                        "lits_disponibles": lits_disponibles
                    })

        return {
            "voyage_id": voyage.id,
            "chambres": chambres_data
        }

    async def create_reservation_unified(
        self,
        db: AsyncSession,
        user_id: int,
        reservation_data: ReservationCreateUnified
    ) -> Reservation:
        """Crée une réservation unifiée (passager/vehicule/colis) avec validation complète."""

        # 1. Récupérer le voyage avec verrou FOR UPDATE
        query = (
            select(ProgrammeVoyage)
            .where(ProgrammeVoyage.id == reservation_data.voyage_id)
            .options(
                selectinload(ProgrammeVoyage.bateau),
                selectinload(ProgrammeVoyage.route)
            )
            .with_for_update()
        )

        result = await db.execute(query)
        voyage = result.scalar_one_or_none()

        if not voyage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Voyage not found"
            )

        # Vérifier le statut du voyage
        if voyage.statut not in [StatutVoyage.programme, StatutVoyage.confirme]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Voyage is {voyage.statut.value}, cannot make reservation"
            )

        # 2. Validation de la disponibilité
        nombre_passagers = len(reservation_data.passagers) if reservation_data.passagers else 0
        nombre_vehicules = len(reservation_data.vehicules) if reservation_data.vehicules else 0
        nombre_colis = len(reservation_data.colis) if reservation_data.colis else 0

        # Vérifier places passagers
        if nombre_passagers > 0:
            places_dispo_passagers = voyage.places_disponibles_passagers - voyage.places_vendues_passagers
            if places_dispo_passagers < nombre_passagers:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Plus assez de places passagers disponibles: "
                        f"{max(places_dispo_passagers, 0)} restante(s), "
                        f"{nombre_passagers} demandée(s)."
                    ),
                )

        # Vérifier places véhicules
        if nombre_vehicules > 0:
            # Vérifier que le bateau accepte ces types de véhicules
            if not voyage.bateau:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Aucun bateau assigné à ce voyage.",
                )

            # Vérifier chaque type de véhicule
            if reservation_data.vehicules:
                for vehicule in reservation_data.vehicules:
                    capacite_vehicule = next(
                        (cap for cap in voyage.bateau.capacites_vehicules
                         if cap.type_vehicule_id == vehicule.type_vehicule_id),
                        None
                    )

                    if not capacite_vehicule or capacite_vehicule.capacite <= 0:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Ce bateau n'accepte pas le type de véhicule spécifié (ID: {vehicule.type_vehicule_id}).",
                        )

            places_dispo_vehicules = voyage.places_disponibles_vehicules - voyage.places_vendues_vehicules
            if places_dispo_vehicules < nombre_vehicules:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Plus assez de places véhicules disponibles: "
                        f"{max(places_dispo_vehicules, 0)} restante(s), "
                        f"{nombre_vehicules} demandée(s)."
                    ),
                )

        # 3. Vérifier les lits disponibles (anti-double-booking)
        if reservation_data.passagers:
            lits_utilises = [p.lit_id for p in reservation_data.passagers if p.lit_id]
            if lits_utilises:
                # Verrouiller les lits
                locked_lits_q = (
                    select(Lit).where(Lit.id.in_(lits_utilises)).with_for_update()
                )
                locked_lits = (await db.execute(locked_lits_q)).scalars().all()

                if len(locked_lits) != len(set(lits_utilises)):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="One or more requested beds do not exist",
                    )

                for lit in locked_lits:
                    if not lit.disponible:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail=f"Bed {lit.numero_lit} is not available",
                        )

                # Vérifier qu'aucune autre réservation active n'occupe ces lits
                conflict_q = (
                    select(ReservationPassager)
                    .join(Reservation, ReservationPassager.reservation_id == Reservation.id)
                    .where(
                        Reservation.voyage_id == reservation_data.voyage_id,
                        ReservationPassager.lit_id.in_(lits_utilises),
                        Reservation.statut_reservation.in_(
                            [StatutReservation.en_attente, StatutReservation.confirme]
                        ),
                    )
                )
                conflict = (await db.execute(conflict_q)).scalars().first()
                if conflict:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="One or more beds are already reserved",
                    )

                # Marquer les lits comme indisponibles
                for lit in locked_lits:
                    lit.disponible = False

        # 4. Calculer le montant total
        montant_total = await self._calculate_total_amount_unified(db, voyage, reservation_data)

        # 5. Créer la réservation principale
        reference = f"RES-{uuid.uuid4().hex[:12].upper()}"
        expiration = datetime.utcnow() + timedelta(minutes=settings.RESERVATION_EXPIRATION_MINUTES)

        # Récupérer les pricings pour les montants unitaires
        traversee = voyage.route
        pricing_passagers = await self._get_pricing_passagers(db, traversee.id)
        pricing_vehicules = await self._get_pricing_vehicules(db, traversee.id)

        reservation = Reservation(
            reference_reservation=reference,
            utilisateur_id=user_id,
            voyage_id=reservation_data.voyage_id,
            type_reservation=reservation_data.type_reservation,
            montant_total=montant_total,
            date_expiration_paiement=expiration,
            statut_reservation=StatutReservation.en_attente,
            is_front=False,
            expediteur_nom=reservation_data.expediteur_nom,
            expediteur_telephone=reservation_data.expediteur_telephone,
            destinataire_nom=reservation_data.destinataire_nom,
            destinataire_telephone=reservation_data.destinataire_telephone,
        )

        db.add(reservation)
        await db.flush()

        # 6. Créer les entrées ReservationPassager (traçabilité + montant)
        if reservation_data.passagers:
            for passager_info in reservation_data.passagers:
                classe = passager_info.classe_passager
                montant_passager = 0.0
                if classe == ClassePassager.standard:
                    montant_passager += pricing_passagers.get("standard", 0.0)
                elif classe == ClassePassager.premium:
                    montant_passager += pricing_passagers.get("premium", 0.0)
                elif classe == ClassePassager.vip:
                    montant_passager += pricing_passagers.get("vip", 0.0)
                if passager_info.chambre_id:
                    chambre = (await db.execute(
                        select(Chambre).where(Chambre.id == passager_info.chambre_id)
                    )).scalar_one_or_none()
                    if chambre:
                        montant_passager += chambre.prix_base
                if passager_info.lit_id:
                    lit = (await db.execute(
                        select(Lit).where(Lit.id == passager_info.lit_id)
                    )).scalar_one_or_none()
                    if lit:
                        montant_passager += lit.prix_supplementaire

                db.add(
                    ReservationPassager(
                        reservation_id=reservation.id,
                        nom_complet=passager_info.nom_complet,
                        email=passager_info.email,
                        telephone=passager_info.telephone,
                        date_naissance=passager_info.date_naissance,
                        numero_identite=passager_info.numero_identite,
                        classe_passager=passager_info.classe_passager,
                        niveau_id=passager_info.niveau_id,
                        chambre_id=passager_info.chambre_id,
                        lit_id=passager_info.lit_id,
                        chaise_id=passager_info.chaise_id,
                        is_principal=passager_info.is_principal,
                        montant=round(montant_passager, 2),
                    )
                )

        # 7. Créer les entrées ReservationVehicule (traçabilité + montant)
        if reservation_data.vehicules:
            for vehicule_info in reservation_data.vehicules:
                db.add(
                    ReservationVehicule(
                        reservation_id=reservation.id,
                        type_vehicule_id=vehicule_info.type_vehicule_id,
                        immatriculation=vehicule_info.immatriculation.strip().upper(),
                        marque=vehicule_info.marque,
                        modele=vehicule_info.modele,
                        couleur=vehicule_info.couleur,
                        annee=vehicule_info.annee,
                        montant=round(pricing_vehicules.get(vehicule_info.type_vehicule_id, 0.0), 2),
                    )
                )

        # 8. Créer les entrées colis
        if reservation_data.colis:
            await self._create_colis_entries(db, voyage, reservation, reservation_data.colis)

        # 9. Créer le ticket global unique
        await self._create_global_ticket(
            db,
            reservation,
            nombre_passagers,
            nombre_vehicules,
            nombre_colis
        )

        # 10. Mettre à jour les places vendues
        if nombre_passagers > 0:
            voyage.places_vendues_passagers += nombre_passagers
        if nombre_vehicules > 0:
            voyage.places_vendues_vehicules += nombre_vehicules

        await db.commit()

        # 11. Recharger avec relations
        refreshed = await db.execute(
            select(Reservation)
            .where(Reservation.id == reservation.id)
            .options(
                selectinload(Reservation.passagers_details),
                selectinload(Reservation.vehicules_details),
                selectinload(Reservation.colis_details),
                selectinload(Reservation.ticket),
            )
        )
        reservation = refreshed.scalar_one()

        # 12. Invalider le cache disponibilité du voyage
        await redis_client.delete(f"voyage:disponibilite:{voyage.id}")

        # 13. Broadcast WebSocket
        await websocket_manager.publish_update(
            voyage.id,
            voyage.get_disponibilite()
        )

        return reservation

    async def create_front_office_reservation(
        self,
        db: AsyncSession,
        user_id: int,
        data: ReservationFrontCreate
    ) -> Reservation:
        """Crée une réservation passager depuis le front office (chambre/lit/chaise possibles)."""

        query = (
            select(ProgrammeVoyage)
            .where(ProgrammeVoyage.id == data.voyage_id)
            .options(
                selectinload(ProgrammeVoyage.bateau),
                selectinload(ProgrammeVoyage.route)
            )
            .with_for_update()
        )
        result = await db.execute(query)
        voyage = result.scalar_one_or_none()

        if not voyage:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Voyage not found")
        if voyage.statut not in [StatutVoyage.programme, StatutVoyage.confirme]:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail=f"Voyage is {voyage.statut.value}, cannot make reservation"
            )

        nombre_passagers = len(data.passagers)
        places_dispo = voyage.places_disponibles_passagers - voyage.places_vendues_passagers
        if places_dispo < nombre_passagers:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail=f"Plus assez de places passagers disponibles: {max(places_dispo, 0)} restante(s), {nombre_passagers} demandée(s)."
            )

        # Vérifier lits disponibles (anti-double-booking)
        lits_utilises = [p.lit_id for p in data.passagers if p.lit_id]
        if lits_utilises:
            locked_lits_q = (
                select(Lit).where(Lit.id.in_(lits_utilises)).with_for_update()
            )
            locked_lits = (await db.execute(locked_lits_q)).scalars().all()
            if len(locked_lits) != len(set(lits_utilises)):
                raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Un ou plusieurs lits demandés n'existent pas")
            for lit in locked_lits:
                if not lit.disponible:
                    raise HTTPException(status.HTTP_409_CONFLICT, detail=f"Lit {lit.numero_lit} non disponible")
            conflict_q = (
                select(ReservationPassager)
                .join(Reservation, ReservationPassager.reservation_id == Reservation.id)
                .where(
                    Reservation.voyage_id == data.voyage_id,
                    ReservationPassager.lit_id.in_(lits_utilises),
                    Reservation.statut_reservation.in_(
                        [StatutReservation.en_attente, StatutReservation.confirme]
                    ),
                )
            )
            conflict = (await db.execute(conflict_q)).scalars().first()
            if conflict:
                raise HTTPException(status.HTTP_409_CONFLICT, detail="Un ou plusieurs lits sont déjà réservés")

            for lit in locked_lits:
                lit.disponible = False

        total = await self._calculate_total_front_office(db, voyage, data.passagers)

        reference = f"FRONT-{uuid.uuid4().hex[:12].upper()}"
        expiration = datetime.utcnow() + timedelta(minutes=settings.RESERVATION_EXPIRATION_MINUTES)

        reservation = Reservation(
            reference_reservation=reference,
            utilisateur_id=user_id,
            voyage_id=data.voyage_id,
            type_reservation=TypeReservation.passager,
            montant_total=total,
            date_expiration_paiement=expiration,
            statut_reservation=StatutReservation.en_attente,
            is_front=True,
        )
        db.add(reservation)
        await db.flush()

        # Récupérer pricings pour montants unitaires
        pricing_passagers = await self._get_pricing_passagers(db, voyage.route.id)
        chambre_ids_pr = [p.chambre_id for p in data.passagers if p.chambre_id]
        lit_ids_pr = [p.lit_id for p in data.passagers if p.lit_id]
        chambres_map_pr = {}
        if chambre_ids_pr:
            chambres_pr = await db.execute(
                select(Chambre).where(Chambre.id.in_(set(chambre_ids_pr)))
            )
            chambres_map_pr = {c.id: c for c in chambres_pr.scalars().all()}
        lits_map_pr = {}
        if lit_ids_pr:
            lits_pr = await db.execute(
                select(Lit).where(Lit.id.in_(set(lit_ids_pr)))
            )
            lits_map_pr = {l.id: l for l in lits_pr.scalars().all()}

        for p in data.passagers:
            montant_passager = 0.0
            if p.classe_passager == ClassePassager.standard:
                montant_passager += pricing_passagers.get("standard", 0.0)
            elif p.classe_passager == ClassePassager.premium:
                montant_passager += pricing_passagers.get("premium", 0.0)
            elif p.classe_passager == ClassePassager.vip:
                montant_passager += pricing_passagers.get("vip", 0.0)
            if p.chambre_id and p.chambre_id in chambres_map_pr:
                montant_passager += chambres_map_pr[p.chambre_id].prix_base
            if p.lit_id and p.lit_id in lits_map_pr:
                montant_passager += lits_map_pr[p.lit_id].prix_supplementaire

            db.add(ReservationPassager(
                reservation_id=reservation.id,
                nom_complet=p.nom_complet,
                email=p.email,
                telephone=p.telephone,
                date_naissance=p.date_naissance,
                numero_identite=p.numero_identite,
                classe_passager=p.classe_passager,
                niveau_id=p.niveau_id,
                chambre_id=p.chambre_id,
                lit_id=p.lit_id,
                chaise_id=p.chaise_id,
                is_principal=p.is_principal,
                montant=round(montant_passager, 2),
            ))

        await self._create_global_ticket(db, reservation, nombre_passagers, 0, 0)
        voyage.places_vendues_passagers += nombre_passagers

        await db.commit()

        refreshed = await db.execute(
            select(Reservation)
            .where(Reservation.id == reservation.id)
            .options(
                selectinload(Reservation.passagers_details),
                selectinload(Reservation.ticket),
            )
        )
        reservation = refreshed.scalar_one()
        await redis_client.delete(f"voyage:disponibilite:{voyage.id}")
        await websocket_manager.publish_update(voyage.id, voyage.get_disponibilite())
        return reservation

    async def _calculate_total_front_office(
        self,
        db: AsyncSession,
        voyage: ProgrammeVoyage,
        passagers: List[PassagerFrontInfo]
    ) -> float:
        if not voyage.route:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No pricing configuration found for this voyage")
        pricing = await self._get_pricing_passagers(db, voyage.route.id)

        chambre_ids = [p.chambre_id for p in passagers if p.chambre_id]
        lit_ids = [p.lit_id for p in passagers if p.lit_id]

        chambres_map = {}
        if chambre_ids:
            chambres_result = await db.execute(
                select(Chambre).where(Chambre.id.in_(set(chambre_ids)))
            )
            chambres_map = {c.id: c for c in chambres_result.scalars().all()}

        lits_map = {}
        if lit_ids:
            lits_result = await db.execute(
                select(Lit).where(Lit.id.in_(set(lit_ids)))
            )
            lits_map = {l.id: l for l in lits_result.scalars().all()}

        total = 0.0
        for p in passagers:
            if p.classe_passager == ClassePassager.standard:
                total += pricing.get("standard", 0.0)
            elif p.classe_passager == ClassePassager.premium:
                total += pricing.get("premium", 0.0)
            elif p.classe_passager == ClassePassager.vip:
                total += pricing.get("vip", 0.0)
            if p.chambre_id and p.chambre_id in chambres_map:
                total += chambres_map[p.chambre_id].prix_base
            if p.lit_id and p.lit_id in lits_map:
                total += lits_map[p.lit_id].prix_supplementaire
        return round(total, 2)

    async def _calculate_total_amount_unified(
        self,
        db: AsyncSession,
        voyage: ProgrammeVoyage,
        reservation_data: ReservationCreateUnified
    ) -> float:
        """Calcule le montant total avec pricing dynamique depuis Traversee."""
        if not voyage.route:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No pricing configuration found for this voyage"
            )

        traversee = voyage.route
        montant = 0.0

        # Récupérer les pricings depuis la traversée
        pricing_passagers = await self._get_pricing_passagers(db, traversee.id)
        pricing_vehicules = await self._get_pricing_vehicules(db, traversee.id)
        pricing_colis = await self._get_pricing_colis(db, traversee.id)

        # 1. Coût des passagers par classe
        if reservation_data.passagers:
            for passager in reservation_data.passagers:
                classe = passager.classe_passager
                if classe == ClassePassager.standard:
                    montant += pricing_passagers.get("standard", 0.0)
                elif classe == ClassePassager.premium:
                    montant += pricing_passagers.get("premium", 0.0)
                elif classe == ClassePassager.vip:
                    montant += pricing_passagers.get("vip", 0.0)

                # Ajouter coûts chambre et lit
                if passager.chambre_id:
                    chambre = (await db.execute(
                        select(Chambre).where(Chambre.id == passager.chambre_id)
                    )).scalar_one_or_none()
                    if chambre:
                        montant += chambre.prix_base

                if passager.lit_id:
                    lit = (await db.execute(
                        select(Lit).where(Lit.id == passager.lit_id)
                    )).scalar_one_or_none()
                    if lit:
                        montant += lit.prix_supplementaire

        # 2. Coût des véhicules par type
        if reservation_data.vehicules:
            for vehicule in reservation_data.vehicules:
                prix = pricing_vehicules.get(vehicule.type_vehicule_id, 0.0)
                montant += prix

        # 3. Coût des colis (prix par kg)
        if reservation_data.colis:
            prix_par_kg = pricing_colis.get("prix_par_kg", 0.0)
            for colis in reservation_data.colis:
                montant += colis.poids_kg * prix_par_kg

        return round(montant, 2)

    async def _get_pricing_passagers(self, db: AsyncSession, traversee_id: int) -> Dict[str, float]:
        """Récupère le pricing des passagers pour une traversée."""
        result = await db.execute(
            select(PricingPassager).where(
                PricingPassager.traversee_id == traversee_id,
                PricingPassager.actif == True
            )
        )
        pricing = result.scalar_one_or_none()

        if not pricing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No passenger pricing configured for this route"
            )

        return {
            "standard": float(pricing.prix_standard),
            "premium": float(pricing.prix_premium),
            "vip": float(pricing.prix_vip),
        }

    async def _get_pricing_vehicules(self, db: AsyncSession, traversee_id: int) -> Dict[int, float]:
        """Récupère le pricing des véhicules pour une traversée (dict: type_vehicule_id -> prix)."""
        result = await db.execute(
            select(PricingVehicule).where(
                PricingVehicule.traversee_id == traversee_id,
                PricingVehicule.actif == True
            )
        )
        pricings = result.scalars().all()

        return {p.type_vehicule_id: float(p.prix) for p in pricings}

    async def _get_pricing_colis(self, db: AsyncSession, traversee_id: int) -> Dict[str, float]:
        """Récupère le pricing des colis pour une traversée."""
        result = await db.execute(
            select(PricingColis).where(
                PricingColis.traversee_id == traversee_id,
                PricingColis.actif == True
            )
        )
        pricing = result.scalar_one_or_none()

        if not pricing:
            # Valeur par défaut si pas de pricing colis configuré
            return {"prix_par_kg": 0.0}

        return {"prix_par_kg": float(pricing.prix_par_kg)}

    async def _create_global_ticket(
        self,
        db: AsyncSession,
        reservation: Reservation,
        nombre_passagers: int,
        nombre_vehicules: int,
        nombre_colis: int
    ):
        """Crée un ticket global unique pour la réservation avec compteurs."""
        # Générer le ticket global signé
        numero_ticket, payload, signature, qr_string = build_global_ticket(
            reservation_id=reservation.id,
            reference=reservation.reference_reservation
        )

        # Créer l'entrée Ticket avec compteurs
        ticket = Ticket(
            reservation_id=reservation.id,
            numero_ticket=numero_ticket,
            qr_payload=json.dumps(payload),
            qr_signature=signature,
            nombre_passagers=nombre_passagers,
            nombre_vehicules=nombre_vehicules,
            nombre_colis=nombre_colis,
        )
        db.add(ticket)

        # Générer le QR code (fichier image)
        await qrcode_service.generate_ticket_qr_code(
            numero_ticket=numero_ticket,
            reservation_id=reservation.id,
            signed_payload=qr_string
        )

    async def _create_colis_entries(
        self,
        db: AsyncSession,
        voyage: ProgrammeVoyage,
        reservation: Reservation,
        colis_info: List[ColisCreateInfo]
    ):
        """Crée les entrées ReservationColis avec calcul du prix."""
        # Récupérer pricing colis
        pricing_colis = await self._get_pricing_colis(db, voyage.route.id)
        prix_par_kg = pricing_colis.get("prix_par_kg", 0.0)

        for colis in colis_info:
            montant_colis = colis.poids_kg * prix_par_kg

            db.add(
                ReservationColis(
                    reservation_id=reservation.id,
                    description_marchandises=colis.description_marchandises,
                    poids_kg=colis.poids_kg,
                    montant_par_kg=prix_par_kg,
                    montant_total=round(montant_colis, 2),
                )
            )



reservation_service = ReservationService()
