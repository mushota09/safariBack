from pydantic import BaseModel, EmailStr, Field
from datetime import date
from typing import Optional, List


class CompagnieBateauBase(BaseModel):
    nom: str = Field(..., max_length=200)
    telephone: Optional[str] = None
    email: Optional[EmailStr] = None
    adresse_siege: Optional[str] = None
    site_web: Optional[str] = None
    logo: Optional[str] = None
    numero_licence: str = Field(..., max_length=50)
    numero_registre: Optional[str] = None
    pays_immatriculation: Optional[str] = None
    date_creation_compagnie: Optional[date] = None
    taux_commission: float = 0.0
    politique_annulation: Optional[str] = None


class CompagnieBateauCreate(CompagnieBateauBase):
    pass


class CompagnieBateauUpdate(BaseModel):
    nom: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[EmailStr] = None
    adresse_siege: Optional[str] = None
    site_web: Optional[str] = None
    logo: Optional[str] = None
    numero_registre: Optional[str] = None
    pays_immatriculation: Optional[str] = None
    date_creation_compagnie: Optional[date] = None
    taux_commission: Optional[float] = None
    politique_annulation: Optional[str] = None


class CompagnieBateauResponse(CompagnieBateauBase):
    id: int

    class Config:
        from_attributes = True


# Schémas pour BateauCapaciteVehicule
class BateauCapaciteVehiculeBase(BaseModel):
    type_vehicule_id: int
    capacite: int = Field(..., gt=0, description="Capacité pour ce type de véhicule")


class BateauCapaciteVehiculeCreate(BateauCapaciteVehiculeBase):
    pass


class BateauCapaciteVehiculeUpdate(BaseModel):
    capacite: Optional[int] = Field(None, gt=0)


class BateauCapaciteVehiculeResponse(BateauCapaciteVehiculeBase):
    id: int
    bateau_id: int
    type_vehicule_nom: Optional[str] = None  # Depuis la relation

    class Config:
        from_attributes = True


# Schémas pour Bateau
class BateauBase(BaseModel):
    nom: str = Field(..., max_length=200)
    immatriculation: str = Field(..., max_length=50)
    capacite_passagers: int = Field(..., gt=0)
    vitesse_croisiere: Optional[float] = None
    longueur: Optional[float] = Field(None, description="Longueur en mètres")
    largeur: Optional[float] = Field(None, description="Largeur en mètres")
    tonnage: Optional[float] = Field(None, description="Tonnage en tonnes")
    tirant_eau: Optional[float] = None
    puissance_moteur: Optional[float] = None
    wifi: bool = False
    restaurant: bool = False
    boutique: bool = False
    jeux: bool = False
    salon_coiffure: bool = False
    en_maintenance: bool = False
    date_derniere_revision: Optional[date] = None
    date_prochaine_revision: Optional[date] = None
    photo_principale: Optional[str] = None
    plan_bateau: Optional[str] = None


class BateauCreate(BateauBase):
    compagnie_id: int
    type_bateau_id: Optional[int] = None
    capacites_vehicules: List[BateauCapaciteVehiculeCreate] = []


class BateauUpdate(BaseModel):
    nom: Optional[str] = None
    capacite_passagers: Optional[int] = Field(None, gt=0)
    vitesse_croisiere: Optional[float] = None
    longueur: Optional[float] = None
    largeur: Optional[float] = None
    tonnage: Optional[float] = None
    tirant_eau: Optional[float] = None
    puissance_moteur: Optional[float] = None
    wifi: Optional[bool] = None
    restaurant: Optional[bool] = None
    boutique: Optional[bool] = None
    jeux: Optional[bool] = None
    salon_coiffure: Optional[bool] = None
    en_maintenance: Optional[bool] = None
    date_derniere_revision: Optional[date] = None
    date_prochaine_revision: Optional[date] = None
    photo_principale: Optional[str] = None
    plan_bateau: Optional[str] = None
    capacites_vehicules: Optional[List[BateauCapaciteVehiculeCreate]] = None


class BateauResponse(BateauBase):
    id: int
    compagnie_id: int
    type_bateau_id: Optional[int] = None
    capacites_vehicules: List[BateauCapaciteVehiculeResponse] = []

    class Config:
        from_attributes = True


class ImageBateauBase(BaseModel):
    url: str = Field(..., max_length=500)
    legende: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    est_principale: bool = False
    ordre: int = 0


class ImageBateauCreate(ImageBateauBase):
    pass


class ImageBateauUpdate(BaseModel):
    url: Optional[str] = Field(None, max_length=500)
    legende: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    est_principale: Optional[bool] = None
    ordre: Optional[int] = None


class ImageBateauResponse(ImageBateauBase):
    id: int
    bateau_id: int

    class Config:
        from_attributes = True


class BateauGalerieResponse(BaseModel):
    bateau_id: int
    bateau_nom: str
    photo_principale: Optional[str]
    images: List[ImageBateauResponse]

    class Config:
        from_attributes = True
