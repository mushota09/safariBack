from typing import List, TYPE_CHECKING
from datetime import date
from sqlalchemy import String, Integer, Float, ForeignKey, Text, Boolean, Date, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.traversee import Traversee
    from app.models.voyage import ProgrammeVoyage
    from app.models.promotion import Promotion
    from app.models.image_bateau import ImageBateau
    from app.models.pricing import TypeVehicule
    from app.models.equipage import MembreEquipage


class TypeLit(str, enum.Enum):
    simple = "simple"
    double = "double"
    superpose = "superpose"

class TypeChambre(str, enum.Enum):
    mixte = "mixte"
    luxe = "luxe"



class CompagnieBateau(Base):
    __tablename__ = "compagnie_bateau"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nom: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    telephone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    adresse_siege: Mapped[str | None] = mapped_column(Text, nullable=True)
    site_web: Mapped[str | None] = mapped_column(String(255), nullable=True)
    logo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    numero_licence: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    numero_registre: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pays_immatriculation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    date_creation_compagnie: Mapped[date | None] = mapped_column(Date, nullable=True)
    taux_commission: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    politique_annulation: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Code utilisé par les admins de la compagnie au login backoffice.
    code_admin: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True, index=True)

    # Relations
    bateaux: Mapped[List["Bateau"]] = relationship("Bateau", back_populates="compagnie")
    types_bateau: Mapped[List["TypeBateau"]] = relationship("TypeBateau", back_populates="compagnie")
    traversees: Mapped[List["Traversee"]] = relationship("Traversee", back_populates="compagnie")
    voyages: Mapped[List["ProgrammeVoyage"]] = relationship("ProgrammeVoyage", back_populates="compagnie")
    promotions: Mapped[List["Promotion"]] = relationship("Promotion", back_populates="compagnie")


class TypeBateau(Base):
    __tablename__ = "type_bateau"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    compagnie_id: Mapped[int] = mapped_column(Integer, ForeignKey("compagnie_bateau.id"), nullable=False, index=True)
    nom: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    capacite: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relations
    compagnie: Mapped["CompagnieBateau"] = relationship("CompagnieBateau", back_populates="types_bateau")
    bateaux: Mapped[List["Bateau"]] = relationship("Bateau", back_populates="type_bateau")


class Bateau(Base):
    __tablename__ = "bateau"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    compagnie_id: Mapped[int] = mapped_column(Integer, ForeignKey("compagnie_bateau.id"), nullable=False, index=True)
    type_bateau_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("type_bateau.id"), nullable=True, index=True)
    nom: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    immatriculation: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    capacite_passagers: Mapped[int] = mapped_column(Integer, nullable=False)
    vitesse_croisiere: Mapped[float | None] = mapped_column(Float, nullable=True)
    wifi: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    restaurant: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    boutique: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    jeux: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    salon_coiffure: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    en_maintenance: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_accepted_vehicule: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    date_derniere_revision: Mapped[date | None] = mapped_column(Date, nullable=True)
    date_prochaine_revision: Mapped[date | None] = mapped_column(Date, nullable=True)
    photo_principale: Mapped[str | None] = mapped_column(String(500), nullable=True)
    plan_bateau: Mapped[str | None] = mapped_column(String(500), nullable=True)
    longueur: Mapped[float | None] = mapped_column(Float, nullable=True)
    largeur: Mapped[float | None] = mapped_column(Float, nullable=True)
    tonnage: Mapped[float | None] = mapped_column(Float, nullable=True)
    tirant_eau: Mapped[float | None] = mapped_column(Float, nullable=True)
    puissance_moteur: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Relations
    compagnie: Mapped["CompagnieBateau"] = relationship("CompagnieBateau", back_populates="bateaux")
    type_bateau: Mapped["TypeBateau | None"] = relationship("TypeBateau", back_populates="bateaux")
    niveaux: Mapped[List["Niveau"]] = relationship("Niveau", back_populates="bateau", cascade="all, delete-orphan")
    voyages: Mapped[List["ProgrammeVoyage"]] = relationship("ProgrammeVoyage", back_populates="bateau")
    images: Mapped[List["ImageBateau"]] = relationship(
        "ImageBateau",
        back_populates="bateau",
        cascade="all, delete-orphan",
        order_by="ImageBateau.ordre",
    )
    capacites_vehicules: Mapped[List["BateauCapaciteVehicule"]] = relationship(
        "BateauCapaciteVehicule",
        back_populates="bateau",
        cascade="all, delete-orphan"
    )
    equipages: Mapped[List["MembreEquipage"]] = relationship(
        "MembreEquipage",
        back_populates="bateau",
        cascade="all, delete-orphan"
    )


class BateauCapaciteVehicule(Base):
    """Capacité d'un bateau par type de véhicule."""
    __tablename__ = "bateau_capacite_vehicule"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bateau_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("bateau.id"), nullable=False, index=True
    )
    type_vehicule_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("type_vehicule.id"), nullable=False, index=True
    )
    capacite: Mapped[int] = mapped_column(Integer, nullable=False)

    # Relations
    bateau: Mapped["Bateau"] = relationship("Bateau", back_populates="capacites_vehicules")
    type_vehicule: Mapped["TypeVehicule"] = relationship("TypeVehicule")


class Niveau(Base):
    __tablename__ = "niveau"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bateau_id: Mapped[int] = mapped_column(Integer, ForeignKey("bateau.id"), nullable=False, index=True)
    numero_niveau: Mapped[int] = mapped_column(Integer, nullable=False)
    nom: Mapped[str] = mapped_column(String(100), nullable=False)
    multiplicateur_prix: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relations
    bateau: Mapped["Bateau"] = relationship("Bateau", back_populates="niveaux")
    chambres: Mapped[List["Chambre"]] = relationship("Chambre", back_populates="niveau", cascade="all, delete-orphan")
    reservations: Mapped[List["Reservation"]] = relationship("Reservation", back_populates="niveau")


class Chambre(Base):
    __tablename__ = "chambre"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    niveau_id: Mapped[int] = mapped_column(Integer, ForeignKey("niveau.id"), nullable=False, index=True)
    numero_chambre: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    prix_base: Mapped[float] = mapped_column(Float, nullable=False)
    type_chambre: Mapped[TypeChambre] = mapped_column(SQLEnum(TypeChambre), nullable=False)
    fenetre: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    salle_de_bain: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    disponible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relations
    niveau: Mapped["Niveau"] = relationship("Niveau", back_populates="chambres")
    lits: Mapped[List["Lit"]] = relationship("Lit", back_populates="chambre", cascade="all, delete-orphan")
    reservations: Mapped[List["Reservation"]] = relationship("Reservation", back_populates="chambre")


class Lit(Base):
    __tablename__ = "lit"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    chambre_id: Mapped[int] = mapped_column(Integer, ForeignKey("chambre.id"), nullable=False, index=True)
    numero_lit: Mapped[str] = mapped_column(String(20), nullable=False)
    disponible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    prix_supplementaire: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    type_lit: Mapped[TypeLit] = mapped_column(SQLEnum(TypeLit), nullable=False)
    taille: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Relations
    chambre: Mapped["Chambre"] = relationship("Chambre", back_populates="lits")
    reservations: Mapped[List["Reservation"]] = relationship("Reservation", back_populates="lit")

class Chaise(Base):
    __tablename__ = "chaise"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    numero_chaise: Mapped[str] = mapped_column(String(20), nullable=False)
    disponible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    prix_supplementaire: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
