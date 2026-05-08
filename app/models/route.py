from typing import List, TYPE_CHECKING
from datetime import date
from sqlalchemy import String, Integer, Float, ForeignKey, Date, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.compagnie import CompagnieBateau
    from app.models.geographie import Port
    from app.models.voyage import ProgrammeVoyage


class TypeSaison(str, enum.Enum):
    haute = "haute"
    basse = "basse"
    moyenne = "moyenne"


class Route(Base):
    __tablename__ = "route"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    compagnie_id: Mapped[int] = mapped_column(Integer, ForeignKey("compagnie_bateau.id"), nullable=False, index=True)
    port_depart_id: Mapped[int] = mapped_column(Integer, ForeignKey("port.id"), nullable=False, index=True)
    port_arrivee_id: Mapped[int] = mapped_column(Integer, ForeignKey("port.id"), nullable=False, index=True)
    prix_base: Mapped[float] = mapped_column(Float, nullable=False)
    distance_milles: Mapped[float | None] = mapped_column(Float, nullable=True)
    duree_estimative: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="Durée en minutes")

    # Relations
    compagnie: Mapped["CompagnieBateau"] = relationship("CompagnieBateau", back_populates="routes")
    port_depart: Mapped["Port"] = relationship(
        "Port",
        foreign_keys=[port_depart_id],
        back_populates="routes_depart"
    )
    port_arrivee: Mapped["Port"] = relationship(
        "Port",
        foreign_keys=[port_arrivee_id],
        back_populates="routes_arrivee"
    )
    voyages: Mapped[List["ProgrammeVoyage"]] = relationship("ProgrammeVoyage", back_populates="route")
    tarifs_saisonniers: Mapped[List["TarifSaisonnier"]] = relationship(
        "TarifSaisonnier",
        back_populates="route",
        cascade="all, delete-orphan"
    )


class TarifSaisonnier(Base):
    __tablename__ = "tarif_saisonnier"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    route_id: Mapped[int] = mapped_column(Integer, ForeignKey("route.id"), nullable=False, index=True)
    type_saison: Mapped[TypeSaison] = mapped_column(SQLEnum(TypeSaison), nullable=False)
    date_debut: Mapped[date] = mapped_column(Date, nullable=False)
    date_fin: Mapped[date] = mapped_column(Date, nullable=False)
    coefficient: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    # Relations
    route: Mapped["Route"] = relationship("Route", back_populates="tarifs_saisonniers")
