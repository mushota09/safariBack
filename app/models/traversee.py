"""Models pour les traversées (routes maritimes) entre ports."""
from typing import List, TYPE_CHECKING
from datetime import date
from sqlalchemy import Integer, Float, ForeignKey, Date, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.compagnie import CompagnieBateau
    from app.models.geographie import Port
    from app.models.voyage import ProgrammeVoyage
    from app.models.pricing import (
        PricingPassager,
        PricingVehicule,
        PricingColis
    )


class TypeSaison(str, enum.Enum):
    haute = "haute"
    basse = "basse"
    moyenne = "moyenne"


class Traversee(Base):
    """Traversée maritime entre deux ports (anciennement Route)."""
    __tablename__ = "traversee"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    compagnie_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("compagnie_bateau.id"),
        nullable=False,
        index=True
    )
    port_depart_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("port.id"),
        nullable=False,
        index=True
    )
    port_arrivee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("port.id"),
        nullable=False,
        index=True
    )
    prix_base: Mapped[float] = mapped_column(Float, nullable=False)
    distance_milles: Mapped[float | None] = mapped_column(Float, nullable=True)
    duree_estimative: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="Durée en minutes"
    )

    # Relations
    compagnie: Mapped["CompagnieBateau"] = relationship(
        "CompagnieBateau", back_populates="traversees"
    )
    port_depart: Mapped["Port"] = relationship(
        "Port",
        foreign_keys=[port_depart_id],
        back_populates="traversees_depart"
    )
    port_arrivee: Mapped["Port"] = relationship(
        "Port",
        foreign_keys=[port_arrivee_id],
        back_populates="traversees_arrivee"
    )
    voyages: Mapped[List["ProgrammeVoyage"]] = relationship(
        "ProgrammeVoyage", back_populates="route"
    )
    tarifs_saisonniers: Mapped[List["TarifSaisonnier"]] = relationship(
        "TarifSaisonnier",
        back_populates="traversee",
        cascade="all, delete-orphan"
    )

    # Pricing relations
    pricing_passagers: Mapped[List["PricingPassager"]] = relationship(
        "PricingPassager",
        back_populates="traversee",
        cascade="all, delete-orphan"
    )
    pricing_vehicules: Mapped[List["PricingVehicule"]] = relationship(
        "PricingVehicule",
        back_populates="traversee",
        cascade="all, delete-orphan"
    )
    pricing_colis: Mapped[List["PricingColis"]] = relationship(
        "PricingColis",
        back_populates="traversee",
        cascade="all, delete-orphan"
    )


class TarifSaisonnier(Base):
    """Tarifs saisonniers appliqués à une traversée."""
    __tablename__ = "tarif_saisonnier"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    traversee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("traversee.id"),
        nullable=False,
        index=True
    )
    type_saison: Mapped[TypeSaison] = mapped_column(
        SQLEnum(TypeSaison), nullable=False
    )
    date_debut: Mapped[date] = mapped_column(Date, nullable=False)
    date_fin: Mapped[date] = mapped_column(Date, nullable=False)
    coefficient: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    # Relations
    traversee: Mapped["Traversee"] = relationship(
        "Traversee", back_populates="tarifs_saisonniers"
    )
