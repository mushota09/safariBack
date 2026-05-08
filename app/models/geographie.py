from typing import List, TYPE_CHECKING
from sqlalchemy import String, Integer, Float, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.route import Route
    from app.models.voyage import ProgrammeVoyage


class Pays(Base):
    __tablename__ = "pays"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nom: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(3), unique=True, nullable=False, index=True)

    # Relations
    villes: Mapped[List["Ville"]] = relationship("Ville", back_populates="pays", lazy="selectin")


class Ville(Base):
    __tablename__ = "ville"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pays_id: Mapped[int] = mapped_column(Integer, ForeignKey("pays.id"), nullable=False, index=True)
    nom: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Relations
    pays: Mapped["Pays"] = relationship("Pays", back_populates="villes")
    ports: Mapped[List["Port"]] = relationship("Port", back_populates="ville", lazy="selectin")


class Port(Base):
    __tablename__ = "port"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ville_id: Mapped[int] = mapped_column(Integer, ForeignKey("ville.id"), nullable=False, index=True)
    nom: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    adresse: Mapped[str | None] = mapped_column(Text, nullable=True)
    horaires_ouverture: Mapped[str | None] = mapped_column(String(10), nullable=True)
    horaires_fermeture: Mapped[str | None] = mapped_column(String(10), nullable=True)
    capacite_quai: Mapped[int | None] = mapped_column(Integer, nullable=True)
    code_international: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, index=True)
    installations: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relations
    ville: Mapped["Ville"] = relationship("Ville", back_populates="ports")
    routes_depart: Mapped[List["Route"]] = relationship(
        "Route",
        foreign_keys="Route.port_depart_id",
        back_populates="port_depart"
    )
    routes_arrivee: Mapped[List["Route"]] = relationship(
        "Route",
        foreign_keys="Route.port_arrivee_id",
        back_populates="port_arrivee"
    )
    voyages_depart: Mapped[List["ProgrammeVoyage"]] = relationship(
        "ProgrammeVoyage",
        foreign_keys="ProgrammeVoyage.port_depart_id",
        back_populates="port_depart"
    )
    voyages_arrivee: Mapped[List["ProgrammeVoyage"]] = relationship(
        "ProgrammeVoyage",
        foreign_keys="ProgrammeVoyage.port_arrivee_id",
        back_populates="port_arrivee"
    )
