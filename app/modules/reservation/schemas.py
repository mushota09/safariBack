from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from app.models.reservation import TypeReservation, StatutReservation, ClassePassager
from app.models.compagnie import TypeLit


class PassagerCreateInfo(BaseModel):
    """Informations pour créer un passager dans une réservation"""
    nom_complet: str = Field(..., min_length=2, max_length=200)
    email: Optional[str] = Field(None, max_length=255)
    telephone: Optional[str] = Field(None, min_length=8, max_length=20)
    date_naissance: Optional[str] = Field(None, max_length=20)
    document_identite: Optional[str] = Field(None, max_length=100)
    numero_identite: Optional[str] = Field(None, max_length=100)
    classe_passager: ClassePassager = ClassePassager.standard
    niveau_id: Optional[int] = None
    chambre_id: Optional[int] = None
    lit_id: Optional[int] = None
    chaise_id: Optional[int] = None
    is_principal: bool = False


class VehiculeCreateInfo(BaseModel):
    """Informations pour créer un véhicule dans une réservation"""
    type_vehicule_id: int = Field(..., gt=0)
    immatriculation: str = Field(..., min_length=2, max_length=50)
    marque: Optional[str] = Field(None, max_length=100)
    modele: Optional[str] = Field(None, max_length=100)
    couleur: Optional[str] = Field(None, max_length=50)
    annee: Optional[str] = Field(None, max_length=10)


class ColisCreateInfo(BaseModel):
    """Informations pour créer un colis dans une réservation"""
    description_marchandises: str = Field(..., min_length=2)
    poids_kg: float = Field(..., gt=0, le=10000)
    expediteur_nom: Optional[str] = Field(None, max_length=200)
    expediteur_telephone: Optional[str] = Field(None, max_length=20)
    destinataire_nom: str = Field(..., min_length=2, max_length=200)
    destinataire_telephone: str = Field(..., min_length=8, max_length=20)


class ReservationCreateUnified(BaseModel):
    """Schema unifié pour créer une réservation (tous types)"""
    voyage_id: int = Field(..., gt=0)
    type_reservation: TypeReservation

    # Passagers OPTIONNELS (sauf pour type=passager)
    passagers: Optional[List[PassagerCreateInfo]] = None

    # Véhicules (requis si type=vehicule)
    vehicules: Optional[List[VehiculeCreateInfo]] = None

    # Colis (requis si type=colis)
    colis: Optional[List[ColisCreateInfo]] = None

    # Contact expéditeur/destinataire
    expediteur_nom: Optional[str] = Field(None, max_length=200)
    expediteur_telephone: Optional[str] = Field(None, max_length=20)
    destinataire_nom: Optional[str] = Field(None, max_length=200)
    destinataire_telephone: Optional[str] = Field(None, max_length=20)

    @validator('passagers')
    def validate_passagers(cls, v, values):
        type_res = values.get('type_reservation')

        if type_res == TypeReservation.passager:
            # Type PASSAGER: passagers REQUIS
            if not v or len(v) == 0:
                raise ValueError('Type passager requiert au moins 1 passager')

            # Vérifier un passager principal
            principaux = [p for p in v if p.is_principal]
            if len(principaux) != 1:
                raise ValueError('Type passager: exactement 1 passager principal requis')

        # Pour vehicule/colis: passagers optionnels
        if v and len(v) > 0:
            # Si passagers présents, vérifier unicité lits
            lits = [p.lit_id for p in v if p.lit_id]
            if len(lits) != len(set(lits)):
                raise ValueError('Chaque lit ne peut être assigné qu\'une fois')

            # Vérifier un passager principal
            principaux = [p for p in v if p.is_principal]
            if len(principaux) != 1:
                raise ValueError('Si passagers présents: exactement 1 passager doit être principal')

        return v

    @validator('vehicules')
    def validate_vehicules(cls, v, values):
        type_res = values.get('type_reservation')

        if type_res == TypeReservation.vehicule:
            if not v or len(v) == 0:
                raise ValueError('Type vehicule requiert au moins 1 vehicule')

            # Unicité immatriculations
            immat = [veh.immatriculation.strip().upper() for veh in v]
            if len(immat) != len(set(immat)):
                raise ValueError('Immatriculations en double détectées')

        elif type_res != TypeReservation.vehicule and v:
            raise ValueError('Seul type vehicule peut avoir des véhicules')

        return v

    @validator('colis')
    def validate_colis(cls, v, values):
        type_res = values.get('type_reservation')

        if type_res == TypeReservation.colis:
            if not v or len(v) == 0:
                raise ValueError('Type colis requiert au moins 1 colis')

        # Type passager et vehicule: colis OPTIONNELS (pas d'erreur)

        return v


class PassagerFrontInfo(BaseModel):
    """Informations passager pour la réservation front office (sans véhicule/colis)."""
    nom_complet: str = Field(..., min_length=2, max_length=200)
    email: Optional[str] = Field(None, max_length=255)
    telephone: Optional[str] = Field(None, min_length=8, max_length=20)
    date_naissance: Optional[str] = Field(None, max_length=20)
    numero_identite: Optional[str] = Field(None, max_length=100)
    classe_passager: ClassePassager = ClassePassager.standard
    niveau_id: Optional[int] = None
    chambre_id: Optional[int] = None
    lit_id: Optional[int] = None
    chaise_id: Optional[int] = None
    is_principal: bool = False


class ReservationFrontCreate(BaseModel):
    """Réservation passager depuis le front office (3 cas : pour moi, moi+autres, autres)."""
    voyage_id: int = Field(..., gt=0)
    passagers: List[PassagerFrontInfo]

    @validator('passagers')
    def validate_passagers(cls, v):
        if not v or len(v) == 0:
            raise ValueError('Au moins 1 passager requis')
        principaux = [p for p in v if p.is_principal]
        if len(principaux) != 1:
            raise ValueError('Exactement 1 passager principal requis')
        lits = [p.lit_id for p in v if p.lit_id]
        if len(lits) != len(set(lits)):
            raise ValueError('Chaque lit ne peut être assigné qu\'une fois')
        return v


class ReservationUpdate(BaseModel):
    pass


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
    montant: Optional[float] = None
    rembourse: bool = False
    frais_annulation: Optional[float] = None
    date_annulation: Optional[datetime] = None
    raison_annulation: Optional[str] = None
    date_enregistrement: datetime

    class Config:
        from_attributes = True


class ReservationVehiculeResponse(BaseModel):
    id: int
    type_vehicule_id: int
    immatriculation: str
    marque: Optional[str]
    modele: Optional[str]
    couleur: Optional[str]
    annee: Optional[str]
    montant: Optional[float] = None
    rembourse: bool = False
    frais_annulation: Optional[float] = None
    date_annulation: Optional[datetime] = None
    raison_annulation: Optional[str] = None
    date_enregistrement: datetime

    class Config:
        from_attributes = True


class ReservationColisResponse(BaseModel):
    """Response pour un colis dans une réservation"""
    id: int
    description_marchandises: str
    poids_kg: float
    montant_par_kg: float
    montant_total: float
    rembourse: bool = False
    frais_annulation: Optional[float] = None
    date_annulation: Optional[datetime] = None
    raison_annulation: Optional[str] = None
    date_enregistrement: datetime

    class Config:
        from_attributes = True


class ReservationResponse(BaseModel):
    id: int
    reference_reservation: str
    utilisateur_id: int
    voyage_id: int
    type_reservation: TypeReservation
    montant_total: float
    date_reservation: datetime
    date_expiration_paiement: Optional[datetime]
    statut_reservation: StatutReservation
    frais_annulation: Optional[float]
    date_annulation: Optional[datetime]
    raison_annulation: Optional[str]
    is_front: bool
    expediteur_nom: Optional[str] = None
    expediteur_telephone: Optional[str] = None
    destinataire_nom: Optional[str] = None
    destinataire_telephone: Optional[str] = None
    passagers_details: List[ReservationPassagerResponse] = []
    vehicules_details: List[ReservationVehiculeResponse] = []
    colis_details: List[ReservationColisResponse] = []

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
