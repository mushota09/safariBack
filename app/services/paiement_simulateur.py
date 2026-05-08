import random
import uuid
from datetime import datetime
from typing import Dict, Any

from app.config import settings


class PaiementSimulateur:
    """Simulateur de paiement pour les tests"""

    def __init__(self):
        self.success_rate = settings.PAIEMENT_SUCCESS_RATE

    async def process_payment(
        self,
        montant: float,
        mode_paiement: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Simule le traitement d'un paiement.

        Retourne un dictionnaire avec:
        - success: bool
        - reference_transaction: str
        - message: str
        - date_paiement: datetime (si succès)
        """
        # Générer une référence de transaction unique
        reference = f"TXN-{uuid.uuid4().hex[:12].upper()}"

        # Simuler un délai de traitement
        import asyncio
        await asyncio.sleep(0.5)

        # Déterminer le succès basé sur le taux de succès configuré
        success = random.random() < self.success_rate

        if success:
            return {
                "success": True,
                "reference_transaction": reference,
                "message": "Paiement traité avec succès",
                "date_paiement": datetime.utcnow(),
                "statut": "reussi"
            }
        else:
            error_messages = [
                "Fonds insuffisants",
                "Carte expirée",
                "Transaction refusée par la banque",
                "Erreur de connexion au serveur de paiement",
                "Numéro de carte invalide"
            ]

            return {
                "success": False,
                "reference_transaction": reference,
                "message": random.choice(error_messages),
                "statut": "echoue"
            }

    async def process_carte_payment(
        self,
        montant: float,
        numero_carte: str,
        cvv: str,
        date_expiration: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Traite un paiement par carte"""
        # Extraire les derniers chiffres
        derniers_chiffres = numero_carte[-4:] if len(numero_carte) >= 4 else numero_carte

        result = await self.process_payment(montant, "carte", **kwargs)
        result["derniers_chiffres_carte"] = derniers_chiffres

        return result

    async def process_mobile_money_payment(
        self,
        montant: float,
        telephone: str,
        operateur: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Traite un paiement Mobile Money"""
        result = await self.process_payment(montant, "mobile_money", **kwargs)
        result["telephone_mobile"] = telephone
        result["operateur_mobile"] = operateur

        return result

    async def process_virement_payment(
        self,
        montant: float,
        iban: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Traite un paiement par virement"""
        return await self.process_payment(montant, "virement", **kwargs)

    async def refund_payment(
        self,
        reference_transaction: str,
        montant: float
    ) -> Dict[str, Any]:
        """Simule un remboursement"""
        import asyncio
        await asyncio.sleep(0.3)

        reference_remboursement = f"REF-{uuid.uuid4().hex[:12].upper()}"

        return {
            "success": True,
            "reference_remboursement": reference_remboursement,
            "reference_transaction_originale": reference_transaction,
            "montant_rembourse": montant,
            "message": "Remboursement effectué avec succès",
            "date_remboursement": datetime.utcnow()
        }


paiement_simulateur = PaiementSimulateur()
