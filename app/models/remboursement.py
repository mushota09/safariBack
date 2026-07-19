"""Modèle pour la gestion des remboursements."""
from typing import TYPE_CHECKING
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Integer, ForeignKey, DateTime, Text, Numeric, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.reservation import Reservation, ReservationPassager, ReservationVehicule, ReservationColis
    from app.models.utilisateur import Utilisateur
    from app.models.paiement import Paiement


class StatutRemboursement(str, enum.Enum):
    """Statuts d'une demande de remboursement."""
    en_attente = "en_attente"      # Soumise, attend validation
    approuve = "approuve"           # Approuvée, attend traitement
    rejete = "rejete"               # Rejetée
    rembourse = "rembourse"         # Effectué
    annule = "annule"               # Annulée par client


class MethodeRemboursement(str, enum.Enum):
    """Méthodes de remboursement."""
    retour_mode_paiement = "retour_mode_paiement"  # Carte/Mobile Money
    virement = "virement"                          # Virement bancaire
    especes = "especes"                            # Au guichet


class Remboursement(Base):
    """Demande de remboursement d'une réservation."""
    __tablename__ = "remboursement"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Référence unique
    reference_remboursement: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )

    # Relations
    reservation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("reservation.id"), nullable=False, index=True
    )
    paiement_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("paiement.id"), nullable=False
    )

    # Élément cible (null = remboursement complet de la réservation)
    passager_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("reservation_passager.id"), nullable=True, index=True
    )
    vehicule_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("reservation_vehicule.id"), nullable=True, index=True
    )
    colis_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("reservation_colis.id"), nullable=True, index=True
    )

    # Montants
    montant_paye: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    pourcentage_frais: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), nullable=False
    )
    montant_frais: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    montant_remboursement: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )

    # Dates et délai
    date_demande: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    date_depart_voyage: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    delai_heures: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False
    )

    # Statut
    statut: Mapped[StatutRemboursement] = mapped_column(
        String(50), nullable=False, index=True
    )

    # Raisons
    raison_demande: Mapped[str] = mapped_column(Text, nullable=False)
    raison_rejet: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Approbation
    approuve_par_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("utilisateur.id"), nullable=True
    )
    approuve_par_nom: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )
    date_approbation: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Remboursement effectué
    rembourse_par_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("utilisateur.id"), nullable=True
    )
    rembourse_par_nom: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )
    date_remboursement: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    numero_transaction: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )

    # Méthode de remboursement
    methode_remboursement: Mapped[MethodeRemboursement] = mapped_column(
        String(50), nullable=False
    )
    details_remboursement: Mapped[dict | None] = mapped_column(
        JSON, nullable=True
    )

    # Métadonnées
    date_creation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    date_modification: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relations ORM
    reservation: Mapped["Reservation"] = relationship("Reservation")
    paiement: Mapped["Paiement"] = relationship("Paiement")
    passager: Mapped["ReservationPassager | None"] = relationship("ReservationPassager")
    vehicule: Mapped["ReservationVehicule | None"] = relationship("ReservationVehicule")
    colis: Mapped["ReservationColis | None"] = relationship("ReservationColis")
