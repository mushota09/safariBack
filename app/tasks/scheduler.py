import asyncio
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker
from app.models.reservation import Reservation, StatutReservation
from app.models.voyage import ProgrammeVoyage, StatutVoyage
from app.models.journal import Journal
from app.redis_client import redis_client
from app.websocket_manager import websocket_manager

scheduler = AsyncIOScheduler()


async def expire_unpaid_reservations():
    """Expire les réservations non payées"""
    print(f"[{datetime.utcnow()}] Running task: expire_unpaid_reservations")

    async with async_session_maker() as db:
        try:
            # Trouver les réservations expirées
            now = datetime.utcnow()
            result = await db.execute(
                select(Reservation).where(
                    Reservation.statut_reservation == StatutReservation.en_attente,
                    Reservation.date_expiration_paiement < now
                )
            )
            expired_reservations = result.scalars().all()

            for reservation in expired_reservations:
                # Récupérer le voyage
                result_voyage = await db.execute(
                    select(ProgrammeVoyage).where(
                        ProgrammeVoyage.id == reservation.voyage_id
                    )
                )
                voyage = result_voyage.scalar_one()

                # Libérer les places
                voyage.places_vendues_passagers -= reservation.nombre_passagers
                if reservation.vehicule_inclus:
                    voyage.places_vendues_vehicules -= 1

                # Annuler la réservation
                reservation.statut_reservation = StatutReservation.annule
                reservation.date_annulation = now
                reservation.raison_annulation = "Expiration du délai de paiement"

                # Broadcast la mise à jour
                await websocket_manager.publish_update(
                    voyage.id,
                    voyage.get_disponibilite()
                )

            await db.commit()

            # Invalider le cache
            if expired_reservations:
                await redis_client.delete_pattern("traversees:*")

            print(f"✅ Expired {len(expired_reservations)} reservations")

        except Exception as e:
            print(f"❌ Error in expire_unpaid_reservations: {e}")
            await db.rollback()


async def update_voyage_status():
    """Met à jour le statut des voyages terminés"""
    print(f"[{datetime.utcnow()}] Running task: update_voyage_status")

    async with async_session_maker() as db:
        try:
            now = datetime.utcnow()

            # Trouver les voyages terminés
            result = await db.execute(
                select(ProgrammeVoyage).where(
                    ProgrammeVoyage.statut.in_([
                        StatutVoyage.programme,
                        StatutVoyage.confirme
                    ]),
                    ProgrammeVoyage.date_arrivee_programmee < now
                )
            )
            completed_voyages = result.scalars().all()

            for voyage in completed_voyages:
                voyage.statut = StatutVoyage.termine

                # Mettre à jour les réservations associées
                result_reservations = await db.execute(
                    select(Reservation).where(
                        Reservation.voyage_id == voyage.id,
                        Reservation.statut_reservation == StatutReservation.confirme
                    )
                )
                reservations = result_reservations.scalars().all()

                for reservation in reservations:
                    reservation.statut_reservation = StatutReservation.termine

            await db.commit()

            # Invalider le cache
            if completed_voyages:
                await redis_client.delete_pattern("traversees:*")

            print(f"✅ Updated {len(completed_voyages)} voyages to completed")

        except Exception as e:
            print(f"❌ Error in update_voyage_status: {e}")
            await db.rollback()


async def cleanup_old_logs():
    """Nettoie les logs vieux de plus de 30 jours"""
    print(f"[{datetime.utcnow()}] Running task: cleanup_old_logs")

    async with async_session_maker() as db:
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=30)

            result = await db.execute(
                delete(Journal).where(Journal.date_creation < cutoff_date)
            )

            await db.commit()

            print(f"✅ Deleted {result.rowcount} old log entries")

        except Exception as e:
            print(f"❌ Error in cleanup_old_logs: {e}")
            await db.rollback()


def start_scheduler():
    """Démarre le scheduler avec toutes les tâches"""
    # Expiration des réservations: toutes les minutes
    scheduler.add_job(
        expire_unpaid_reservations,
        trigger=IntervalTrigger(minutes=1),
        id="expire_unpaid_reservations",
        name="Expire unpaid reservations",
        replace_existing=True
    )

    # Mise à jour des statuts de voyage: toutes les 10 minutes
    scheduler.add_job(
        update_voyage_status,
        trigger=IntervalTrigger(minutes=10),
        id="update_voyage_status",
        name="Update voyage status",
        replace_existing=True
    )

    # Nettoyage des logs: tous les jours à 3h du matin
    scheduler.add_job(
        cleanup_old_logs,
        trigger="cron",
        hour=3,
        minute=0,
        id="cleanup_old_logs",
        name="Cleanup old logs",
        replace_existing=True
    )

    scheduler.start()


def stop_scheduler():
    """Arrête le scheduler"""
    if scheduler.running:
        scheduler.shutdown()
