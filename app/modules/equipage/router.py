"""Router pour le module équipage."""
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import date

from app.database import get_db
from app.modules.equipage.service import equipage_service
from app.modules.equipage.schemas import (
    EquipageRoleCreate,
    EquipageRoleResponse,
    CertificationCreate,
    CertificationResponse,
    MembreEquipageCreate,
    MembreEquipageResponse,
    MembreEquipageUpdate,
    MembreEquipageListItem,
    EquipageCertificationCreate,
)

router = APIRouter(prefix="/equipage", tags=["Équipage"])


# ============= ROLES =============

@router.post("/roles", response_model=EquipageRoleResponse, status_code=201)
async def creer_role(
    role: EquipageRoleCreate,
    db: AsyncSession = Depends(get_db),
):
    """Créer un rôle d'équipage."""
    return await equipage_service.creer_role(
        db,
        nom=role.nom,
        description=role.description,
        niveau_hierarchique=role.niveau_hierarchique
    )


@router.get("/roles", response_model=list[EquipageRoleResponse])
async def lister_roles(db: AsyncSession = Depends(get_db)):
    """Liste tous les rôles."""
    return await equipage_service.lister_roles(db)


# ============= CERTIFICATIONS =============

@router.post("/certifications", response_model=CertificationResponse, status_code=201)
async def creer_certification(
    cert: CertificationCreate,
    db: AsyncSession = Depends(get_db),
):
    """Créer un type de certification."""
    return await equipage_service.creer_certification(
        db,
        nom=cert.nom,
        description=cert.description,
        duree_validite_mois=cert.duree_validite_mois
    )


@router.get("/certifications", response_model=list[CertificationResponse])
async def lister_certifications(db: AsyncSession = Depends(get_db)):
    """Liste toutes les certifications."""
    return await equipage_service.lister_certifications(db)


@router.get("/certifications/expirees")
async def get_certifications_expirees(
    bateau_id: Optional[int] = Query(None),
    jours: int = Query(0, description="0=déjà expirées, 30=expire dans 30j"),
    db: AsyncSession = Depends(get_db),
):
    """
    Liste des certifications expirées ou qui expirent bientôt.

    **Usage:**
    - `jours=0`: Déjà expirées
    - `jours=30`: Expirent dans les 30 jours
    """
    return await equipage_service.get_certifications_expirees(
        db, bateau_id=bateau_id, jours=jours
    )


# ============= MEMBRES ÉQUIPAGE =============

@router.post("/membres", status_code=201)
async def creer_membre(
    # Données JSON
    nom_complet: str = Form(...),
    sexe: str = Form(..., pattern="^(HOMME|FEMME)$"),
    role_id: int = Form(...),
    bateau_id: int = Form(...),
    statut: str = Form(default="ACTIF"),

    # Optionnel
    date_naissance: Optional[str] = Form(None),
    nationalite: Optional[str] = Form(None),
    telephone: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    adresse: Optional[str] = Form(None),
    date_embauche: Optional[str] = Form(None),
    date_fin_contrat: Optional[str] = Form(None),
    annees_experience: Optional[int] = Form(None),
    contact_urgence_nom: Optional[str] = Form(None),
    contact_urgence_telephone: Optional[str] = Form(None),

    # Images
    photo_profil: Optional[UploadFile] = File(None),
    photo_carte_identite: Optional[UploadFile] = File(None),

    db: AsyncSession = Depends(get_db),
):
    """
    Créer un membre d'équipage avec upload d'images.

    **Images acceptées:** JPG, PNG, PDF (pour carte d'identité)

    **Le numéro de licence est généré automatiquement.**
    """
    data = {
        "nom_complet": nom_complet,
        "sexe": sexe,
        "role_id": role_id,
        "bateau_id": bateau_id,
        "statut": statut,
        "date_naissance": date.fromisoformat(date_naissance) if date_naissance else None,
        "nationalite": nationalite,
        "telephone": telephone,
        "email": email,
        "adresse": adresse,
        "date_embauche": date.fromisoformat(date_embauche) if date_embauche else None,
        "date_fin_contrat": date.fromisoformat(date_fin_contrat) if date_fin_contrat else None,
        "annees_experience": annees_experience,
        "contact_urgence_nom": contact_urgence_nom,
        "contact_urgence_telephone": contact_urgence_telephone,
    }

    return await equipage_service.creer_membre(
        db,
        data=data,
        photo_profil=photo_profil,
        photo_carte=photo_carte_identite
    )


@router.get("/membres/{membre_id}", response_model=MembreEquipageResponse)
async def get_membre(
    membre_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Récupérer un membre avec détails complets."""
    return await equipage_service.get_membre(db, membre_id)


@router.get("/membres")
async def lister_membres(
    bateau_id: Optional[int] = Query(None),
    statut: Optional[str] = Query(None),
    role_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Liste les membres avec filtres et pagination.

    **Filtres:**
    - bateau_id: Filtrer par bateau
    - statut: ACTIF, CONGE, SUSPENDU, etc.
    - role_id: Filtrer par rôle
    """
    return await equipage_service.lister_membres(
        db,
        bateau_id=bateau_id,
        statut=statut,
        role_id=role_id,
        page=page,
        limit=limit
    )


@router.put("/membres/{membre_id}")
async def mettre_a_jour_membre(
    membre_id: int,
    # Utiliser Form pour permettre upload de fichiers
    nom_complet: Optional[str] = Form(None),
    sexe: Optional[str] = Form(None),
    statut: Optional[str] = Form(None),
    telephone: Optional[str] = Form(None),
    email: Optional[str] = Form(None),

    # Images
    photo_profil: Optional[UploadFile] = File(None),
    photo_carte_identite: Optional[UploadFile] = File(None),

    db: AsyncSession = Depends(get_db),
):
    """Mettre à jour un membre (peut inclure nouvelles photos)."""
    data = {k: v for k, v in {
        "nom_complet": nom_complet,
        "sexe": sexe,
        "statut": statut,
        "telephone": telephone,
        "email": email,
    }.items() if v is not None}

    return await equipage_service.mettre_a_jour_membre(
        db,
        membre_id=membre_id,
        data=data,
        photo_profil=photo_profil,
        photo_carte=photo_carte_identite
    )


@router.delete("/membres/{membre_id}")
async def supprimer_membre(
    membre_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Supprimer un membre."""
    return await equipage_service.supprimer_membre(db, membre_id)


# ============= CERTIFICATIONS MEMBRE =============

@router.post("/membres/{membre_id}/certifications")
async def ajouter_certification_membre(
    membre_id: int,
    certification: EquipageCertificationCreate,
    db: AsyncSession = Depends(get_db),
):
    """Ajouter une certification à un membre."""
    return await equipage_service.ajouter_certification_membre(
        db,
        membre_id=membre_id,
        certification_id=certification.certification_id,
        date_obtention=certification.date_obtention,
        date_expiration=certification.date_expiration,
        numero_certificat=certification.numero_certificat,
        organisme_delivrance=certification.organisme_delivrance
    )
