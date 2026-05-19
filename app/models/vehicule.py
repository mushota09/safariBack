"""Modèle représentant un véhicule rattaché à une réservation.

Permet de stocker tous les véhicules d'une réservation de groupe (1..N).
"""
from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, Text, Enum as SQLEnum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.reservation import TypeVehicule

if TYPE_CHECKING:
    from app.models.reservation import Reservation


class VehiculeReservation(Base):
    __tablename__ = "vehicule_reservation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reservation_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("reservation.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    type_vehicule: Mapped[TypeVehicule] = mapped_column(SQLEnum(TypeVehicule), nullable=False)
    immatriculation: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    marque: Mapped[str | None] = mapped_column(String(100), nullable=True)
    modele: Mapped[str | None] = mapped_column(String(100), nullable=True)
    couleur: Mapped[str | None] = mapped_column(String(50), nullable=True)
    annee: Mapped[str | None] = mapped_column(String(10), nullable=True)
    proprietaire_nom: Mapped[str | None] = mapped_column(String(200), nullable=True)
    proprietaire_telephone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    numero_ticket: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    qr_payload: Mapped[str] = mapped_column(Text, nullable=False)
    qr_signature: Mapped[str] = mapped_column(String(128), nullable=False)
    embarque: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    date_embarquement: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    annule: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    date_annulation: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Pas de back_populates direct (cf. note dans Passager) — la relation
    # `vehicules_details` couvre déjà le besoin côté Reservation.
    reservation: Mapped["Reservation"] = relationship("Reservation")
