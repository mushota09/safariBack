from typing import TYPE_CHECKING
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, Boolean, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.compagnie import Bateau


class ImageBateau(Base):
    """Galerie de photos liée à un bateau.

    Un bateau a une `photo_principale` (champ direct sur Bateau, utilisée pour les
    listes) et une collection d'`ImageBateau` (utilisée pour la galerie de détail).
    """

    __tablename__ = "image_bateau"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bateau_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("bateau.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    legende: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    est_principale: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ordre: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    date_ajout: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    bateau: Mapped["Bateau"] = relationship("Bateau", back_populates="images")
