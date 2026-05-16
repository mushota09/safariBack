import uuid
from typing import Optional
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status, BackgroundTasks

from app.models.paiement import Paiement, StatutPaiement, ModePaiement
from app.models.reservation import Reservation, StatutReservation
from app.models.voyage import ProgrammeVoyage
from app.models.utilisateur import Utilisateur
from app.models.ticket import Ticket
from app.modules.paiement.schemas import PaiementCreate
from app.services.paiement_simulateur import paiement_simulateur
from app.services.qrcode import qrcode_service
from app.services.pdf_generator import pdf_generator
from app.services.email import email_service
from app.services.ticket_signing import (
    build_global_ticket,
    build_individual_ticket,
)
from app.models.passager import Passager, StatutPassager
from app.models.vehicule import VehiculeReservation
from app.redis_client import redis_client
from app.websocket_manager import websocket_manager


class PaiementService:
    async def process_payment(
        self,
        db: AsyncSession,
        user_id: int,
        paiement_data: PaiementCreate,
        background_tasks: BackgroundTasks
    ) -> Paiement:
        """Traite un paiement pour une réservation"""
        # Récupérer la réservation
        result = await db.execute(
            select(Reservation).where(
                Reservation.id == paiement_data.reservation_id,
                Reservation.utilisateur_id == user_id
            )
        )
        reservation = result.scalar_one_or_none()

        if not reservation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reservation not found"
            )

        # Vérifier le statut de la réservation
        if reservation.statut_reservation != StatutReservation.en_attente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Reservation is {reservation.statut_reservation.value}, cannot process payment"
            )

        # Vérifier l'expiration
        if reservation.date_expiration_paiement and datetime.utcnow() > reservation.date_expiration_paiement:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reservation has expired"
            )

        # Vérifier si un paiement existe déjà
        result_paiement = await db.execute(
            select(Paiement).where(Paiement.reservation_id == reservation.id)
        )
        existing_paiement = result_paiement.scalar_one_or_none()

        if existing_paiement:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment already exists for this reservation"
            )

        # Créer l'enregistrement de paiement
        reference_transaction = f"TXN-{uuid.uuid4().hex[:12].upper()}"

        paiement = Paiement(
            reservation_id=reservation.id,
            montant=reservation.montant_total,
            mode_paiement=paiement_data.mode_paiement,
            statut=StatutPaiement.en_cours,
            reference_transaction=reference_transaction,
            telephone_mobile=paiement_data.telephone_mobile,
            operateur_mobile=paiement_data.operateur_mobile,
            ip_client=paiement_data.ip_client,
            user_agent=paiement_data.user_agent
        )

        db.add(paiement)
        await db.commit()
        await db.refresh(paiement)

        # Traiter le paiement selon le mode
        payment_result = await self._process_payment_by_mode(paiement_data, reservation.montant_total)

        # Mettre à jour le paiement avec le résultat
        paiement.reference_transaction = payment_result["reference_transaction"]

        if payment_result["success"]:
            paiement.statut = StatutPaiement.reussi
            paiement.date_paiement = payment_result.get("date_paiement", datetime.utcnow())

            if "derniers_chiffres_carte" in payment_result:
                paiement.derniers_chiffres_carte = payment_result["derniers_chiffres_carte"]

            # Confirmer la réservation
            reservation.statut_reservation = StatutReservation.confirme

            # Générer le ticket
            await self._generate_ticket(db, reservation, background_tasks, user_id)

            # Récupérer le voyage pour broadcast
            result_voyage = await db.execute(
                select(ProgrammeVoyage).where(ProgrammeVoyage.id == reservation.voyage_id)
            )
            voyage = result_voyage.scalar_one()

            # Invalider les caches (recherche + disponibilité d'un voyage)
            await redis_client.delete_pattern("traversees:*")
            await redis_client.delete(f"voyage:disponibilite:{voyage.id}")

            # Broadcast la mise à jour de disponibilité
            await websocket_manager.publish_update(
                voyage.id,
                voyage.get_disponibilite(),
                event="availability",
            )
            # Broadcast d'un événement de réservation confirmée (pour le dashboard)
            await websocket_manager.publish_update(
                voyage.id,
                {
                    "reservation_id": reservation.id,
                    "reference": reservation.reference_reservation,
                    "montant_total": reservation.montant_total,
                    "nombre_passagers": reservation.nombre_passagers,
                    "vehicule_inclus": reservation.vehicule_inclus,
                },
                event="reservation",
            )
        else:
            paiement.statut = StatutPaiement.echoue
            paiement.message_erreur = payment_result.get("message", "Payment failed")

        await db.commit()
        await db.refresh(paiement)

        return paiement

    async def get_payment(
        self,
        db: AsyncSession,
        paiement_id: int,
        user_id: int
    ) -> Paiement:
        """Récupère un paiement par son ID"""
        query = select(Paiement).join(Reservation).where(
            Paiement.id == paiement_id,
            Reservation.utilisateur_id == user_id
        )

        result = await db.execute(query)
        paiement = result.scalar_one_or_none()

        if not paiement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )

        return paiement

    async def get_payment_by_reservation(
        self,
        db: AsyncSession,
        reservation_id: int,
        user_id: int
    ) -> Paiement:
        """Récupère le paiement d'une réservation"""
        query = select(Paiement).join(Reservation).where(
            Paiement.reservation_id == reservation_id,
            Reservation.utilisateur_id == user_id
        )

        result = await db.execute(query)
        paiement = result.scalar_one_or_none()

        if not paiement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found for this reservation"
            )

        return paiement

    async def _process_payment_by_mode(
        self,
        paiement_data: PaiementCreate,
        montant: float
    ) -> dict:
        """Traite le paiement selon le mode choisi"""
        if paiement_data.mode_paiement == ModePaiement.carte:
            return await paiement_simulateur.process_carte_payment(
                montant=montant,
                numero_carte=paiement_data.numero_carte,
                cvv=paiement_data.cvv,
                date_expiration=paiement_data.date_expiration
            )
        elif paiement_data.mode_paiement == ModePaiement.mobile_money:
            return await paiement_simulateur.process_mobile_money_payment(
                montant=montant,
                telephone=paiement_data.telephone_mobile,
                operateur=paiement_data.operateur_mobile
            )
        elif paiement_data.mode_paiement == ModePaiement.virement:
            return await paiement_simulateur.process_virement_payment(
                montant=montant,
                iban=paiement_data.iban
            )
        else:
            # Espèces à bord - toujours réussi
            return {
                "success": True,
                "reference_transaction": f"CASH-{uuid.uuid4().hex[:12].upper()}",
                "message": "Cash payment to be collected on board",
                "date_paiement": datetime.utcnow()
            }

    async def _generate_ticket(
        self,
        db: AsyncSession,
        reservation: Reservation,
        background_tasks: BackgroundTasks,
        user_id: int
    ):
        """Génère le ticket global signé et les tickets individuels passagers/véhicules."""
        # Ticket global signé
        numero, _payload, sig_hex, qr_string = build_global_ticket(
            reservation.id,
            reservation.reference_reservation,
        )

        ticket = Ticket(
            reservation_id=reservation.id,
            numero_ticket=numero,
            qr_code=qr_string,
            qr_payload=qr_string,
            qr_signature=sig_hex,
            pdf_genere=False,
            embarque=False,
        )

        db.add(ticket)

        # Tickets individuels par passager (s'il y en a)
        result = await db.execute(
            select(Passager).where(Passager.reservation_id == reservation.id)
        )
        passagers = result.scalars().all()
        for idx, passager in enumerate(passagers):
            p_num, _, p_sig, p_qr = build_individual_ticket(
                reservation.id,
                reservation.reference_reservation,
                idx,
                kind="passager",
            )
            passager.numero_ticket = p_num
            passager.qr_payload = p_qr
            passager.qr_signature = p_sig
            passager.statut = StatutPassager.confirme

        # Tickets individuels par véhicule
        result_v = await db.execute(
            select(VehiculeReservation).where(VehiculeReservation.reservation_id == reservation.id)
        )
        for idx, vehic in enumerate(result_v.scalars().all()):
            v_num, _, v_sig, v_qr = build_individual_ticket(
                reservation.id,
                reservation.reference_reservation,
                idx,
                kind="vehicule",
            )
            vehic.numero_ticket = v_num
            vehic.qr_payload = v_qr
            vehic.qr_signature = v_sig

        await db.commit()
        await db.refresh(ticket)

        # Générer l'image QR et le PDF en arrière-plan
        background_tasks.add_task(
            self._generate_ticket_files,
            db,
            ticket.id,
            reservation.id,
            user_id
        )

    async def _generate_ticket_files(
        self,
        db: AsyncSession,
        ticket_id: int,
        reservation_id: int,
        user_id: int
    ):
        """Génère les fichiers du ticket (QR code et PDF) et envoie l'email"""
        # Récupérer les données nécessaires
        result = await db.execute(
            select(Ticket).where(Ticket.id == ticket_id)
        )
        ticket = result.scalar_one()

        result = await db.execute(
            select(Reservation).where(Reservation.id == reservation_id)
        )
        reservation = result.scalar_one()

        result = await db.execute(
            select(Utilisateur).where(Utilisateur.id == user_id)
        )
        user = result.scalar_one()

        result = await db.execute(
            select(ProgrammeVoyage).where(ProgrammeVoyage.id == reservation.voyage_id)
        )
        voyage = result.scalar_one()

        # Générer l'image QR (le contenu signé est déjà stocké dans qr_payload)
        qr_path = await qrcode_service.generate_ticket_qr_code(
            ticket.numero_ticket,
            reservation.id,
            signed_payload=ticket.qr_payload,
        )

        # Préparer les données pour le PDF
        ticket_data = {
            "numero_ticket": ticket.numero_ticket,
            "reference_reservation": reservation.reference_reservation,
            "nom_passager": user.nom_complet or user.username,
            "email_passager": user.email,
            "port_depart": voyage.port_depart.nom,
            "port_arrivee": voyage.port_arrivee.nom,
            "date_depart": voyage.date_depart_programme.strftime("%d/%m/%Y %H:%M"),
            "date_arrivee": voyage.date_arrivee_programmee.strftime("%d/%m/%Y %H:%M"),
            "nom_bateau": voyage.bateau.nom,
            "nom_compagnie": voyage.compagnie.nom,
            "nombre_passagers": reservation.nombre_passagers,
            "vehicule_inclus": reservation.vehicule_inclus,
            "type_vehicule": reservation.type_vehicule.value if reservation.type_vehicule else None,
            "immatriculation_vehicule": reservation.immatriculation_vehicule,
            "montant_total": reservation.montant_total
        }

        # Générer le PDF
        pdf_path = await pdf_generator.generate_ticket_pdf(ticket_data, qr_path)
        ticket.pdf_genere = True

        await db.commit()

        # Lire le PDF
        pdf_content = await pdf_generator.read_pdf(pdf_path)

        # Envoyer l'email avec le PDF
        await email_service.send_reservation_confirmation(
            to_email=user.email,
            reservation_data=ticket_data,
            pdf_content=pdf_content
        )

        ticket.date_envoi_email = datetime.utcnow()
        await db.commit()


paiement_service = PaiementService()
