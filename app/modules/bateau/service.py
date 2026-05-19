"""Service de gestion des bateaux + structure interne (niveaux/chambres/lits).

Toutes les opérations vérifient l'isolation tenant (`compagnie_id`).
La sauvegarde de la structure est idempotente : on aligne l'état persistant
sur le payload reçu (UPSERT + DELETE des entités absentes).
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.compagnie import Bateau, Niveau, Chambre, Lit, CompagnieBateau
from app.modules.bateau.schemas import (
    BateauCreate,
    BateauUpdate,
    StructurePayload,
)


class BateauService:
    # ---------- CRUD ----------

    async def _get_or_404(self, db: AsyncSession, bateau_id: int, compagnie_id: Optional[int] = None) -> Bateau:
        query = select(Bateau).where(Bateau.id == bateau_id)
        if compagnie_id is not None:
            query = query.where(Bateau.compagnie_id == compagnie_id)
        result = await db.execute(query)
        bateau = result.scalar_one_or_none()
        if not bateau:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bateau not found")
        return bateau

    async def list_all(self, db: AsyncSession, compagnie_id: Optional[int] = None) -> List[Bateau]:
        query = select(Bateau).order_by(Bateau.nom.asc())
        if compagnie_id is not None:
            query = query.where(Bateau.compagnie_id == compagnie_id)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get(self, db: AsyncSession, bateau_id: int, compagnie_id: Optional[int] = None) -> Bateau:
        return await self._get_or_404(db, bateau_id, compagnie_id)

    async def create(self, db: AsyncSession, payload: BateauCreate, compagnie_id_fallback: Optional[int] = None) -> Bateau:
        compagnie_id = payload.compagnie_id or compagnie_id_fallback
        if compagnie_id is None:
            # Première compagnie disponible (utile en mode super_admin sans tenant)
            result = await db.execute(select(CompagnieBateau).limit(1))
            compagnie = result.scalar_one_or_none()
            if compagnie is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No compagnie available to attach the bateau to",
                )
            compagnie_id = compagnie.id

        # Unicité immatriculation
        existing = await db.execute(
            select(Bateau).where(Bateau.immatriculation == payload.immatriculation)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Immatriculation already used",
            )

        data = payload.model_dump(exclude={"compagnie_id"})
        bateau = Bateau(compagnie_id=compagnie_id, **data)
        db.add(bateau)
        await db.commit()
        await db.refresh(bateau)
        return bateau

    async def update(
        self,
        db: AsyncSession,
        bateau_id: int,
        payload: BateauUpdate,
        compagnie_id: Optional[int] = None,
    ) -> Bateau:
        bateau = await self._get_or_404(db, bateau_id, compagnie_id)
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(bateau, field, value)
        await db.commit()
        await db.refresh(bateau)
        return bateau

    async def delete(self, db: AsyncSession, bateau_id: int, compagnie_id: Optional[int] = None) -> None:
        bateau = await self._get_or_404(db, bateau_id, compagnie_id)
        await db.delete(bateau)
        await db.commit()

    # ---------- Structure (niveaux/chambres/lits) ----------

    async def get_structure(self, db: AsyncSession, bateau_id: int, compagnie_id: Optional[int] = None) -> dict:
        await self._get_or_404(db, bateau_id, compagnie_id)
        query = (
            select(Bateau)
            .where(Bateau.id == bateau_id)
            .options(
                selectinload(Bateau.niveaux)
                .selectinload(Niveau.chambres)
                .selectinload(Chambre.lits)
            )
        )
        result = await db.execute(query)
        bateau = result.scalar_one()

        return {
            "bateau_id": bateau.id,
            "bateau_nom": bateau.nom,
            "niveaux": [
                {
                    "id": n.id,
                    "bateau_id": n.bateau_id,
                    "numero_niveau": n.numero_niveau,
                    "nom": n.nom,
                    "multiplicateur_prix": n.multiplicateur_prix,
                    "description": n.description,
                    "chambres": [
                        {
                            "id": c.id,
                            "niveau_id": c.niveau_id,
                            "numero_chambre": c.numero_chambre,
                            "prix_base": c.prix_base,
                            "type_chambre": c.type_chambre,
                            "fenetre": c.fenetre,
                            "salle_de_bain": c.salle_de_bain,
                            "lits": [
                                {
                                    "id": l.id,
                                    "chambre_id": l.chambre_id,
                                    "numero_lit": l.numero_lit,
                                    "type_lit": l.type_lit,
                                    "taille": l.taille,
                                    "prix_supplementaire": l.prix_supplementaire,
                                    "disponible": l.disponible,
                                }
                                for l in c.lits
                            ],
                        }
                        for c in n.chambres
                    ],
                }
                for n in bateau.niveaux
            ],
        }

    async def save_structure(
        self,
        db: AsyncSession,
        bateau_id: int,
        payload: StructurePayload,
        compagnie_id: Optional[int] = None,
    ) -> dict:
        """Met à jour intégralement la structure (UPSERT/DELETE) à partir du payload.

        Stratégie : on charge l'état actuel, on identifie les entités à conserver
        (par `id`) et celles à supprimer. Pour les nouvelles entités (sans `id`),
        on insère. Tout est wrappé dans une transaction.
        """
        bateau = await self._get_or_404(db, bateau_id, compagnie_id)

        # Charger la structure courante
        query = (
            select(Bateau)
            .where(Bateau.id == bateau_id)
            .options(
                selectinload(Bateau.niveaux)
                .selectinload(Niveau.chambres)
                .selectinload(Chambre.lits)
            )
        )
        current = (await db.execute(query)).scalar_one()

        # Index pour UPSERT
        current_niveaux = {n.id: n for n in current.niveaux}
        sent_niveau_ids = {n.id for n in payload.niveaux if n.id is not None}

        # 1. Supprimer les niveaux absents du payload
        for n_id, n in list(current_niveaux.items()):
            if n_id not in sent_niveau_ids:
                await db.delete(n)

        # 2. UPSERT niveaux
        for n_payload in payload.niveaux:
            if n_payload.id and n_payload.id in current_niveaux:
                niveau = current_niveaux[n_payload.id]
                niveau.numero_niveau = n_payload.numero_niveau
                niveau.nom = n_payload.nom
                niveau.multiplicateur_prix = n_payload.multiplicateur_prix
                niveau.description = n_payload.description
            else:
                niveau = Niveau(
                    bateau_id=bateau.id,
                    numero_niveau=n_payload.numero_niveau,
                    nom=n_payload.nom,
                    multiplicateur_prix=n_payload.multiplicateur_prix,
                    description=n_payload.description,
                )
                db.add(niveau)
                await db.flush()

            current_chambres = {c.id: c for c in niveau.chambres} if niveau.id else {}
            sent_chambre_ids = {c.id for c in n_payload.chambres if c.id is not None}

            # Supprimer les chambres absentes
            for c_id, c in list(current_chambres.items()):
                if c_id not in sent_chambre_ids:
                    await db.delete(c)

            # UPSERT chambres
            for c_payload in n_payload.chambres:
                if c_payload.id and c_payload.id in current_chambres:
                    chambre = current_chambres[c_payload.id]
                    chambre.numero_chambre = c_payload.numero_chambre
                    chambre.prix_base = c_payload.prix_base
                    chambre.type_chambre = c_payload.type_chambre
                    chambre.fenetre = c_payload.fenetre
                    chambre.salle_de_bain = c_payload.salle_de_bain
                else:
                    chambre = Chambre(
                        niveau_id=niveau.id,
                        numero_chambre=c_payload.numero_chambre,
                        prix_base=c_payload.prix_base,
                        type_chambre=c_payload.type_chambre,
                        fenetre=c_payload.fenetre,
                        salle_de_bain=c_payload.salle_de_bain,
                    )
                    db.add(chambre)
                    await db.flush()

                current_lits = {l.id: l for l in chambre.lits} if chambre.id else {}
                sent_lit_ids = {l.id for l in c_payload.lits if l.id is not None}

                for l_id, l in list(current_lits.items()):
                    if l_id not in sent_lit_ids:
                        await db.delete(l)

                for l_payload in c_payload.lits:
                    if l_payload.id and l_payload.id in current_lits:
                        lit = current_lits[l_payload.id]
                        lit.numero_lit = l_payload.numero_lit
                        lit.type_lit = l_payload.type_lit
                        lit.taille = l_payload.taille
                        lit.prix_supplementaire = l_payload.prix_supplementaire
                        lit.disponible = l_payload.disponible
                    else:
                        lit = Lit(
                            chambre_id=chambre.id,
                            numero_lit=l_payload.numero_lit,
                            type_lit=l_payload.type_lit,
                            taille=l_payload.taille,
                            prix_supplementaire=l_payload.prix_supplementaire,
                            disponible=l_payload.disponible,
                        )
                        db.add(lit)

        await db.commit()
        return await self.get_structure(db, bateau_id, compagnie_id)


bateau_service = BateauService()
