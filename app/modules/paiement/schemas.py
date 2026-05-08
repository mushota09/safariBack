from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.models.paiement import ModePaiement, StatutPaiement


class PaiementCreate(BaseModel):
    reservation_id: int
    mode_paiement: ModePaiement

    # Pour carte bancaire
    numero_carte: Optional[str] = None
    cvv: Optional[str] = None
    date_expiration: Optional[str] = None

    # Pour Mobile Money
    telephone_mobile: Optional[str] = None
    operateur_mobile: Optional[str] = None

    # Pour virement
    iban: Optional[str] = None

    # Informations client
    ip_client: Optional[str] = None
    user_agent: Optional[str] = None


class PaiementResponse(BaseModel):
    id: int
    reservation_id: int
    montant: float
    mode_paiement: ModePaiement
    statut: StatutPaiement
    reference_transaction: str
    date_paiement: Optional[datetime]
    telephone_mobile: Optional[str]
    operateur_mobile: Optional[str]
    derniers_chiffres_carte: Optional[str]
    message_erreur: Optional[str]

    class Config:
        from_attributes = True
