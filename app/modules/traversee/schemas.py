from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List


class TraverseeSearchParams(BaseModel):
    port_depart: Optional[int] = None
    port_arrivee: Optional[int] = None
    date_min: Optional[datetime] = None
    date_max: Optional[datetime] = None
    passagers: int = 1
    vehicule: bool = False
    page: int = 1
    page_size: int = 20


class PortInfo(BaseModel):
    id: int
    nom: str
    code_international: str

    class Config:
        from_attributes = True


class BateauInfo(BaseModel):
    id: int
    nom: str
    capacite_passagers: int
    capacites_vehicules: Optional[List[dict]] = []  # Liste des capacités par type
    immatriculation: Optional[str] = None
    vitesse_croisiere: Optional[float] = None
    longueur: Optional[float] = None
    largeur: Optional[float] = None
    tonnage: Optional[float] = None
    tirant_eau: Optional[float] = None
    puissance_moteur: Optional[float] = None
    wifi: Optional[bool] = False
    restaurant: Optional[bool] = False
    boutique: Optional[bool] = False
    jeux: Optional[bool] = False
    salon_coiffure: Optional[bool] = False
    en_maintenance: Optional[bool] = False
    date_derniere_revision: Optional[date] = None
    date_prochaine_revision: Optional[date] = None
    photo_principale: Optional[str] = None

    class Config:
        from_attributes = True


class CompagnieInfo(BaseModel):
    id: int
    nom: str
    telephone: Optional[str] = None
    email: Optional[str] = None
    site_web: Optional[str] = None
    logo: Optional[str] = None
    politique_annulation: Optional[str] = None

    class Config:
        from_attributes = True


class TraverseeResponse(BaseModel):
    id: int
    port_depart: PortInfo
    port_arrivee: PortInfo
    bateau: BateauInfo
    compagnie: CompagnieInfo
    date_depart_programme: datetime
    date_arrivee_programmee: datetime
    date_arrivee_estimee: Optional[datetime] = None  # Alias pour date_arrivee_programmee
    duree_estimee_heures: Optional[float] = None  # Calculé automatiquement
    prix_base: float
    prix_promotionnel: Optional[float] = None
    statut: str
    places_disponibles_passagers: int
    places_disponibles_vehicules: int
    places_totales_passagers: Optional[int] = None
    places_totales_vehicules: Optional[int] = None
    places_vendues_passagers: Optional[int] = None
    places_vendues_vehicules: Optional[int] = None
    capitaine_nom: Optional[str] = None
    equipage_nombre: Optional[int] = None
    remarques: Optional[str] = None
    retard_motif: Optional[str] = None

    class Config:
        from_attributes = True

    def model_post_init(self, __context):
        """Calcule les champs dérivés après initialisation"""
        # Alias pour date_arrivee_estimee
        if not self.date_arrivee_estimee:
            self.date_arrivee_estimee = self.date_arrivee_programmee

        # Calcul de la durée estimée en heures
        if not self.duree_estimee_heures and self.date_arrivee_programmee and self.date_depart_programme:
            delta = self.date_arrivee_programmee - self.date_depart_programme
            self.duree_estimee_heures = delta.total_seconds() / 3600
