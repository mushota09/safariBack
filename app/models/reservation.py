"""Models pour les réservations et leurs détails."""
from typing import List, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, Boolean, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.utilisateur import Utilisateur
    from app.models.voyage import ProgrammeVoyage
    from app.models.paiement import Paiement
    from app.models.ticket import Ticket
    from app.models.pricing import TypeVehicule


class ClassePassager(str, enum.Enum):
    """Classes de service pour les passagers."""
    standard = "standard"  # Économique
    premium = "premium"    # Premium
    vip = "vip"           # VIP


class TypeReservation(str, enum.Enum):
    passager = "passager"
    vehicule = "vehicule"
    colis = "colis"


class StatutReservation(str, enum.Enum):
    en_attente = "en attente"
    confirme = "confirme"
    annule = "annule"
    termine = "termine"


class Reservation(Base):
    __tablename__ = "reservation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reference_reservation: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    utilisateur_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("utilisateur.id"), nullable=False, index=True
    )
    voyage_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("programme_voyage.id"), nullable=False, index=True
    )

    type_reservation: Mapped[TypeReservation] = mapped_column(
        SQLEnum(TypeReservation), nullable=False
    )

    montant_total: Mapped[float] = mapped_column(Float, nullable=False)
    date_reservation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )
    date_expiration_paiement: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    statut_reservation: Mapped[StatutReservation] = mapped_column(
        SQLEnum(StatutReservation),
        default=StatutReservation.en_attente,
        nullable=False,
        index=True
    )

    frais_annulation: Mapped[float | None] = mapped_column(Float, nullable=True)
    date_annulation: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    raison_annulation: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Distinction front office (auto-réservation) vs back office (agent)
    is_front: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Contact expéditeur/destinataire
    expediteur_nom: Mapped[str | None] = mapped_column(String(200), nullable=True)
    expediteur_telephone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    destinataire_nom: Mapped[str | None] = mapped_column(String(200), nullable=True)
    destinataire_telephone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Relations
    utilisateur: Mapped["Utilisateur"] = relationship(
        "Utilisateur", back_populates="reservations"
    )
    voyage: Mapped["ProgrammeVoyage"] = relationship(
        "ProgrammeVoyage", back_populates="reservations"
    )
    paiement: Mapped["Paiement | None"] = relationship(
        "Paiement", back_populates="reservation", uselist=False
    )
    ticket: Mapped["Ticket | None"] = relationship(
        "Ticket", back_populates="reservation", uselist=False
    )
    passagers_details: Mapped[List["ReservationPassager"]] = relationship(
        "ReservationPassager",
        back_populates="reservation",
        cascade="all, delete-orphan",
    )
    vehicules_details: Mapped[List["ReservationVehicule"]] = relationship(
        "ReservationVehicule",
        back_populates="reservation",
        cascade="all, delete-orphan",
    )
    colis_details: Mapped[List["ReservationColis"]] = relationship(
        "ReservationColis",
        back_populates="reservation",
        cascade="all, delete-orphan",
    )

    @property
    def nombre_passagers(self) -> int:
        """Nombre de passagers dans la réservation."""
        return len(self.passagers_details) if self.passagers_details else 0

    @property
    def nombre_vehicules(self) -> int:
        """Nombre de véhicules dans la réservation."""
        return len(self.vehicules_details) if self.vehicules_details else 0

    @property
    def nombre_colis(self) -> int:
        """Nombre de colis dans la réservation."""
        return len(self.colis_details) if self.colis_details else 0


class ReservationPassager(Base):
    __tablename__ = "reservation_passager"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reservation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("reservation.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    nom_complet: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telephone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    date_naissance: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )
    numero_identite: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    classe_passager: Mapped[ClassePassager] = mapped_column(
        SQLEnum(ClassePassager),
        default=ClassePassager.standard,
        nullable=False,
        index=True
    )
    niveau_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("niveau.id"), nullable=True, index=True
    )
    chambre_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("chambre.id"), nullable=True, index=True
    )
    lit_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("lit.id"), nullable=True, index=True
    )
    chaise_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("chaise.id"), nullable=True, index=True
    )
    is_principal: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    date_enregistrement: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    montant: Mapped[float | None] = mapped_column(Float, nullable=True)
    rembourse: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    frais_annulation: Mapped[float | None] = mapped_column(Float, nullable=True)
    date_annulation: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    raison_annulation: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Embarquement
    embarque: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    date_embarquement: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    agent_embarquement_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("utilisateur.id"), nullable=True, index=True
    )
    agent_embarquement_nom: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )

    # Vérification identité
    identite_verifiee: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    document_verifie_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )
    document_verifie_numero: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )

    reservation: Mapped["Reservation"] = relationship(
        "Reservation", back_populates="passagers_details"
    )


class ReservationVehicule(Base):
    __tablename__ = "reservation_vehicule"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reservation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("reservation.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type_vehicule_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("type_vehicule.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    immatriculation: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    marque: Mapped[str | None] = mapped_column(String(100), nullable=True)
    modele: Mapped[str | None] = mapped_column(String(100), nullable=True)
    couleur: Mapped[str | None] = mapped_column(String(50), nullable=True)
    annee: Mapped[str | None] = mapped_column(String(10), nullable=True)
    date_enregistrement: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    montant: Mapped[float | None] = mapped_column(Float, nullable=True)
    rembourse: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    frais_annulation: Mapped[float | None] = mapped_column(Float, nullable=True)
    date_annulation: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    raison_annulation: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Embarquement
    embarque: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    date_embarquement: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    agent_embarquement_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("utilisateur.id"), nullable=True, index=True
    )
    agent_embarquement_nom: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )

    # Relations
    reservation: Mapped["Reservation"] = relationship(
        "Reservation", back_populates="vehicules_details"
    )
    type_vehicule: Mapped["TypeVehicule"] = relationship("TypeVehicule")


class ReservationColis(Base):
    __tablename__ = "reservation_colis"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reservation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("reservation.id", ondelete="CASCADE"), nullable=False, index=True
    )
    description_marchandises: Mapped[str] = mapped_column(Text, nullable=False)
    poids_kg: Mapped[float] = mapped_column(Float, nullable=False)
    montant_par_kg: Mapped[float] = mapped_column(Float, nullable=False)
    montant_total: Mapped[float] = mapped_column(Float, nullable=False)
    date_enregistrement: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    rembourse: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    frais_annulation: Mapped[float | None] = mapped_column(Float, nullable=True)
    date_annulation: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    raison_annulation: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Embarquement
    embarque: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    date_embarquement: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    agent_embarquement_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("utilisateur.id"), nullable=True, index=True
    )
    agent_embarquement_nom: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )

    # Gestion des absents
    est_absent: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    date_marquage_absent: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    raison_absence: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )

    reservation: Mapped["Reservation"] = relationship(
        "Reservation", back_populates="colis_details"
    )
