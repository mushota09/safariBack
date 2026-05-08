from pydantic import BaseModel
from datetime import datetime
from typing import Optional


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
    capacite_vehicules: Optional[int]

    class Config:
        from_attributes = True


class CompagnieInfo(BaseModel):
    id: int
    nom: str

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
    prix_base: float
    prix_promotionnel: Optional[float]
    statut: str
    places_disponibles_passagers: int
    places_disponibles_vehicules: int

    class Config:
        from_attributes = True
