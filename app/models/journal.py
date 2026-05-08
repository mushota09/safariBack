from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.utilisateur import Utilisateur


class NiveauLog(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"


class Journal(Base):
    __tablename__ = "journal"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    utilisateur_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("utilisateur.id"), nullable=True, index=True)

    action: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    ip_adresse: Mapped[str | None] = mapped_column(String(50), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    niveau_log: Mapped[NiveauLog] = mapped_column(
        SQLEnum(NiveauLog),
        default=NiveauLog.INFO,
        nullable=False,
        index=True
    )

    date_creation: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    # Relations
    utilisateur: Mapped["Utilisateur | None"] = relationship("Utilisateur", back_populates="journaux")
