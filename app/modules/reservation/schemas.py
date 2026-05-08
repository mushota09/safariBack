from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.models.reservation import TypeReservation, TypeVehicule, StatutReservation


class ReservationCreate(BaseModel):
    voyage_id: int
    type_reservation: TypeReservation
    niveau_id: Optional[int] = None
    chambre_id: Optional[int] = None
    lit_id: Optional[int] = None
    nombre_passagers: int = Field(1, ge=1)
    vehicule_inclus: bool = False
    type_vehicule: Optional[TypeVehicule] = None
    immatriculation_vehicule: Optional[str] = None


class ReservationUpdate(BaseModel):
    nombre_passagers: Optional[int] = None
    vehicule_inclus: Optional[bool] = None
    type_vehicule: Optional[TypeVehicule] = None
    immatriculation_vehicule: Optional[str] = None


class ReservationResponse(BaseModel):
    id: int
    reference_reservation: str
    utilisateur_id: int
    voyage_id: int
    type_reservation: TypeReservation
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

    class Config:
        from_attributes = True


class ReservationCancellation(BaseModel):
    raison: Optional[str] = None
