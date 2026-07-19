"""Planificateur de tâches périodiques.

Lance les tâches de fond : expiration des réservations, nettoyage, etc.
Utilisé via le cycle de vie FastAPI (lifespan) dans main.py.
"""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


def start_scheduler():
    """Démarre le planificateur."""
    if scheduler.running:
        return
    scheduler.start()
    logger.info("Scheduler started")


def stop_scheduler():
    """Arrête le planificateur proprement."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
