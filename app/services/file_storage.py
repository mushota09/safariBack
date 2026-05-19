"""Service de gestion du stockage de fichiers."""
import os
import uuid
from pathlib import Path
from typing import Optional
from fastapi import UploadFile, HTTPException

from app.config import settings


class FileStorageService:
    """Service pour gérer le stockage des fichiers uploadés."""

    def __init__(self):
        self.base_path = Path(settings.UPLOAD_DIR)
        self.base_path.mkdir(parents=True, exist_ok=True)

    async def save_boat_image(
        self,
        file: UploadFile,
        boat_id: int,
        is_main: bool = False
    ) -> str:
        """
        Sauvegarde une image de bateau et retourne l'URL relative.

        Args:
            file: Le fichier uploadé
            boat_id: ID du bateau
            is_main: Si c'est la photo principale

        Returns:
            URL relative du fichier sauvegardé
        """
        # Validation du type de fichier
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="Le fichier doit être une image (JPEG, PNG, WEBP, etc.)"
            )

        # Validation de la taille (5MB max)
        content = await file.read()
        if len(content) > 5 * 1024 * 1024:  # 5MB
            raise HTTPException(
                status_code=400,
                detail="La taille du fichier ne doit pas dépasser 5MB"
            )

        # Créer le dossier pour ce bateau
        boat_folder = self.base_path / "boats" / str(boat_id)
        boat_folder.mkdir(parents=True, exist_ok=True)

        # Générer un nom de fichier unique
        file_extension = Path(file.filename or "image.jpg").suffix.lower()
        if not file_extension:
            file_extension = ".jpg"

        # Nettoyer l'extension
        allowed_extensions = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
        if file_extension not in allowed_extensions:
            file_extension = '.jpg'

        filename = f"{'main_' if is_main else ''}{uuid.uuid4()}{file_extension}"
        file_path = boat_folder / filename

        # Sauvegarder le fichier
        with open(file_path, "wb") as f:
            f.write(content)

        # Retourner l'URL relative
        return f"/uploads/boats/{boat_id}/{filename}"

    def delete_file(self, url: str) -> bool:
        """
        Supprime un fichier à partir de son URL.

        Args:
            url: URL relative du fichier

        Returns:
            True si supprimé, False sinon
        """
        try:
            # Extraire le chemin relatif
            if url.startswith('/uploads/'):
                url = url[9:]  # Enlever '/uploads/'

            file_path = self.base_path / url
            if file_path.exists() and file_path.is_file():
                file_path.unlink()
                return True
        except Exception as e:
            print(f"Error deleting file {url}: {e}")
        return False


# Instance globale
file_storage = FileStorageService()
