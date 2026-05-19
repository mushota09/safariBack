from typing import List, TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, Boolean, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.utilisateur import Utilisateur
    from app.models.voyage import ProgrammeVoyage
    from app.models.compagnie import Niveau, Chambre, Lit
    from app.models.paiement import Paiement
    from app.models.ticket import Ticket
    from app.models.passager import Passager
    from app.models.vehicule import VehiculeReservation


class ReservationMode(str, enum.Enum):
    moi_meme = "moi_meme"
    moi_et_autres = "moi_et_autres"
    les_autres = "les_autres"
    vehicule = "vehicule"


class TypeReservation(str, enum.Enum):
    passager = "passager"
    vehicule = "vehicule"
    mixte = "mixte"


class TypeVehicule(str, enum.Enum):
    voiture = "voiture"
    moto = "moto"
    camion = "camion"
    bus = "bus"


class StatutReservation(str, enum.Enum):
    en_attente = "en_attente"
    confirme = "confirme"
    annule = "annule"
    termine = "termine"
    no_show = "no_show"


class Reservation(Base):
    __tablename__ = "reservation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reference_reservation: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    utilisateur_id: Mapped[int] = mapped_column(Integer, ForeignKey("utilisateur.id"), nullable=False, index=True)
    voyage_id: Mapped[int] = mapped_column(Integer, ForeignKey("programme_voyage.id"), nullable=False, index=True)

    type_reservation: Mapped[TypeReservation] = mapped_column(SQLEnum(TypeReservation), nullable=False)
    reservation_mode: Mapped[ReservationMode | None] = mapped_column(
        SQLEnum(ReservationMode), nullable=True, index=True
    )
    niveau_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("niveau.id"), nullable=True, index=True)
    chambre_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("chambre.id"), nullable=True, index=True)
    lit_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("lit.id"), nullable=True, index=True)

    montant_total: Mapped[float] = mapped_column(Float, nullable=False)
    date_reservation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False
    )
    date_expiration_paiement: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    nombre_passagers: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    vehicule_inclus: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    type_vehicule: Mapped[TypeVehicule | None] = mapped_column(SQLEnum(TypeVehicule), nullable=True)
    immatriculation_vehicule: Mapped[str | None] = mapped_column(String(50), nullable=True)

    statut_reservation: Mapped[StatutReservation] = mapped_column(
        SQLEnum(StatutReservation),
        default=StatutReservation.en_attente,
        nullable=False,
        index=True
    )

    frais_annulation: Mapped[float | None] = mapped_column(Float, nullable=True)
    date_annulation: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    raison_annulation: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relations
    utilisateur: Mapped["Utilisateur"] = relationship("Utilisateur", back_populates="reservations")
    voyage: Mapped["ProgrammeVoyage"] = relationship("ProgrammeVoyage", back_populates="reservations")
    niveau: Mapped["Niveau | None"] = relationship("Niveau", back_populates="reservations")
    chambre: Mapped["Chambre | None"] = relationship("Chambre", back_populates="reservations")
    lit: Mapped["Lit | None"] = relationship("Lit", back_populates="reservations")
    paiement: Mapped["Paiement | None"] = relationship("Paiement", back_populates="reservation", uselist=False)
    ticket: Mapped["Ticket | None"] = relationship("Ticket", back_populates="reservation", uselist=False)
    passagers: Mapped[List["Passager"]] = relationship(
        "Passager",
        back_populates="reservation",
        cascade="all, delete-orphan",
    )
    vehicules: Mapped[List["VehiculeReservation"]] = relationship(
        "VehiculeReservation",
        back_populates="reservation",
        cascade="all, delete-orphan",
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


class ReservationPassager(Base):
    __tablename__ = "reservation_passager"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reservation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("reservation.id", ondelete="CASCADE"), nullable=False, index=True
    )
    nom_complet: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telephone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    chambre_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("chambre.id"), nullable=True, index=True
    )
    lit_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("lit.id"), nullable=True, index=True
    )
    is_principal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    date_enregistrement: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
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
    type_vehicule: Mapped[TypeVehicule] = mapped_column(SQLEnum(TypeVehicule), nullable=False)
    immatriculation: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    marque: Mapped[str | None] = mapped_column(String(100), nullable=True)
    modele: Mapped[str | None] = mapped_column(String(100), nullable=True)
    couleur: Mapped[str | None] = mapped_column(String(50), nullable=True)
    annee: Mapped[str | None] = mapped_column(String(10), nullable=True)
    proprietaire_nom: Mapped[str | None] = mapped_column(String(200), nullable=True)
    proprietaire_telephone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    date_enregistrement: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    reservation: Mapped["Reservation"] = relationship(
        "Reservation", back_populates="vehicules_details"
    )
