"""Schémas Pydantic pour le module d'embarquement."""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class VerificationIdentite(BaseModel):
    """Vérification d'identité lors de l'embarquement."""
    document_type: str = Field(..., description="Type de document (passeport, CNI, etc.)")
    document_numero: str = Field(..., description="Numéro du document")


class PassagerEmbarquement(BaseModel):
    """Info d'un passager pour l'embarquement."""
    id: int
    nom_complet: str
    email: Optional[str]
    telephone: Optional[str]
    classe_passager: str
    is_principal: bool
    embarque: bool
    date_embarquement: Optional[datetime]
    agent_embarquement_nom: Optional[str]
    identite_verifiee: bool
    document_verifie_type: Optional[str]

    class Config:
        from_attributes = True


class VehiculeEmbarquement(BaseModel):
    """Info d'un véhicule pour l'embarquement."""
    id: int
    immatriculation: str
    marque: Optional[str]
    modele: Optional[str]
    couleur: Optional[str]
    embarque: bool
    date_embarquement: Optional[datetime]
    agent_embarquement_nom: Optional[str]

    class Config:
        from_attributes = True


class ColisEmbarquement(BaseModel):
    """Info d'un colis pour l'embarquement."""
    id: int
    description_marchandises: str
    poids_kg: float
    montant_total: float
    destinataire_nom: Optional[str]
    embarque: bool
    date_embarquement: Optional[datetime]
    agent_embarquement_nom: Optional[str]
    est_absent: bool

    class Config:
        from_attributes = True


class TicketInfo(BaseModel):
    """Information du ticket global."""
    numero_ticket: str
    embarque: bool
    date_embarquement: Optional[datetime]
    nombre_passagers: int
    nombre_vehicules: int
    nombre_colis: int


class ReservationInfo(BaseModel):
    """Information de la réservation."""
    id: int
    reference_reservation: str
    type_reservation: str
    statut_reservation: str
    montant_total: float


class ScanTicketResponse(BaseModel):
    """Réponse au scan d'un ticket global."""
    statut_scan: dict  # Statut du scan (valide, deja_scanne, expire)
    ticket: TicketInfo
    reservation: ReservationInfo
    voyage: dict  # Info du voyage
    passagers: List[PassagerEmbarquement]
    vehicules: List[VehiculeEmbarquement]
    colis: List[ColisEmbarquement]


class MarquerEmbarquementRequest(BaseModel):
    """Requête pour marquer l'embarquement."""
    agent_id: int = Field(..., description="ID de l'agent qui effectue l'embarquement")
    agent_nom: str = Field(..., description="Nom de l'agent pour traçabilité")
    tout: bool = Field(
        default=False,
        description="Si true, embarquer tous les passagers/véhicules/colis"
    )
    passagers_ids: List[int] = Field(
        default_factory=list,
        description="Liste des IDs de passagers à embarquer"
    )
    vehicules_ids: List[int] = Field(
        default_factory=list,
        description="Liste des IDs de véhicules à embarquer"
    )
    colis_ids: List[int] = Field(
        default_factory=list,
        description="Liste des IDs de colis à embarquer"
    )
    verifications_identite: Optional[List[dict]] = Field(
        default=None,
        description="Liste des vérifications d'identité (passager_id + document info)"
    )


class MarquerEmbarquementResponse(BaseModel):
    """Réponse après marquage d'embarquement."""
    status: str
    message: str
    ticket_global_embarque: bool
    date_embarquement: datetime
    passagers_embarques: int
    vehicules_embarques: int
    colis_embarques: int
    total_passagers: int
    total_vehicules: int
    total_colis: int


class AnnulerEmbarquementRequest(BaseModel):
    """Requête pour annuler un embarquement."""
    agent_id: int = Field(..., description="ID de l'agent qui annule")
    agent_nom: str = Field(..., description="Nom de l'agent")
    raison: str = Field(..., min_length=10, description="Raison de l'annulation")
    passagers_ids: List[int] = Field(
        default_factory=list,
        description="IDs des passagers à débarquer"
    )
    vehicules_ids: List[int] = Field(
        default_factory=list,
        description="IDs des véhicules à débarquer"
    )
    colis_ids: List[int] = Field(
        default_factory=list,
        description="IDs des colis à débarquer"
    )


class MarquerAbsentRequest(BaseModel):
    """Requête pour marquer des éléments comme absents (no-show)."""
    agent_id: int = Field(..., description="ID de l'agent")
    agent_nom: str = Field(..., description="Nom de l'agent")
    raison: Optional[str] = Field(None, description="Raison de l'absence")
    passagers_ids: List[int] = Field(default_factory=list)
    colis_ids: List[int] = Field(default_factory=list)


class StatistiquesVoyageResponse(BaseModel):
    """Statistiques d'embarquement pour un voyage."""
    voyage_id: int
    total_reservations: int
    reservations_avec_embarquement: int

    # Passagers
    total_passagers_attendus: int
    passagers_embarques: int
    passagers_absents: int
    passagers_en_attente: int
    taux_embarquement_passagers: float

    # Véhicules
    total_vehicules_attendus: int
    vehicules_embarques: int
    vehicules_en_attente: int
    taux_embarquement_vehicules: float

    # Colis
    total_colis_attendus: int
    colis_embarques: int
    colis_absents: int
    colis_en_attente: int

    # Métadonnées
    derniere_activite: Optional[datetime]
    date_depart_programme: datetime


class ReservationListItem(BaseModel):
    """Item dans la liste des réservations d'un voyage."""
    reservation_id: int
    reference_reservation: str
    numero_ticket: str
    type_reservation: str

    # Compteurs
    nombre_passagers: int
    nombre_vehicules: int
    nombre_colis: int

    # Statuts
    passagers_embarques: int
    vehicules_embarques: int
    colis_embarques: int

    # Flags
    tout_embarque: bool
    partiellement_embarque: bool
    aucun_embarque: bool

    # Utilisateur
    utilisateur_nom: Optional[str]
    utilisateur_email: Optional[str]


class RechercheReservationResponse(BaseModel):
    """Résultat de recherche de réservation."""
    resultats: List[ReservationListItem]
    total: int

