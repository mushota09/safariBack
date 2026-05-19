"""Endpoints CRUD pour les bateaux et leur structure interne.

- `GET /bateaux` : liste publique (filtrée par compagnie pour admin)
- `POST /bateaux` : création (admin)
- `GET /bateaux/{id}` : détail
- `PUT /bateaux/{id}` : mise à jour
- `DELETE /bateaux/{id}` : suppression
- `GET /bateaux/{id}/structure` : niveaux/chambres/lits
- `PUT /bateaux/{id}/structure` : sauvegarde complète (UPSERT/DELETE)
"""
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_admin_user, get_current_superuser
from app.models.utilisateur import Utilisateur
from app.modules.bateau.schemas import (
    BateauCreate,
    BateauResponse,
    BateauUpdate,
    StructurePayload,
    StructureResponse,
)
from app.modules.bateau.service import bateau_service

router = APIRouter(prefix="/bateaux", tags=["Bateaux"])


def _tenant_filter(user: Utilisateur) -> Optional[int]:
    """Retourne le `compagnie_id` à filtrer pour l'utilisateur courant.

    - Un super_admin (`is_superuser`) voit tous les bateaux.
    - Un admin_compagnie ne voit que ceux de sa compagnie.
    """
    if user.is_superuser:
        return None
    return user.compagnie_id


@router.get("", response_model=List[BateauResponse])
async def list_bateaux(
    db: Annotated[AsyncSession, Depends(get_db)],
    compagnie_id: Optional[int] = Query(None),
):
    """Liste publique : tous les bateaux (utilisée par le programme client)."""
    return await bateau_service.list_all(db, compagnie_id=compagnie_id)


@router.get("/{bateau_id}", response_model=BateauResponse)
async def get_bateau(
    bateau_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await bateau_service.get(db, bateau_id)


@router.post("", response_model=BateauResponse, status_code=status.HTTP_201_CREATED)
async def create_bateau(
    payload: BateauCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Utilisateur, Depends(get_admin_user)],
):
    """Création d'un bateau (admin compagnie ou super admin).

    Si l'utilisateur est admin_compagnie, le bateau est automatiquement
    rattaché à sa compagnie même si `compagnie_id` n'est pas dans le payload.
    """
    return await bateau_service.create(
        db,
        payload,
        compagnie_id_fallback=_tenant_filter(current_user),
    )


@router.put("/{bateau_id}", response_model=BateauResponse)
async def update_bateau(
    bateau_id: int,
    payload: BateauUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Utilisateur, Depends(get_admin_user)],
):
    return await bateau_service.update(
        db, bateau_id, payload, compagnie_id=_tenant_filter(current_user)
    )


@router.delete("/{bateau_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bateau(
    bateau_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Utilisateur, Depends(get_admin_user)],
):
    await bateau_service.delete(db, bateau_id, compagnie_id=_tenant_filter(current_user))
    return None


# ---------- Structure ----------

@router.get("/{bateau_id}/structure", response_model=StructureResponse)
async def get_structure(
    bateau_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Public : utilisé côté client pour afficher la structure du bateau."""
    return await bateau_service.get_structure(db, bateau_id)


@router.put("/{bateau_id}/structure", response_model=StructureResponse)
async def save_structure(
    bateau_id: int,
    payload: StructurePayload,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Utilisateur, Depends(get_admin_user)],
):
    """Sauvegarde la structure complète : UPSERT + DELETE des entités absentes."""
    return await bateau_service.save_structure(
        db, bateau_id, payload, compagnie_id=_tenant_filter(current_user)
    )
