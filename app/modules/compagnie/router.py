from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_superuser
from app.models.utilisateur import Utilisateur
from app.modules.compagnie.schemas import (
    CompagnieBateauCreate,
    CompagnieBateauUpdate,
    CompagnieBateauResponse
)
from app.modules.compagnie.service import compagnie_service
from app.utils.expand import parse_expand
from app.utils.pagination import PaginationParams, paginate

router = APIRouter(prefix="/compagnies", tags=["Compagnies"])


@router.get("", response_model=List[CompagnieBateauResponse])
async def get_compagnies(
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    no_pagination: bool = Query(False),
    expand: Optional[str] = Query(None)
):
    """Récupère toutes les compagnies"""
    expand_list = parse_expand(expand)
    pagination = PaginationParams(page=page, page_size=page_size, no_pagination=no_pagination)

    compagnies = await compagnie_service.get_all(
        db,
        skip=pagination.skip,
        limit=pagination.limit,
        expand=expand_list
    )

    return compagnies


@router.get("/{compagnie_id}", response_model=CompagnieBateauResponse)
async def get_compagnie(
    compagnie_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    expand: Optional[str] = Query(None)
):
    """Récupère une compagnie par son ID"""
    expand_list = parse_expand(expand)
    return await compagnie_service.get_by_id(db, compagnie_id, expand=expand_list)


@router.post("", response_model=CompagnieBateauResponse)
async def create_compagnie(
    compagnie_data: CompagnieBateauCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Utilisateur, Depends(get_current_superuser)]
):
    """Crée une nouvelle compagnie (admin seulement)"""
    return await compagnie_service.create(db, compagnie_data)


@router.put("/{compagnie_id}", response_model=CompagnieBateauResponse)
async def update_compagnie(
    compagnie_id: int,
    compagnie_data: CompagnieBateauUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Utilisateur, Depends(get_current_superuser)]
):
    """Met à jour une compagnie (admin seulement)"""
    return await compagnie_service.update(db, compagnie_id, compagnie_data)


@router.delete("/{compagnie_id}")
async def delete_compagnie(
    compagnie_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[Utilisateur, Depends(get_current_superuser)]
):
    """Supprime une compagnie (admin seulement)"""
    await compagnie_service.delete(db, compagnie_id)
    return {"message": "Compagnie deleted successfully"}
