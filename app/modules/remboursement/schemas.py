"""Schémas Pydantic pour le module de remboursement."""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Dict, Any, List
from decimal import Decimal


class DemandeRemboursementCreate(BaseModel):
    """Demande de remboursement par un client."""
    reference_reservation: str = Field(..., description="Référence de la réservation à rembourser")
    passager_ids: Optional[List[int]] = Field(None, description="IDs des passagers à rembourser")
    vehicule_ids: Optional[List[int]] = Field(None, description="IDs des véhicules à rembourser")
    colis_ids: Optional[List[int]] = Field(None, description="IDs des colis à rembourser")
    raison_demande: str = Field(..., min_length=20, description="Raison de la demande")
    methode_remboursement: str = Field(..., description="retour_mode_paiement, virement, especes")
    details_remboursement: Optional[Dict[str, Any]] = Field(None, description="Détails (IBAN, numéro mobile money, etc.)")


class DemandeRemboursementResponse(BaseModel):
    """Réponse après création de demande."""
    reference_remboursement: str
    statut: str
    montant_paye: float
    pourcentage_frais: float
    montant_frais: float
    montant_remboursement: float
    delai_heures: float
    passager_id: Optional[int] = None
    vehicule_id: Optional[int] = None
    colis_id: Optional[int] = None
    message: str


class RemboursementListItem(BaseModel):
    """Item dans la liste des remboursements."""
    reference_remboursement: str
    reservation_reference: str
    statut: str
    montant_paye: float
    montant_remboursement: float
    pourcentage_frais: float
    date_demande: datetime
    raison_demande: str
    raison_rejet: Optional[str]
    date_remboursement: Optional[datetime]
    voyage_id: int
    date_depart: datetime
    passager_id: Optional[int] = None
    vehicule_id: Optional[int] = None
    colis_id: Optional[int] = None


class RemboursementAdminListItem(BaseModel):
    """Item pour liste admin."""
    reference_remboursement: str
    reservation_reference: str
    statut: str
    montant_paye: float
    montant_remboursement: float
    date_demande: datetime
    date_depart_voyage: datetime
    passager_id: Optional[int] = None
    vehicule_id: Optional[int] = None
    colis_id: Optional[int] = None


class RemboursementListResponse(BaseModel):
    """Réponse liste admin."""
    demandes: list[RemboursementAdminListItem]
    total: int
    page: int
    pages_total: int


class ApprouverRejeterRequest(BaseModel):
    """Requête pour approuver/rejeter."""
    approuve: bool
    raison_rejet: Optional[str] = Field(None, min_length=10)


class MarquerRemboursementRequest(BaseModel):
    """Requête pour marquer comme remboursé."""
    numero_transaction: str = Field(..., min_length=5)
    notes: Optional[str] = None


class StatistiquesRemboursementResponse(BaseModel):
    """Statistiques des remboursements."""
    periode: Dict[str, Optional[datetime]]
    total_demandes: int
    par_statut: Dict[str, int]
    montants: Dict[str, float]
    par_delai: Dict[str, int]
    taux_remboursement: float
