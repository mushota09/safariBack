"""Modèle pour le ticket global de réservation.

Un ticket global unique par réservation contenant:
- QR code signé avec toutes les informations
- Compteurs de passagers/véhicules/colis
- Statut d'embarquement global
"""
from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.reservation import Reservation


class Ticket(Base):
    """Ticket global pour une réservation avec compteurs."""
    __tablename__ = "ticket"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reservation_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("reservation.id"),
        unique=True,
        nullable=False,
        index=True
    )

    numero_ticket: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    qr_payload: Mapped[str] = mapped_column(Text, nullable=False)
    qr_signature: Mapped[str] = mapped_column(String(128), nullable=False)

    # Compteurs (snapshot au moment de création)
    nombre_passagers: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    nombre_vehicules: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )
    nombre_colis: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Génération PDF et envoi
    pdf_genere: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    date_envoi_email: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Embarquement global
    embarque: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    date_embarquement: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relations
    reservation: Mapped["Reservation"] = relationship(
        "Reservation", back_populates="ticket"
    )
