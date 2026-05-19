import json
import hashlib
from typing import List, AsyncGenerator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.voyage import ProgrammeVoyage, StatutVoyage
from app.modules.traversee.schemas import TraverseeSearchParams, TraverseeResponse
from app.redis_client import redis_client


class TraverseeService:
    async def get_traversee_by_id(
        self,
        db: AsyncSession,
        traversee_id: int
    ) -> TraverseeResponse:
        """Récupère une traversée par son ID"""
        from fastapi import HTTPException, status

        query = select(ProgrammeVoyage).where(
            ProgrammeVoyage.id == traversee_id
        ).options(
            selectinload(ProgrammeVoyage.port_depart),
            selectinload(ProgrammeVoyage.port_arrivee),
            selectinload(ProgrammeVoyage.bateau),
            selectinload(ProgrammeVoyage.compagnie)
        )

        result = await db.execute(query)
        voyage = result.scalar_one_or_none()

        if not voyage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Traversée {traversee_id} non trouvée"
            )

        return self._voyage_to_response(voyage)

    async def search_traversees(
        self,
        db: AsyncSession,
        search_params: TraverseeSearchParams
    ) -> List[TraverseeResponse]:
        """Recherche des traversées avec cache Redis"""
        # Générer une clé de cache basée sur les paramètres
        cache_key = self._generate_cache_key(search_params)

        # Vérifier le cache
        cached_result = await redis_client.get(cache_key)
        if cached_result:
            return [TraverseeResponse(**item) for item in cached_result]

        # Construire la requête
        query = self._build_search_query(search_params)

        # Exécuter la requête
        result = await db.execute(query)
        voyages = result.scalars().all()

        # Filtrer les voyages avec places disponibles
        voyages_disponibles = [
            v for v in voyages
            if (v.places_disponibles_passagers - v.places_vendues_passagers >= search_params.passagers)
            and (not search_params.vehicule or
                 (v.places_disponibles_vehicules - v.places_vendues_vehicules > 0))
        ]

        # Convertir en réponse
        response_data = [self._voyage_to_response(v) for v in voyages_disponibles]

        # Mettre en cache
        await redis_client.set(cache_key, [r.model_dump() for r in response_data], ttl=60)

        return response_data

    async def stream_traversees(
        self,
        db: AsyncSession,
        search_params: TraverseeSearchParams
    ) -> AsyncGenerator[str, None]:
        """Stream les résultats de recherche de traversées"""
        query = self._build_search_query(search_params)

        # Utiliser stream() pour récupérer les résultats progressivement
        stream = await db.stream(query)

        async for (voyage,) in stream:
            # Vérifier la disponibilité
            places_dispo_passagers = voyage.places_disponibles_passagers - voyage.places_vendues_passagers
            places_dispo_vehicules = voyage.places_disponibles_vehicules - voyage.places_vendues_vehicules

            if places_dispo_passagers >= search_params.passagers:
                if not search_params.vehicule or places_dispo_vehicules > 0:
                    response = self._voyage_to_response(voyage)
                    yield json.dumps(response.model_dump(), default=str) + "\n"

    def _build_search_query(self, search_params: TraverseeSearchParams):
        """Construit la requête de recherche"""
        query = select(ProgrammeVoyage).where(
            ProgrammeVoyage.statut.in_([
                StatutVoyage.programme,
                StatutVoyage.confirme
            ])
        )

        # Filtres
        if search_params.port_depart:
            query = query.where(ProgrammeVoyage.port_depart_id == search_params.port_depart)

        if search_params.port_arrivee:
            query = query.where(ProgrammeVoyage.port_arrivee_id == search_params.port_arrivee)

        if search_params.date_min:
            query = query.where(ProgrammeVoyage.date_depart_programme >= search_params.date_min)

        if search_params.date_max:
            query = query.where(ProgrammeVoyage.date_depart_programme <= search_params.date_max)

        # Charger les relations
        query = query.options(
            selectinload(ProgrammeVoyage.port_depart),
            selectinload(ProgrammeVoyage.port_arrivee),
            selectinload(ProgrammeVoyage.bateau),
            selectinload(ProgrammeVoyage.compagnie)
        )

        # Pagination
        skip = (search_params.page - 1) * search_params.page_size
        query = query.offset(skip).limit(search_params.page_size)

        return query

    def _voyage_to_response(self, voyage: ProgrammeVoyage) -> TraverseeResponse:
        """Convertit un ProgrammeVoyage en TraverseeResponse"""
        bateau = voyage.bateau
        compagnie = voyage.compagnie
        return TraverseeResponse(
            id=voyage.id,
            port_depart={
                "id": voyage.port_depart.id,
                "nom": voyage.port_depart.nom,
                "code_international": voyage.port_depart.code_international,
            },
            port_arrivee={
                "id": voyage.port_arrivee.id,
                "nom": voyage.port_arrivee.nom,
                "code_international": voyage.port_arrivee.code_international,
            },
            bateau={
                "id": bateau.id,
                "nom": bateau.nom,
                "capacite_passagers": bateau.capacite_passagers,
                "capacite_vehicules": bateau.capacite_vehicules,
                "immatriculation": bateau.immatriculation,
                "vitesse_croisiere": bateau.vitesse_croisiere,
                "longueur": bateau.longueur,
                "tirant_eau": bateau.tirant_eau,
                "puissance_moteur": bateau.puissance_moteur,
                "clim": bateau.clim,
                "wifi": bateau.wifi,
                "restaurant": bateau.restaurant,
                "boutique": bateau.boutique,
                "cabines": bateau.cabines,
                "en_maintenance": bateau.en_maintenance,
                "date_derniere_revision": bateau.date_derniere_revision,
                "date_prochaine_revision": bateau.date_prochaine_revision,
                "photo_principale": bateau.photo_principale,
            },
            compagnie={
                "id": compagnie.id,
                "nom": compagnie.nom,
                "telephone": compagnie.telephone,
                "email": compagnie.email,
                "site_web": compagnie.site_web,
                "logo": compagnie.logo,
                "politique_annulation": compagnie.politique_annulation,
            },
            date_depart_programme=voyage.date_depart_programme,
            date_arrivee_programmee=voyage.date_arrivee_programmee,
            prix_base=voyage.prix_base,
            prix_promotionnel=voyage.prix_promotionnel,
            statut=voyage.statut.value,
            places_disponibles_passagers=voyage.places_disponibles_passagers - voyage.places_vendues_passagers,
            places_disponibles_vehicules=voyage.places_disponibles_vehicules - voyage.places_vendues_vehicules,
            places_totales_passagers=voyage.places_disponibles_passagers,
            places_totales_vehicules=voyage.places_disponibles_vehicules,
            places_vendues_passagers=voyage.places_vendues_passagers,
            places_vendues_vehicules=voyage.places_vendues_vehicules,
            capitaine_nom=voyage.capitaine_nom,
            equipage_nombre=voyage.equipage_nombre,
            remarques=voyage.remarques,
            retard_motif=voyage.retard_motif,
        )

    def _generate_cache_key(self, search_params: TraverseeSearchParams) -> str:
        """Génère une clé de cache unique basée sur les paramètres"""
        params_str = json.dumps(search_params.model_dump(), sort_keys=True, default=str)
        hash_obj = hashlib.md5(params_str.encode())
        return f"traversees:{hash_obj.hexdigest()}"


traversee_service = TraverseeService()
