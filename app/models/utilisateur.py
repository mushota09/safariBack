from typing import List, TYPE_CHECKING
from datetime import date
import enum
from sqlalchemy import String, Integer, Boolean, Date, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import ModeleDeBase

if TYPE_CHECKING:
    from app.models.reservation import Reservation
    from app.models.journal import Journal
    from app.models.document import DocumentVoyageur
    from app.models.compagnie import CompagnieBateau


class RoleUtilisateur(str, enum.Enum):
    client = "client"
    admin_compagnie = "admin_compagnie"
    super_admin = "super_admin"


class SexeUtilisateur(str, enum.Enum):
    masculin = "masculin"
    feminin = "feminin"


class Utilisateur(ModeleDeBase):
    __tablename__ = "utilisateur"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    numero_telephone: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    nom_complet: Mapped[str | None] = mapped_column(String(200), nullable=True)
    photo_profil: Mapped[str | None] = mapped_column(String(500), nullable=True)
    date_naissance: Mapped[date | None] = mapped_column(Date, nullable=True)
    document_identite: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    nationalite: Mapped[str | None] = mapped_column(String(100), nullable=True)
    sexe: Mapped[SexeUtilisateur | None] = mapped_column(SQLEnum(SexeUtilisateur), nullable=True)
    langue_preferee: Mapped[str] = mapped_column(String(5), default="fr", nullable=False)
    notification_email: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notification_sms: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Multi-tenancy (compte admin lié à une compagnie pour le backoffice)
    role: Mapped[RoleUtilisateur] = mapped_column(
        SQLEnum(RoleUtilisateur),
        default=RoleUtilisateur.client,
        nullable=False,
        index=True,
    )
    compagnie_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("compagnie_bateau.id"),
        nullable=True,
        index=True,
    )

    # Relations
    reservations: Mapped[List["Reservation"]] = relationship("Reservation", back_populates="utilisateur")
    journaux: Mapped[List["Journal"]] = relationship("Journal", back_populates="utilisateur")
    documents: Mapped[List["DocumentVoyageur"]] = relationship("DocumentVoyageur", back_populates="utilisateur")
