from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.reservation import Reservation


class ModePaiement(str, enum.Enum):
    carte = "carte"
    mobile_money = "mobile_money"
    virement = "virement"
    especes_bord = "especes_bord"


class StatutPaiement(str, enum.Enum):
    initie = "initie"
    en_cours = "en_cours"
    reussi = "reussi"
    echoue = "echoue"
    rembourse = "rembourse"


class Paiement(Base):
    __tablename__ = "paiement"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reservation_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("reservation.id"),
        unique=True,
        nullable=False,
        index=True
    )

    montant: Mapped[float] = mapped_column(Float, nullable=False)
    mode_paiement: Mapped[ModePaiement] = mapped_column(SQLEnum(ModePaiement), nullable=False)
    statut: Mapped[StatutPaiement] = mapped_column(
        SQLEnum(StatutPaiement),
        default=StatutPaiement.initie,
        nullable=False,
        index=True
    )

    reference_transaction: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    date_paiement: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    telephone_mobile: Mapped[str | None] = mapped_column(String(20), nullable=True)
    operateur_mobile: Mapped[str | None] = mapped_column(String(50), nullable=True)
    derniers_chiffres_carte: Mapped[str | None] = mapped_column(String(4), nullable=True)

    ip_client: Mapped[str | None] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    message_erreur: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relations
    reservation: Mapped["Reservation"] = relationship("Reservation", back_populates="paiement")
