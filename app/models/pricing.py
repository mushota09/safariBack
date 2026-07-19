"""Models pour le système de pricing des réservations."""
from typing import TYPE_CHECKING
from datetime import datetime
import enum
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.traversee import Traversee


class ClassePassager(str, enum.Enum):
    """Classes de service pour les passagers."""
    standard = "standard"  # Économique
    premium = "premium"    # Premium
    vip = "vip"           # VIP


class PricingPassager(Base):
    """Tarification des passagers par traversée avec 3 classes de service."""
    __tablename__ = "pricing_passager"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    traversee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("traversee.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    prix_standard: Mapped[float] = mapped_column(
        Float, nullable=False, comment="Classe économique"
    )
    prix_premium: Mapped[float] = mapped_column(
        Float, nullable=False, comment="Classe premium"
    )
    prix_vip: Mapped[float] = mapped_column(
        Float, nullable=False, comment="Classe VIP"
    )
    actif: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    date_creation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    # Relation
    traversee: Mapped["Traversee"] = relationship(
        "Traversee", back_populates="pricing_passagers"
    )


class TypeVehicule(Base):
    """Types de véhicules disponibles pour le transport."""
    __tablename__ = "type_vehicule"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nom: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    longueur_max_metres: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )
    largeur_max_metres: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )
    hauteur_max_metres: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )
    poids_max_tonnes: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )
    actif: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    date_creation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    # Relation
    pricings: Mapped[list["PricingVehicule"]] = relationship(
        "PricingVehicule", back_populates="type_vehicule"
    )


class PricingVehicule(Base):
    """Tarification des véhicules par type et par traversée."""
    __tablename__ = "pricing_vehicule"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    traversee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("traversee.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    type_vehicule_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("type_vehicule.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    prix: Mapped[float] = mapped_column(Float, nullable=False)
    actif: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    date_creation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    # Relations
    traversee: Mapped["Traversee"] = relationship(
        "Traversee", back_populates="pricing_vehicules"
    )
    type_vehicule: Mapped["TypeVehicule"] = relationship(
        "TypeVehicule", back_populates="pricings"
    )


class PricingColis(Base):
    """Tarification des colis par traversée."""
    __tablename__ = "pricing_colis"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    traversee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("traversee.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    prix_par_kg: Mapped[float] = mapped_column(Float, nullable=False)
    actif: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    date_creation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )

    # Relation
    traversee: Mapped["Traversee"] = relationship(
        "Traversee", back_populates="pricing_colis"
    )
