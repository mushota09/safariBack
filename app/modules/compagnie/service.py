from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.compagnie import CompagnieBateau
from app.modules.compagnie.schemas import CompagnieBateauCreate, CompagnieBateauUpdate
from app.utils.expand import apply_expand


class CompagnieService:
    async def get_all(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
        expand: List[str] = None
    ) -> List[CompagnieBateau]:
        """Récupère toutes les compagnies"""
        query = select(CompagnieBateau)

        if expand:
            query = apply_expand(query, CompagnieBateau, expand)

        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return result.scalars().all()

    async def get_by_id(
        self,
        db: AsyncSession,
        compagnie_id: int,
        expand: List[str] = None
    ) -> Optional[CompagnieBateau]:
        """Récupère une compagnie par son ID"""
        query = select(CompagnieBateau).where(CompagnieBateau.id == compagnie_id)

        if expand:
            query = apply_expand(query, CompagnieBateau, expand)

        result = await db.execute(query)
        compagnie = result.scalar_one_or_none()

        if not compagnie:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Compagnie not found"
            )

        return compagnie

    async def create(
        self,
        db: AsyncSession,
        compagnie_data: CompagnieBateauCreate
    ) -> CompagnieBateau:
        """Crée une nouvelle compagnie"""
        # Vérifier si le numéro de licence existe déjà
        result = await db.execute(
            select(CompagnieBateau).where(
                CompagnieBateau.numero_licence == compagnie_data.numero_licence
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="License number already exists"
            )

        compagnie = CompagnieBateau(**compagnie_data.model_dump())
        db.add(compagnie)
        await db.commit()
        await db.refresh(compagnie)

        return compagnie

    async def update(
        self,
        db: AsyncSession,
        compagnie_id: int,
        compagnie_data: CompagnieBateauUpdate
    ) -> CompagnieBateau:
        """Met à jour une compagnie"""
        compagnie = await self.get_by_id(db, compagnie_id)

        update_data = compagnie_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(compagnie, field, value)

        await db.commit()
        await db.refresh(compagnie)

        return compagnie

    async def delete(self, db: AsyncSession, compagnie_id: int) -> bool:
        """Supprime une compagnie"""
        compagnie = await self.get_by_id(db, compagnie_id)

        await db.delete(compagnie)
        await db.commit()

        return True


compagnie_service = CompagnieService()
