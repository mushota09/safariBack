from typing import List, TYPE_CHECKING, Dict, Any
from datetime import datetime
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.compagnie import CompagnieBateau, Bateau
    from app.models.geographie import Port
    from app.models.route import Route
    from app.models.reservation import Reservation


class StatutVoyage(str, enum.Enum):
    programme = "programme"
    confirme = "confirme"
    annule = "annule"
    retarde = "retarde"
    complet = "complet"
    termine = "termine"


class ProgrammeVoyage(Base):
    __tablename__ = "programme_voyage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bateau_id: Mapped[int] = mapped_column(Integer, ForeignKey("bateau.id"), nullable=False, index=True)
    compagnie_id: Mapped[int] = mapped_column(Integer, ForeignKey("compagnie_bateau.id"), nullable=False, index=True)
    port_depart_id: Mapped[int] = mapped_column(Integer, ForeignKey("port.id"), nullable=False, index=True)
    port_arrivee_id: Mapped[int] = mapped_column(Integer, ForeignKey("port.id"), nullable=False, index=True)
    route_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("route.id"), nullable=True, index=True)

    date_depart_reel: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    date_arrivee_reelle: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    date_depart_programme: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    date_arrivee_programmee: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    prix_base: Mapped[float] = mapped_column(Float, nullable=False)
    statut: Mapped[StatutVoyage] = mapped_column(
        SQLEnum(StatutVoyage),
        default=StatutVoyage.programme,
        nullable=False,
        index=True
    )

    places_vendues_passagers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    places_vendues_vehicules: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    places_disponibles_passagers: Mapped[int] = mapped_column(Integer, nullable=False)
    places_disponibles_vehicules: Mapped[int] = mapped_column(Integer, nullable=False)

    prix_promotionnel: Mapped[float | None] = mapped_column(Float, nullable=True)
    reduction_groupe: Mapped[float | None] = mapped_column(Float, nullable=True)

    capitaine_nom: Mapped[str | None] = mapped_column(String(200), nullable=True)
    equipage_nombre: Mapped[int | None] = mapped_column(Integer, nullable=True)
    remarques: Mapped[str | None] = mapped_column(Text, nullable=True)
    retard_motif: Mapped[str | None] = mapped_column(Text, nullable=True)
    annulation_motif: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relations
    bateau: Mapped["Bateau"] = relationship("Bateau", back_populates="voyages")
    compagnie: Mapped["CompagnieBateau"] = relationship("CompagnieBateau", back_populates="voyages")
    port_depart: Mapped["Port"] = relationship(
        "Port",
        foreign_keys=[port_depart_id],
        back_populates="voyages_depart"
    )
    port_arrivee: Mapped["Port"] = relationship(
        "Port",
        foreign_keys=[port_arrivee_id],
        back_populates="voyages_arrivee"
    )
    route: Mapped["Route | None"] = relationship("Route", back_populates="voyages")
    reservations: Mapped[List["Reservation"]] = relationship("Reservation", back_populates="voyage")

    def get_disponibilite(self) -> Dict[str, Any]:
        """Retourne les disponibilités du voyage"""
        return {
            "voyage_id": self.id,
            "places_disponibles_passagers": self.places_disponibles_passagers - self.places_vendues_passagers,
            "places_disponibles_vehicules": self.places_disponibles_vehicules - self.places_vendues_vehicules,
            "places_totales_passagers": self.places_disponibles_passagers,
            "places_totales_vehicules": self.places_disponibles_vehicules,
            "places_vendues_passagers": self.places_vendues_passagers,
            "places_vendues_vehicules": self.places_vendues_vehicules,
            "statut": self.statut.value,
            "complet": (
                self.places_vendues_passagers >= self.places_disponibles_passagers or
                self.statut == StatutVoyage.complet
            )
        }
