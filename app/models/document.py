from typing import TYPE_CHECKING
from datetime import date
from sqlalchemy import String, Integer, ForeignKey, Date, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.utilisateur import Utilisateur


class TypeDocument(str, enum.Enum):
    CIN = "CIN"
    PASSEPORT = "PASSEPORT"
    PERMIS = "PERMIS"


class DocumentVoyageur(Base):
    __tablename__ = "document_voyageur"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    utilisateur_id: Mapped[int] = mapped_column(Integer, ForeignKey("utilisateur.id"), nullable=False, index=True)

    type_document: Mapped[TypeDocument] = mapped_column(SQLEnum(TypeDocument), nullable=False)
    numero_document: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    pays_emission: Mapped[str] = mapped_column(String(100), nullable=False)
    date_delivrance: Mapped[date | None] = mapped_column(Date, nullable=True)
    date_expiration: Mapped[date | None] = mapped_column(Date, nullable=True)

    fichier_scan: Mapped[str | None] = mapped_column(String(500), nullable=True)
    verifie: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Relations
    utilisateur: Mapped["Utilisateur"] = relationship("Utilisateur", back_populates="documents")
