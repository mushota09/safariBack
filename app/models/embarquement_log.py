"""Modèle pour l'historique des actions d'embarquement (audit trail)."""
from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.ticket import Ticket
    from app.models.utilisateur import Utilisateur


class TypeActionEmbarquement(str, enum.Enum):
    """Types d'actions possibles lors de l'embarquement."""
    scan = "scan"
    embarquement = "embarquement"
    annulation = "annulation"
    marquage_absent = "marquage absent"
    verification_identite = "verification identite"


class EmbarquementLog(Base):
    """Log de toutes les actions d'embarquement pour audit."""
    __tablename__ = "embarquement_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Référence au ticket
    ticket_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ticket.id"), nullable=False, index=True
    )
    numero_ticket: Mapped[str] = mapped_column(
        String(100), nullable=False, index=True
    )

    # Agent qui a effectué l'action
    agent_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("utilisateur.id"), nullable=False, index=True
    )
    agent_nom: Mapped[str] = mapped_column(String(200), nullable=False)

    # Type d'action
    action: Mapped[TypeActionEmbarquement] = mapped_column(
        String(50), nullable=False, index=True
    )

    # Horodatage
    date_action: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True
    )

    # Détails de l'action (JSON flexible)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Commentaires/raisons
    commentaire: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relations
    ticket: Mapped["Ticket"] = relationship("Ticket")
    agent: Mapped["Utilisateur"] = relationship("Utilisateur")
