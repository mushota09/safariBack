"""Modèle représentant un passager individuel d'une réservation.

Une `Reservation` peut regrouper plusieurs passagers (mode "moi et les autres",
"les autres" ou réservation de groupe). Chaque passager possède son propre
ticket signé (QR individuel), permettant un embarquement passager par passager
en plus du QR global de la réservation.
"""
from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import (
    String,
    Integer,
    ForeignKey,
    DateTime,
    Boolean,
    Text,
    Enum as SQLEnum,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.reservation import Reservation
    from app.models.compagnie import Chambre, Lit


class StatutPassager(str, enum.Enum):
    en_attente = "en_attente"
    confirme = "confirme"
    annule = "annule"
    embarque = "embarque"


class Passager(Base):
    __tablename__ = "passager"
    __table_args__ = (
        UniqueConstraint("reservation_id", "numero_ticket", name="uq_passager_ticket"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reservation_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("reservation.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    nom_complet: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telephone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    date_naissance: Mapped[str | None] = mapped_column(String(20), nullable=True)
    document_identite: Mapped[str | None] = mapped_column(String(100), nullable=True)
    est_titulaire: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    chambre_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("chambre.id"), nullable=True, index=True)
    lit_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("lit.id"), nullable=True, index=True)

    numero_ticket: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    qr_payload: Mapped[str] = mapped_column(Text, nullable=False)
    qr_signature: Mapped[str] = mapped_column(String(128), nullable=False)

    statut: Mapped[StatutPassager] = mapped_column(
        SQLEnum(StatutPassager),
        default=StatutPassager.en_attente,
        nullable=False,
        index=True,
    )
    embarque: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    date_embarquement: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    date_annulation: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    raison_annulation: Mapped[str | None] = mapped_column(Text, nullable=True)

    date_creation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    # Pas de back_populates direct sur Reservation pour éviter de dupliquer
    # la relation `passagers_details` (qui utilise ReservationPassager).
    # Cette relation reste utilisable par requête explicite.
    reservation: Mapped["Reservation"] = relationship("Reservation")
    chambre: Mapped["Chambre | None"] = relationship("Chambre")
    lit: Mapped["Lit | None"] = relationship("Lit")
