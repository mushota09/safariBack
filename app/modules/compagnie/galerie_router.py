"""Routeur dédié à la galerie d'images d'un bateau.

La table ``image_bateau`` stocke la collection d'images affichées sur la page
détail d'un bateau. Le champ ``photo_principale`` du bateau reste l'image
utilisée pour les listings (cards, recherche).
"""
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_superuser
from app.models.compagnie import Bateau
from app.models.image_bateau import ImageBateau
from app.models.utilisateur import Utilisateur
from app.modules.compagnie.schemas import (
    BateauGalerieResponse,
    ImageBateauCreate,
    ImageBateauResponse,
    ImageBateauUpdate,
)
from app.services.file_storage import file_storage

router = APIRouter(prefix="/bateaux/{bateau_id}/images", tags=["Galerie Bateau"])


async def _get_bateau_or_404(db: AsyncSession, bateau_id: int) -> Bateau:
    result = await db.execute(select(Bateau).where(Bateau.id == bateau_id))
    bateau = result.scalar_one_or_none()
    if not bateau:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bateau not found")
    return bateau


@router.get("", response_model=BateauGalerieResponse)
async def list_images(
    bateau_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Liste les images d'un bateau (publique, utilisée par la page détail)."""
    query = (
        select(Bateau)
        .where(Bateau.id == bateau_id)
        .options(selectinload(Bateau.images))
    )
    result = await db.execute(query)
    bateau = result.scalar_one_or_none()
    if not bateau:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bateau not found")

    return BateauGalerieResponse(
        bateau_id=bateau.id,
        bateau_nom=bateau.nom,
        photo_principale=bateau.photo_principale,
        images=[ImageBateauResponse.model_validate(img) for img in bateau.images],
    )


@router.post("/upload", response_model=ImageBateauResponse, status_code=status.HTTP_201_CREATED)
async def upload_image(
    bateau_id: int,
    file: UploadFile = File(...),
    legende: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    est_principale: bool = Form(False),
    ordre: int = Form(0),
    db: Annotated[AsyncSession, Depends(get_db)] = None,
    _: Annotated[Utilisateur, Depends(get_current_superuser)] = None,
):
    """Upload une image pour un bateau (admin)."""
    bateau = await _get_bateau_or_404(db, bateau_id)

    # Sauvegarder le fichier et obtenir l'URL
    url = await file_storage.save_boat_image(file, bateau_id, est_principale)

    if est_principale:
        # Désactiver toute autre image marquée comme principale
        result = await db.execute(
            select(ImageBateau).where(
                ImageBateau.bateau_id == bateau_id,
                ImageBateau.est_principale.is_(True)
            )
        )
        for existing in result.scalars().all():
            existing.est_principale = False

    # Créer l'entrée dans la base de données
    image = ImageBateau(
        bateau_id=bateau.id,
        url=url,
        legende=legende,
        description=description,
        est_principale=est_principale,
        ordre=ordre
    )
    db.add(image)
    await db.commit()
    await db.refresh(image)

    # Synchroniser la photo_principale du bateau si nécessaire
    if est_principale:
        bateau.photo_principale = url
        await db.commit()

    return image


@router.post("", response_model=ImageBateauResponse, status_code=status.HTTP_201_CREATED)
async def add_image(
    bateau_id: int,
    image_data: ImageBateauCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Utilisateur, Depends(get_current_superuser)],
):
    """Ajoute une image à la galerie d'un bateau (admin)."""
    bateau = await _get_bateau_or_404(db, bateau_id)

    if image_data.est_principale:
        # Désactiver toute autre image marquée comme principale dans la galerie.
        await db.execute(
            select(ImageBateau).where(ImageBateau.bateau_id == bateau_id, ImageBateau.est_principale.is_(True))
        )
        for existing in (await db.execute(
            select(ImageBateau).where(ImageBateau.bateau_id == bateau_id, ImageBateau.est_principale.is_(True))
        )).scalars().all():
            existing.est_principale = False

    image = ImageBateau(bateau_id=bateau.id, **image_data.model_dump())
    db.add(image)
    await db.commit()
    await db.refresh(image)

    # Synchroniser la photo_principale du bateau si nécessaire.
    if image.est_principale:
        bateau.photo_principale = image.url
        await db.commit()

    return image


@router.put("/{image_id}", response_model=ImageBateauResponse)
async def update_image(
    bateau_id: int,
    image_id: int,
    image_data: ImageBateauUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Utilisateur, Depends(get_current_superuser)],
):
    """Met à jour une image (admin)."""
    result = await db.execute(
        select(ImageBateau).where(ImageBateau.id == image_id, ImageBateau.bateau_id == bateau_id)
    )
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    update_dict = image_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(image, field, value)

    await db.commit()
    await db.refresh(image)
    return image


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(
    bateau_id: int,
    image_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Utilisateur, Depends(get_current_superuser)],
):
    """Supprime une image (admin)."""
    result = await db.execute(
        select(ImageBateau).where(ImageBateau.id == image_id, ImageBateau.bateau_id == bateau_id)
    )
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    await db.delete(image)
    await db.commit()
    return None
