import uuid
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status, BackgroundTasks

from app.config import settings
from app.models.reservation import Reservation, StatutReservation
from app.models.voyage import ProgrammeVoyage, StatutVoyage
from app.models.utilisateur import Utilisateur
from app.modules.reservation.schemas import ReservationCreate, ReservationUpdate
from app.redis_client import redis_client
from app.websocket_manager import websocket_manager


class ReservationService:
    async def create_reservation(
        self,
        db: AsyncSession,
        user_id: int,
        reservation_data: ReservationCreate
    ) -> Reservation:
        """Crée une nouvelle réservation avec verrou optimiste"""
        # Récupérer le voyage avec verrou
        query = select(ProgrammeVoyage).where(
            ProgrammeVoyage.id == reservation_data.voyage_id
        ).with_for_update()

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

        # Vérifier les places disponibles
        places_dispo_passagers = voyage.places_disponibles_passagers - voyage.places_vendues_passagers
        places_dispo_vehicules = voyage.places_disponibles_vehicules - voyage.places_vendues_vehicules

        if places_dispo_passagers < reservation_data.nombre_passagers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Not enough passenger seats available"
            )

        if reservation_data.vehicule_inclus and places_dispo_vehicules < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No vehicle spaces available"
            )

        # Calculer le montant total
        montant_total = self._calculate_total_amount(voyage, reservation_data)

        # Créer la réservation
        reference = f"RES-{uuid.uuid4().hex[:12].upper()}"
        expiration = datetime.utcnow() + timedelta(minutes=settings.RESERVATION_EXPIRATION_MINUTES)

        reservation = Reservation(
            reference_reservation=reference,
            utilisateur_id=user_id,
            voyage_id=reservation_data.voyage_id,
            type_reservation=reservation_data.type_reservation,
            niveau_id=reservation_data.niveau_id,
            chambre_id=reservation_data.chambre_id,
            lit_id=reservation_data.lit_id,
            montant_total=montant_total,
            date_expiration_paiement=expiration,
            nombre_passagers=reservation_data.nombre_passagers,
            vehicule_inclus=reservation_data.vehicule_inclus,
            type_vehicule=reservation_data.type_vehicule,
            immatriculation_vehicule=reservation_data.immatriculation_vehicule,
            statut_reservation=StatutReservation.en_attente
        )

        db.add(reservation)

        # Mettre à jour les places vendues (réservation temporaire)
        voyage.places_vendues_passagers += reservation_data.nombre_passagers
        if reservation_data.vehicule_inclus:
            voyage.places_vendues_vehicules += 1

        await db.commit()
        await db.refresh(reservation)

        # Invalider le cache des traversées
        await redis_client.delete_pattern("traversees:*")

        # Broadcast la mise à jour de disponibilité
        await websocket_manager.publish_update(
            voyage.id,
            voyage.get_disponibilite()
        )

        return reservation

    async def get_user_reservations(
        self,
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[Reservation]:
        """Récupère les réservations d'un utilisateur"""
        query = select(Reservation).where(
            Reservation.utilisateur_id == user_id
        ).order_by(Reservation.date_reservation.desc()).offset(skip).limit(limit)

        result = await db.execute(query)
        return result.scalars().all()

    async def get_reservation(
        self,
        db: AsyncSession,
        reservation_id: int,
        user_id: int
    ) -> Reservation:
        """Récupère une réservation par son ID"""
        query = select(Reservation).where(
            Reservation.id == reservation_id,
            Reservation.utilisateur_id == user_id
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
        """Annule une réservation"""
        reservation = await self.get_reservation(db, reservation_id, user_id)

        # Vérifier que la réservation peut être annulée
        if reservation.statut_reservation in [StatutReservation.annule, StatutReservation.termine]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel this reservation"
            )

        # Récupérer le voyage
        result = await db.execute(
            select(ProgrammeVoyage).where(ProgrammeVoyage.id == reservation.voyage_id)
        )
        voyage = result.scalar_one()

        # Calculer les frais d'annulation
        frais_annulation = self._calculate_cancellation_fees(reservation, voyage)
        montant_rembourse = reservation.montant_total - frais_annulation

        # Mettre à jour la réservation
        reservation.statut_reservation = StatutReservation.annule
        reservation.date_annulation = datetime.utcnow()
        reservation.raison_annulation = raison
        reservation.frais_annulation = frais_annulation

        # Libérer les places
        voyage.places_vendues_passagers -= reservation.nombre_passagers
        if reservation.vehicule_inclus:
            voyage.places_vendues_vehicules -= 1

        await db.commit()

        # Invalider le cache
        await redis_client.delete_pattern("traversees:*")

        # Broadcast la mise à jour
        await websocket_manager.publish_update(
            voyage.id,
            voyage.get_disponibilite()
        )

        # Envoyer l'email d'annulation en arrière-plan
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
                "frais_annulation": frais_annulation,
                "montant_rembourse": montant_rembourse,
                "montant_total": reservation.montant_total
            }
        )

        return {
            "message": "Reservation cancelled successfully",
            "frais_annulation": frais_annulation,
            "montant_rembourse": montant_rembourse
        }

    def _calculate_total_amount(
        self,
        voyage: ProgrammeVoyage,
        reservation_data: ReservationCreate
    ) -> float:
        """Calcule le montant total de la réservation"""
        prix_base = voyage.prix_promotionnel if voyage.prix_promotionnel else voyage.prix_base
        montant = prix_base * reservation_data.nombre_passagers

        # Ajouter le coût du véhicule si applicable
        if reservation_data.vehicule_inclus:
            # Prix du véhicule = 50% du prix de base par défaut
            montant += prix_base * 0.5

        return round(montant, 2)

    def _calculate_cancellation_fees(
        self,
        reservation: Reservation,
        voyage: ProgrammeVoyage
    ) -> float:
        """Calcule les frais d'annulation selon le délai avant le départ"""
        now = datetime.utcnow()
        time_until_departure = voyage.date_depart_programme - now

        # Frais selon le délai
        if time_until_departure.total_seconds() < 0:
            # Après le départ: pas de remboursement
            return reservation.montant_total
        elif time_until_departure.days < 1:
            # Moins de 24h: 80% de frais
            return reservation.montant_total * 0.8
        elif time_until_departure.days < 3:
            # Moins de 3 jours: 50% de frais
            return reservation.montant_total * 0.5
        elif time_until_departure.days < 7:
            # Moins de 7 jours: 25% de frais
            return reservation.montant_total * 0.25
        else:
            # Plus de 7 jours: pas de frais
            return 0.0


reservation_service = ReservationService()
