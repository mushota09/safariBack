"""Modèles pour la gestion de l'équipage des bateaux."""
from typing import TYPE_CHECKING, List
from datetime import datetime, date
from sqlalchemy import String, Integer, ForeignKey, Boolean, Float, Date, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
import secrets

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.compagnie import Bateau


class SexeEquipage(str, enum.Enum):
    """Sexe du membre d'équipage."""
    homme = "HOMME"
    femme = "FEMME"


class StatutEquipage(str, enum.Enum):
    """Statut d'un membre d'équipage."""
    actif = "ACTIF"
    conge = "CONGE"
    suspendu = "SUSPENDU"
    demissionne = "DEMISSIONNE"
    retraite = "RETRAITE"


class EquipageRole(Base):
    """Rôles possibles dans l'équipage (Capitaine, Commissaire, Mécanicien, etc.)."""
    __tablename__ = "equipage_role"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nom: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    niveau_hierarchique: Mapped[int | None] = mapped_column(
        Integer, nullable=True,
        comment="1=Capitaine, 2=Officier, 3=Personnel de service"
    )

    # Relations
    membres: Mapped[List["MembreEquipage"]] = relationship(
        "MembreEquipage", back_populates="role"
    )


class Certification(Base):
    """Types de certifications pour l'équipage."""
    __tablename__ = "certification"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nom: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    duree_validite_mois: Mapped[int | None] = mapped_column(
        Integer, nullable=True,
        comment="Durée de validité en mois (null = permanente)"
    )

    # Relations
    equipage_certifications: Mapped[List["EquipageCertification"]] = relationship(
        "EquipageCertification", back_populates="certification"
    )


class MembreEquipage(Base):
    """Membre de l'équipage d'un bateau."""
    __tablename__ = "membre_equipage"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Informations personnelles
    nom_complet: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    sexe: Mapped[SexeEquipage] = mapped_column(String(10), nullable=False)
    date_naissance: Mapped[date | None] = mapped_column(Date, nullable=True)
    nationalite: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Contact
    telephone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    adresse: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Professionnel
    numero_licence: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    role_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("equipage_role.id"), nullable=False, index=True
    )
    bateau_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("bateau.id"), nullable=False, index=True
    )

    # Statut et activité
    statut: Mapped[StatutEquipage] = mapped_column(
        String(20), nullable=False, default=StatutEquipage.actif, index=True
    )
    date_embauche: Mapped[date | None] = mapped_column(Date, nullable=True)
    date_fin_contrat: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Photos
    photo_profil: Mapped[str | None] = mapped_column(
        String(500), nullable=True,
        comment="URL de la photo de profil"
    )
    photo_carte_identite: Mapped[str | None] = mapped_column(
        String(500), nullable=True,
        comment="URL du scan de la carte d'identité"
    )

    # Expérience
    annees_experience: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Urgence
    contact_urgence_nom: Mapped[str | None] = mapped_column(String(200), nullable=True)
    contact_urgence_telephone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Métadonnées
    date_creation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False
    )
    date_modification: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relations
    role: Mapped["EquipageRole"] = relationship("EquipageRole", back_populates="membres")
    bateau: Mapped["Bateau"] = relationship("Bateau", back_populates="equipages")
    certifications: Mapped[List["EquipageCertification"]] = relationship(
        "EquipageCertification",
        back_populates="membre_equipage",
        cascade="all, delete-orphan"
    )

    def generer_numero_licence(self) -> str:
        """Génère un numéro de licence unique."""
        annee = datetime.utcnow().year
        code = secrets.token_hex(2).upper()
        return f"LIC-SF-{annee}-{code}"


class EquipageCertification(Base):
    """Table de liaison entre membre d'équipage et certifications."""
    __tablename__ = "equipage_certification"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    membre_equipage_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("membre_equipage.id"), nullable=False, index=True
    )
    certification_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("certification.id"), nullable=False, index=True
    )

    # Dates de validité
    date_obtention: Mapped[date] = mapped_column(Date, nullable=False)
    date_expiration: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Document
    numero_certificat: Mapped[str | None] = mapped_column(String(100), nullable=True)
    organisme_delivrance: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Validation
    est_valide: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relations
    membre_equipage: Mapped["MembreEquipage"] = relationship(
        "MembreEquipage", back_populates="certifications"
    )
    certification: Mapped["Certification"] = relationship(
        "Certification", back_populates="equipage_certifications"
    )

    @property
    def est_expire(self) -> bool:
        """Vérifie si la certification est expirée."""
        if not self.date_expiration:
            return False  # Permanente
        return datetime.utcnow().date() > self.date_expiration
