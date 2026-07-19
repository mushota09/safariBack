"""Service CRUD pour la gestion de l'équipage."""
from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status, UploadFile
import secrets
import shutil
from pathlib import Path

from app.models.equipage import (
    EquipageRole,
    Certification,
    MembreEquipage,
    EquipageCertification,
    StatutEquipage,
    SexeEquipage
)
from app.models.compagnie import Bateau
from app.config import settings


class EquipageService:
    """Service de gestion de l'équipage."""

    def _generer_numero_licence(self) -> str:
        """Génère un numéro de licence unique."""
        annee = datetime.utcnow().year
        code = secrets.token_hex(2).upper()
        return f"LIC-SF-{annee}-{code}"

    async def _sauvegarder_image(
        self,
        file: UploadFile,
        subfolder: str = "equipage"
    ) -> str:
        """
        Sauvegarde une image et retourne l'URL.

        Args:
            file: Fichier uploadé
            subfolder: Sous-dossier (equipage/profils, equipage/cartes)

        Returns:
            URL relative de l'image
        """
        # Créer le dossier si nécessaire
        upload_dir = Path(settings.UPLOAD_DIR) / subfolder
        upload_dir.mkdir(parents=True, exist_ok=True)

        # Générer un nom unique
        extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        filename = f"{secrets.token_hex(8)}.{extension}"
        file_path = upload_dir / filename

        # Sauvegarder le fichier
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Retourner l'URL relative
        return f"/uploads/{subfolder}/{filename}"

    # ============= ROLES =============

    async def creer_role(
        self,
        db: AsyncSession,
        nom: str,
        description: str = None,
        niveau_hierarchique: int = None
    ) -> Dict[str, Any]:
        """Créer un rôle d'équipage."""
        role = EquipageRole(
            nom=nom,
            description=description,
            niveau_hierarchique=niveau_hierarchique
        )
        db.add(role)
        await db.commit()
        await db.refresh(role)

        return {
            "id": role.id,
            "nom": role.nom,
            "description": role.description,
            "niveau_hierarchique": role.niveau_hierarchique
        }

    async def lister_roles(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """Liste tous les rôles."""
        query = select(EquipageRole).order_by(
            EquipageRole.niveau_hierarchique,
            EquipageRole.nom
        )
        result = await db.execute(query)
        roles = result.scalars().all()

        return [
            {
                "id": r.id,
                "nom": r.nom,
                "description": r.description,
                "niveau_hierarchique": r.niveau_hierarchique
            }
            for r in roles
        ]

    # ============= CERTIFICATIONS =============

    async def creer_certification(
        self,
        db: AsyncSession,
        nom: str,
        description: str = None,
        duree_validite_mois: int = None
    ) -> Dict[str, Any]:
        """Créer un type de certification."""
        certification = Certification(
            nom=nom,
            description=description,
            duree_validite_mois=duree_validite_mois
        )
        db.add(certification)
        await db.commit()
        await db.refresh(certification)

        return {
            "id": certification.id,
            "nom": certification.nom,
            "description": certification.description,
            "duree_validite_mois": certification.duree_validite_mois
        }

    async def lister_certifications(
        self,
        db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """Liste toutes les certifications."""
        query = select(Certification).order_by(Certification.nom)
        result = await db.execute(query)
        certifications = result.scalars().all()

        return [
            {
                "id": c.id,
                "nom": c.nom,
                "description": c.description,
                "duree_validite_mois": c.duree_validite_mois
            }
            for c in certifications
        ]

    # ============= MEMBRES ÉQUIPAGE =============

    async def creer_membre(
        self,
        db: AsyncSession,
        data: Dict[str, Any],
        photo_profil: UploadFile = None,
        photo_carte: UploadFile = None
    ) -> Dict[str, Any]:
        """Créer un membre d'équipage."""

        # Générer le numéro de licence
        numero_licence = self._generer_numero_licence()

        # Sauvegarder les images
        photo_profil_url = None
        photo_carte_url = None

        if photo_profil:
            photo_profil_url = await self._sauvegarder_image(
                photo_profil, "equipage/profils"
            )

        if photo_carte:
            photo_carte_url = await self._sauvegarder_image(
                photo_carte, "equipage/cartes"
            )

        # Créer le membre
        membre = MembreEquipage(
            numero_licence=numero_licence,
            photo_profil=photo_profil_url,
            photo_carte_identite=photo_carte_url,
            **data
        )

        db.add(membre)
        await db.commit()
        await db.refresh(membre, ["role"])

        return {
            "id": membre.id,
            "numero_licence": membre.numero_licence,
            "nom_complet": membre.nom_complet,
            "role_id": membre.role_id,
            "bateau_id": membre.bateau_id,
            "statut": membre.statut.value,
            "photo_profil": membre.photo_profil,
            "photo_carte_identite": membre.photo_carte_identite
        }

    async def get_membre(
        self,
        db: AsyncSession,
        membre_id: int
    ) -> Dict[str, Any]:
        """Récupérer un membre avec détails complets."""
        query = (
            select(MembreEquipage)
            .where(MembreEquipage.id == membre_id)
            .options(
                selectinload(MembreEquipage.role),
                selectinload(MembreEquipage.bateau),
                selectinload(MembreEquipage.certifications).selectinload(
                    EquipageCertification.certification
                )
            )
        )

        result = await db.execute(query)
        membre = result.scalar_one_or_none()

        if not membre:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Crew member not found"
            )

        return membre  # Retourner l'objet, sera converti par Pydantic

    async def lister_membres(
        self,
        db: AsyncSession,
        bateau_id: int = None,
        statut: str = None,
        role_id: int = None,
        page: int = 1,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Liste les membres avec filtres."""
        query = (
            select(MembreEquipage)
            .options(selectinload(MembreEquipage.role))
            .order_by(MembreEquipage.nom_complet)
        )

        if bateau_id:
            query = query.where(MembreEquipage.bateau_id == bateau_id)
        if statut:
            query = query.where(MembreEquipage.statut == statut)
        if role_id:
            query = query.where(MembreEquipage.role_id == role_id)

        # Pagination
        offset = (page - 1) * limit
        query_page = query.offset(offset).limit(limit)

        result = await db.execute(query_page)
        membres = result.scalars().all()

        # Total
        count_query = select(func.count(MembreEquipage.id))
        if bateau_id:
            count_query = count_query.where(MembreEquipage.bateau_id == bateau_id)
        if statut:
            count_query = count_query.where(MembreEquipage.statut == statut)
        if role_id:
            count_query = count_query.where(MembreEquipage.role_id == role_id)

        total_result = await db.execute(count_query)
        total = total_result.scalar()

        return {
            "membres": membres,
            "total": total,
            "page": page,
            "pages_total": (total + limit - 1) // limit
        }

    async def mettre_a_jour_membre(
        self,
        db: AsyncSession,
        membre_id: int,
        data: Dict[str, Any],
        photo_profil: UploadFile = None,
        photo_carte: UploadFile = None
    ) -> Dict[str, Any]:
        """Mettre à jour un membre."""
        query = select(MembreEquipage).where(MembreEquipage.id == membre_id)
        result = await db.execute(query)
        membre = result.scalar_one_or_none()

        if not membre:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Crew member not found"
            )

        # Mettre à jour les champs
        for key, value in data.items():
            if value is not None and hasattr(membre, key):
                setattr(membre, key, value)

        # Mettre à jour les photos
        if photo_profil:
            membre.photo_profil = await self._sauvegarder_image(
                photo_profil, "equipage/profils"
            )

        if photo_carte:
            membre.photo_carte_identite = await self._sauvegarder_image(
                photo_carte, "equipage/cartes"
            )

        await db.commit()
        await db.refresh(membre)

        return {
            "id": membre.id,
            "message": "Membre mis à jour avec succès"
        }

    async def supprimer_membre(
        self,
        db: AsyncSession,
        membre_id: int
    ) -> Dict[str, Any]:
        """Supprimer un membre."""
        query = select(MembreEquipage).where(MembreEquipage.id == membre_id)
        result = await db.execute(query)
        membre = result.scalar_one_or_none()

        if not membre:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Crew member not found"
            )

        await db.delete(membre)
        await db.commit()

        return {
            "message": "Membre supprimé avec succès",
            "id": membre_id
        }

    # ============= CERTIFICATIONS MEMBRE =============

    async def ajouter_certification_membre(
        self,
        db: AsyncSession,
        membre_id: int,
        certification_id: int,
        date_obtention: date,
        date_expiration: date = None,
        numero_certificat: str = None,
        organisme_delivrance: str = None
    ) -> Dict[str, Any]:
        """Ajouter une certification à un membre."""
        cert = EquipageCertification(
            membre_equipage_id=membre_id,
            certification_id=certification_id,
            date_obtention=date_obtention,
            date_expiration=date_expiration,
            numero_certificat=numero_certificat,
            organisme_delivrance=organisme_delivrance
        )

        db.add(cert)
        await db.commit()

        return {
            "id": cert.id,
            "message": "Certification ajoutée"
        }

    async def get_certifications_expirees(
        self,
        db: AsyncSession,
        bateau_id: int = None,
        jours: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Liste certifications expirées ou qui expirent bientôt.

        Args:
            bateau_id: Filtrer par bateau
            jours: Nombre de jours dans le futur (0 = déjà expirées, 30 = expire dans 30j)
        """
        date_limite = date.today() + timedelta(days=jours)

        query = (
            select(EquipageCertification)
            .where(EquipageCertification.date_expiration <= date_limite)
            .where(EquipageCertification.date_expiration.isnot(None))
            .where(EquipageCertification.est_valide == True)
            .options(
                selectinload(EquipageCertification.membre_equipage).selectinload(
                    MembreEquipage.bateau
                ),
                selectinload(EquipageCertification.certification)
            )
        )

        if bateau_id:
            query = query.join(MembreEquipage).where(
                MembreEquipage.bateau_id == bateau_id
            )

        result = await db.execute(query)
        certifications = result.scalars().all()

        return [
            {
                "membre_nom": c.membre_equipage.nom_complet,
                "bateau_nom": c.membre_equipage.bateau.nom,
                "certification_nom": c.certification.nom,
                "date_expiration": c.date_expiration,
                "jours_restants": (c.date_expiration - date.today()).days
            }
            for c in certifications
        ]


equipage_service = EquipageService()
