"""Schémas Pydantic pour la gestion des bateaux et de leur structure interne."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.compagnie import TypeLit


# ---------- Bateau (CRUD) ----------

class BateauBase(BaseModel):
    nom: str = Field(..., max_length=200)
    immatriculation: str = Field(..., max_length=50)
    capacite_passagers: int = Field(..., ge=0)
    capacite_vehicules: Optional[int] = Field(0, ge=0)
    en_maintenance: bool = False
    clim: bool = False
    wifi: bool = False
    restaurant: bool = False
    boutique: bool = False
    cabines: bool = False
    photo_principale: Optional[str] = Field(None, max_length=500)
    plan_bateau: Optional[str] = Field(None, max_length=500)
    type_bateau_id: Optional[int] = None
    longueur: Optional[float] = None
    tirant_eau: Optional[float] = None
    puissance_moteur: Optional[float] = None
    vitesse_croisiere: Optional[float] = None


class BateauCreate(BateauBase):
    compagnie_id: Optional[int] = None  # déduit du tenant admin si non fourni


class BateauUpdate(BaseModel):
    nom: Optional[str] = None
    immatriculation: Optional[str] = None
    capacite_passagers: Optional[int] = Field(None, ge=0)
    capacite_vehicules: Optional[int] = Field(None, ge=0)
    en_maintenance: Optional[bool] = None
    clim: Optional[bool] = None
    wifi: Optional[bool] = None
    restaurant: Optional[bool] = None
    boutique: Optional[bool] = None
    cabines: Optional[bool] = None
    photo_principale: Optional[str] = None
    plan_bateau: Optional[str] = None
    type_bateau_id: Optional[int] = None
    longueur: Optional[float] = None
    tirant_eau: Optional[float] = None
    puissance_moteur: Optional[float] = None
    vitesse_croisiere: Optional[float] = None


class BateauResponse(BateauBase):
    id: int
    compagnie_id: int

    class Config:
        from_attributes = True


# ---------- Structure (niveaux/chambres/lits) ----------

class LitPayload(BaseModel):
    id: Optional[int] = None
    numero_lit: str = Field(..., max_length=20)
    type_lit: TypeLit
    taille: Optional[str] = None
    prix_supplementaire: float = 0.0
    disponible: bool = True


class ChambrePayload(BaseModel):
    id: Optional[int] = None
    numero_chambre: str = Field(..., max_length=20)
    prix_base: float = Field(..., ge=0)
    type_chambre: Optional[str] = None
    fenetre: bool = False
    salle_de_bain: bool = False
    lits: List[LitPayload] = []


class NiveauPayload(BaseModel):
    id: Optional[int] = None
    numero_niveau: int = Field(..., ge=1)
    nom: str = Field(..., max_length=100)
    multiplicateur_prix: float = 1.0
    description: Optional[str] = None
    chambres: List[ChambrePayload] = []


class StructurePayload(BaseModel):
    niveaux: List[NiveauPayload] = []


class LitOut(BaseModel):
    id: int
    chambre_id: int
    numero_lit: str
    type_lit: TypeLit
    taille: Optional[str]
    prix_supplementaire: float
    disponible: bool

    class Config:
        from_attributes = True


class ChambreOut(BaseModel):
    id: int
    niveau_id: int
    numero_chambre: str
    prix_base: float
    type_chambre: Optional[str]
    fenetre: bool
    salle_de_bain: bool
    lits: List[LitOut] = []

    class Config:
        from_attributes = True


class NiveauOut(BaseModel):
    id: int
    bateau_id: int
    numero_niveau: int
    nom: str
    multiplicateur_prix: float
    description: Optional[str]
    chambres: List[ChambreOut] = []

    class Config:
        from_attributes = True


class StructureResponse(BaseModel):
    bateau_id: int
    bateau_nom: str
    niveaux: List[NiveauOut] = []
