import os
import qrcode
from typing import Optional

from app.config import settings


class QRCodeService:
    """Service de génération de QR codes"""

    def __init__(self):
        self.qr_dir = settings.QR_CODE_DIR
        os.makedirs(self.qr_dir, exist_ok=True)

    async def generate_qr_code(
        self,
        data: str,
        filename: str,
        size: int = 10,
        border: int = 2
    ) -> str:
        """
        Génère un QR code et le sauvegarde.

        Args:
            data: Données à encoder dans le QR code
            filename: Nom du fichier (sans extension)
            size: Taille du QR code (1-40)
            border: Taille de la bordure

        Returns:
            Chemin du fichier généré
        """
        # Créer le QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=size,
            border=border,
        )

        qr.add_data(data)
        qr.make(fit=True)

        # Créer l'image
        img = qr.make_image(fill_color="black", back_color="white")

        # Sauvegarder
        filepath = os.path.join(self.qr_dir, f"{filename}.png")
        img.save(filepath)

        return filepath

    async def generate_ticket_qr_code(
        self,
        numero_ticket: str,
        reservation_id: int,
        signed_payload: str | None = None,
    ) -> str:
        """Génère un QR code pour un billet.

        Si ``signed_payload`` est fourni (chaîne déjà signée par
        ``ticket_signing.sign_payload``), c'est cette chaîne qui est encodée
        dans le QR. Sinon, on retombe sur l'ancien format non signé pour la
        rétrocompatibilité.
        """
        data = signed_payload if signed_payload else f"TICKET:{numero_ticket}:RES:{reservation_id}"

        filename = f"qr_{numero_ticket}"
        return await self.generate_qr_code(data, filename)

    def get_qr_code_path(self, numero_ticket: str) -> str:
        """Retourne le chemin d'un QR code existant"""
        return os.path.join(self.qr_dir, f"qr_{numero_ticket}.png")


qrcode_service = QRCodeService()
