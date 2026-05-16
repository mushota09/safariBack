from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.reservation import TypeReservation, TypeVehicule, StatutReservation, ReservationMode
from app.models.compagnie import TypeLit


class PassagerInfo(BaseModel):
    nom_complet: str
    email: Optional[str] = None
    telephone: Optional[str] = None
    chambre_id: Optional[int] = None
    lit_id: Optional[int] = None


class VehiculeInfo(BaseModel):
    type_vehicule: TypeVehicule
    immatriculation: str
    marque: Optional[str] = None
    modele: Optional[str] = None
    couleur: Optional[str] = None
    annee: Optional[str] = None
    proprietaire_nom: Optional[str] = None
    proprietaire_telephone: Optional[str] = None


class ReservationCreate(BaseModel):
    voyage_id: int
    type_reservation: TypeReservation
    nombre_passagers: int = Field(ge=1)
    vehicule_inclus: bool = False
    type_vehicule: Optional[TypeVehicule] = None
    immatriculation_vehicule: Optional[str] = None
    niveau_id: Optional[int] = None
    chambre_id: Optional[int] = None
    lit_id: Optional[int] = None


class ReservationCreateMultiple(BaseModel):
    voyage_id: int
    type_reservation: TypeReservation
    reservation_mode: str  # 'moi_meme', 'moi_et_autres', 'les_autres'
    passagers: Optional[List[PassagerInfo]] = None
    vehicules: Optional[List[VehiculeInfo]] = None
    vehicule_inclus: bool = False
    type_vehicule: Optional[TypeVehicule] = None
    immatriculation_vehicule: Optional[str] = None


class ReservationUpdate(BaseModel):
    nombre_passagers: Optional[int] = Field(None, ge=1)
    vehicule_inclus: Optional[bool] = None
    type_vehicule: Optional[TypeVehicule] = None
    immatriculation_vehicule: Optional[str] = None


class ReservationCancellation(BaseModel):
    raison: Optional[str] = None


class ReservationPassagerResponse(BaseModel):
    id: int
    nom_complet: str
    email: Optional[str]
    telephone: Optional[str]
    chambre_id: Optional[int]
    lit_id: Optional[int]
    is_principal: bool
    date_enregistrement: datetime

    class Config:
        from_attributes = True


class ReservationVehiculeResponse(BaseModel):
    id: int
    type_vehicule: TypeVehicule
    immatriculation: str
    marque: Optional[str]
    modele: Optional[str]
    couleur: Optional[str]
    annee: Optional[str]
    proprietaire_nom: Optional[str]
    proprietaire_telephone: Optional[str]
    date_enregistrement: datetime

    class Config:
        from_attributes = True


class ReservationResponse(BaseModel):
    id: int
    reference_reservation: str
    utilisateur_id: int
    voyage_id: int
    type_reservation: TypeReservation
    reservation_mode: Optional[ReservationMode] = None
    niveau_id: Optional[int]
    chambre_id: Optional[int]
    lit_id: Optional[int]
    montant_total: float
    date_reservation: datetime
    date_expiration_paiement: Optional[datetime]
    nombre_passagers: int
    vehicule_inclus: bool
    type_vehicule: Optional[TypeVehicule]
    immatriculation_vehicule: Optional[str]
    statut_reservation: StatutReservation
    frais_annulation: Optional[float]
    date_annulation: Optional[datetime]
    raison_annulation: Optional[str]
    passagers_details: List[ReservationPassagerResponse] = []
    vehicules_details: List[ReservationVehiculeResponse] = []

    class Config:
        from_attributes = True


# Schemas for boat structure
class LitInfo(BaseModel):
    id: int
    numero_lit: str
    disponible: bool
    prix_supplementaire: float
    type_lit: TypeLit
    taille: Optional[str]

    class Config:
        from_attributes = True


class ChambreInfo(BaseModel):
    id: int
    numero_chambre: str
    prix_base: float
    type_chambre: Optional[str]
    fenetre: bool
    salle_de_bain: bool
    lits: List[LitInfo]

    class Config:
        from_attributes = True


class NiveauInfo(BaseModel):
    id: int
    numero_niveau: int
    nom: str
    multiplicateur_prix: float
    description: Optional[str]
    chambres: List[ChambreInfo]

    class Config:
        from_attributes = True


class BateauStructureResponse(BaseModel):
    bateau_id: int
    bateau_nom: str
    voyage_id: int
    prix_base: float
    prix_promotionnel: Optional[float]
    has_niveaux: bool
    niveaux: List[NiveauInfo]

    class Config:
        from_attributes = True


class ChambreDisponibleInfo(BaseModel):
    id: int
    numero_chambre: str
    prix_base: float
    type_chambre: Optional[str]
    fenetre: bool
    salle_de_bain: bool
    niveau_id: int
    niveau_nom: str
    niveau_numero: int
    lits_disponibles: List[LitInfo]

    class Config:
        from_attributes = True


class ChambresDisponiblesResponse(BaseModel):
    voyage_id: int
    chambres: List[ChambreDisponibleInfo]

    class Config:
        from_attributes = True
