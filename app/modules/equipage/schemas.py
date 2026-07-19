"""Schémas Pydantic pour le module équipage."""
from pydantic import BaseModel, EmailStr, Field
from datetime import date, datetime
from typing import Optional, List


# Schemas pour EquipageRole
class EquipageRoleBase(BaseModel):
    nom: str = Field(..., max_length=100)
    description: Optional[str] = None
    niveau_hierarchique: Optional[int] = Field(None, ge=1, le=5)


class EquipageRoleCreate(EquipageRoleBase):
    pass


class EquipageRoleUpdate(BaseModel):
    nom: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    niveau_hierarchique: Optional[int] = Field(None, ge=1, le=5)


class EquipageRoleResponse(EquipageRoleBase):
    id: int

    class Config:
        from_attributes = True


# Schemas pour Certification
class CertificationBase(BaseModel):
    nom: str = Field(..., max_length=100)
    description: Optional[str] = None
    duree_validite_mois: Optional[int] = Field(None, ge=1)


class CertificationCreate(CertificationBase):
    pass


class CertificationUpdate(BaseModel):
    nom: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    duree_validite_mois: Optional[int] = Field(None, ge=1)


class CertificationResponse(CertificationBase):
    id: int

    class Config:
        from_attributes = True


# Schemas pour EquipageCertification
class EquipageCertificationBase(BaseModel):
    certification_id: int
    date_obtention: date
    date_expiration: Optional[date] = None
    numero_certificat: Optional[str] = Field(None, max_length=100)
    organisme_delivrance: Optional[str] = Field(None, max_length=200)


class EquipageCertificationCreate(EquipageCertificationBase):
    pass


class EquipageCertificationUpdate(BaseModel):
    date_obtention: Optional[date] = None
    date_expiration: Optional[date] = None
    numero_certificat: Optional[str] = None
    organisme_delivrance: Optional[str] = None
    est_valide: Optional[bool] = None


class EquipageCertificationResponse(EquipageCertificationBase):
    id: int
    membre_equipage_id: int
    est_valide: bool
    est_expire: bool
    certification: CertificationResponse

    class Config:
        from_attributes = True


# Schemas pour MembreEquipage
class MembreEquipageBase(BaseModel):
    nom_complet: str = Field(..., max_length=200)
    sexe: str = Field(..., pattern="^(HOMME|FEMME)$")
    date_naissance: Optional[date] = None
    nationalite: Optional[str] = Field(None, max_length=100)
    telephone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    adresse: Optional[str] = None
    role_id: int
    bateau_id: int
    statut: str = Field(
        default="ACTIF",
        pattern="^(ACTIF|CONGE|SUSPENDU|DEMISSIONNE|RETRAITE)$"
    )
    date_embauche: Optional[date] = None
    date_fin_contrat: Optional[date] = None
    annees_experience: Optional[int] = Field(None, ge=0)
    contact_urgence_nom: Optional[str] = Field(None, max_length=200)
    contact_urgence_telephone: Optional[str] = Field(None, max_length=20)


class MembreEquipageCreate(MembreEquipageBase):
    """Création - le numero_licence sera généré automatiquement."""
    pass


class MembreEquipageUpdate(BaseModel):
    nom_complet: Optional[str] = Field(None, max_length=200)
    sexe: Optional[str] = Field(None, pattern="^(HOMME|FEMME)$")
    date_naissance: Optional[date] = None
    nationalite: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[EmailStr] = None
    adresse: Optional[str] = None
    role_id: Optional[int] = None
    bateau_id: Optional[int] = None
    statut: Optional[str] = Field(
        None,
        pattern="^(ACTIF|CONGE|SUSPENDU|DEMISSIONNE|RETRAITE)$"
    )
    date_embauche: Optional[date] = None
    date_fin_contrat: Optional[date] = None
    annees_experience: Optional[int] = Field(None, ge=0)
    contact_urgence_nom: Optional[str] = None
    contact_urgence_telephone: Optional[str] = None


class MembreEquipageResponse(MembreEquipageBase):
    id: int
    numero_licence: str
    photo_profil: Optional[str]
    photo_carte_identite: Optional[str]
    date_creation: datetime
    date_modification: datetime
    role: EquipageRoleResponse
    certifications: List[EquipageCertificationResponse] = []

    class Config:
        from_attributes = True


class MembreEquipageListItem(BaseModel):
    """Version simplifiée pour les listes."""
    id: int
    nom_complet: str
    sexe: str
    numero_licence: str
    role: EquipageRoleResponse
    statut: str
    photo_profil: Optional[str]
    annees_experience: Optional[int]

    class Config:
        from_attributes = True


# Schemas pour statistiques
class StatistiquesEquipageResponse(BaseModel):
    bateau_id: int
    bateau_nom: str
    total_equipage: int
    par_statut: dict
    par_role: dict
    certifications_expirees: int
    certifications_expire_bientot: int  # Dans les 30 jours
