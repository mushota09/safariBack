from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class EmbarquementResponse(BaseModel):
    status: str
    message: str
    numero_ticket: Optional[str] = None
    reference_reservation: Optional[str] = None
    nombre_passagers: Optional[int] = None
    vehicule_inclus: Optional[bool] = None
    date_embarquement: Optional[datetime] = None


class TicketVerificationResponse(BaseModel):
    numero_ticket: str
    reference_reservation: str
    statut_reservation: str
    embarque: bool
    date_embarquement: Optional[datetime]
    nombre_passagers: int
    vehicule_inclus: bool
