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
