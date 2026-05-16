from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.reservation import Reservation


class Ticket(Base):
    __tablename__ = "ticket"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reservation_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("reservation.id"),
        unique=True,
        nullable=False,
        index=True
    )

    numero_ticket: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    qr_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    qr_payload: Mapped[str | None] = mapped_column(Text, nullable=True)
    qr_signature: Mapped[str | None] = mapped_column(String(128), nullable=True)
    pdf_genere: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    date_envoi_email: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    embarque: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    date_embarquement: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relations
    reservation: Mapped["Reservation"] = relationship("Reservation", back_populates="ticket")
