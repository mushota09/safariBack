from typing import TYPE_CHECKING
from datetime import date
from sqlalchemy import String, Integer, Float, ForeignKey, Date, Boolean, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.compagnie import CompagnieBateau


class TypeReduction(str, enum.Enum):
    pourcentage = "pourcentage"
    montant_fixe = "montant_fixe"


class Promotion(Base):
    __tablename__ = "promotion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    compagnie_id: Mapped[int] = mapped_column(Integer, ForeignKey("compagnie_bateau.id"), nullable=False, index=True)

    code_promo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    type_reduction: Mapped[TypeReduction] = mapped_column(SQLEnum(TypeReduction), nullable=False)
    valeur_reduction: Mapped[float] = mapped_column(Float, nullable=False)

    date_debut: Mapped[date] = mapped_column(Date, nullable=False)
    date_fin: Mapped[date] = mapped_column(Date, nullable=False)
    actif: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    nombre_utilisations_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    nombre_utilisations: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relations
    compagnie: Mapped["CompagnieBateau"] = relationship("CompagnieBateau", back_populates="promotions")
