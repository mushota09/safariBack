"""Cache Redis pour les disponibilités d'un voyage.

Soulage PostgreSQL en cas de forte affluence (page d'accueil + recherche). La
clé est ``voyage:disponibilite:{voyage_id}`` et le TTL court (10s par défaut)
limite l'écart avec la vérité PostgreSQL — l'invalidation est par ailleurs
poussée à chaque réservation/annulation/paiement réussi.
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.voyage import ProgrammeVoyage
from app.redis_client import redis_client


import random

CACHE_KEY_FMT = "voyage:disponibilite:{voyage_id}"
DEFAULT_TTL = 10  # secondes (jitter aléatoire ajouté au moment du set)


async def get_voyage_availability(
    db: AsyncSession,
    voyage_id: int,
    *,
    ttl: int = DEFAULT_TTL,
) -> Optional[Dict[str, Any]]:
    """Retourne la dispo d'un voyage, depuis Redis si possible, sinon DB."""
    key = CACHE_KEY_FMT.format(voyage_id=voyage_id)
    cached = await redis_client.get(key)
    if cached is not None:
        return cached

    result = await db.execute(
        select(ProgrammeVoyage).where(ProgrammeVoyage.id == voyage_id)
    )
    voyage = result.scalar_one_or_none()
    if not voyage:
        return None

    data = voyage.get_disponibilite()
    # Ajouter un jitter aléatoire (±20%) pour éviter le cache stampede
    jitter = random.uniform(-0.2, 0.2)
    effective_ttl = max(1, int(ttl * (1 + jitter)))
    await redis_client.set(key, data, ttl=effective_ttl)
    return data


async def invalidate_voyage_availability(voyage_id: int) -> None:
    await redis_client.delete(CACHE_KEY_FMT.format(voyage_id=voyage_id))
