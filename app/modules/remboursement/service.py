"""Service de gestion des remboursements."""
from datetime import datetime
from decimal import Decimal
from typing import Dict, Any, List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.models.remboursement import (
    Remboursement,
    StatutRemboursement,
    MethodeRemboursement
)
from app.models.reservation import (
    Reservation,
    ReservationPassager,
    ReservationVehicule,
    ReservationColis,
    StatutReservation,
)
from app.models.paiement import Paiement, StatutPaiement
from app.models.voyage import ProgrammeVoyage
from app.models.utilisateur import Utilisateur


class RemboursementService:
    """Service pour gérer les remboursements."""

    def _calculer_frais(self, delai_heures: Decimal) -> Decimal:
        """Calcule le pourcentage de frais selon le délai."""
        if delai_heures < 0:
            return Decimal("100")
        elif delai_heures < 24:
            return Decimal("80")
        elif delai_heures < 72:
            return Decimal("50")
        elif delai_heures < 168:
            return Decimal("25")
        else:
            return Decimal("0")

    def _generer_reference(self) -> str:
        """Génère une référence unique."""
        import secrets
        date_str = datetime.utcnow().strftime("%Y%m%d")
        random_str = secrets.token_hex(4).upper()
        return f"RMB-{date_str}-{random_str}"

    async def _get_item_montant(
        self,
        db: AsyncSession,
        reservation: Reservation,
        passager_id: Optional[int] = None,
        vehicule_id: Optional[int] = None,
        colis_id: Optional[int] = None,
    ) -> float:
        """Calcule le montant à rembourser selon l'élément ciblé."""
        if passager_id:
            item = await db.get(ReservationPassager, passager_id)
            if not item or item.reservation_id != reservation.id:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Passager invalide pour cette réservation")
            return float(item.montant or reservation.montant_total)
        elif vehicule_id:
            item = await db.get(ReservationVehicule, vehicule_id)
            if not item or item.reservation_id != reservation.id:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Véhicule invalide pour cette réservation")
            return float(item.montant or reservation.montant_total)
        elif colis_id:
            item = await db.get(ReservationColis, colis_id)
            if not item or item.reservation_id != reservation.id:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Colis invalide pour cette réservation")
            return float(item.montant_total or reservation.montant_total)
        return reservation.montant_total

    async def _check_already_refunded(
        self,
        db: AsyncSession,
        passager_id: Optional[int] = None,
        vehicule_id: Optional[int] = None,
        colis_id: Optional[int] = None,
    ) -> bool:
        """Vérifie si l'élément a déjà été remboursé."""
        if passager_id:
            item = await db.get(ReservationPassager, passager_id)
            return item and item.rembourse
        elif vehicule_id:
            item = await db.get(ReservationVehicule, vehicule_id)
            return item and item.rembourse
        elif colis_id:
            item = await db.get(ReservationColis, colis_id)
            return item and item.rembourse
        return False

    async def demander_remboursement(
        self,
        db: AsyncSession,
        current_user: Utilisateur,
        reference_reservation: str,
        raison_demande: str,
        methode_remboursement: str,
        details_remboursement: Dict[str, Any] = None,
        passager_ids: Optional[List[int]] = None,
        vehicule_ids: Optional[List[int]] = None,
        colis_ids: Optional[List[int]] = None,
    ) -> List[Dict[str, Any]]:
        """Créer une ou plusieurs demandes de remboursement."""

        query = (
            select(Reservation)
            .where(Reservation.reference_reservation == reference_reservation)
            .options(
                selectinload(Reservation.voyage),
                selectinload(Reservation.paiements)
            )
        )
        result = await db.execute(query)
        reservation = result.scalar_one_or_none()

        if not reservation:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Reservation not found")

        if reservation.is_front:
            if reservation.utilisateur_id != current_user.id:
                raise HTTPException(status.HTTP_403_FORBIDDEN, detail="This reservation does not belong to you")

        if reservation.statut_reservation != StatutReservation.confirme:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot refund: status is {reservation.statut_reservation.value}"
            )

        paiement = None
        for p in reservation.paiements:
            if p.statut == StatutPaiement.reussi:
                paiement = p
                break

        if not paiement:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No completed payment found")

        date_demande = datetime.utcnow()
        date_depart = reservation.voyage.date_depart_programme
        delai_heures = (date_depart - date_demande).total_seconds() / 3600

        # Construire la liste des items à rembourser
        items = []
        if passager_ids:
            for pid in passager_ids:
                items.append(("passager_id", pid, await self._get_item_montant(db, reservation, passager_id=pid)))
        if vehicule_ids:
            for vid in vehicule_ids:
                items.append(("vehicule_id", vid, await self._get_item_montant(db, reservation, vehicule_id=vid)))
        if colis_ids:
            for cid in colis_ids:
                items.append(("colis_id", cid, await self._get_item_montant(db, reservation, colis_id=cid)))

        if not items:
            # Remboursement complet
            montant_paye = reservation.montant_total
            pourcentage_frais = self._calculer_frais(Decimal(str(delai_heures)))
            montant_frais = (Decimal(str(montant_paye)) * pourcentage_frais / 100).quantize(Decimal("0.01"))
            montant_remboursement = Decimal(str(montant_paye)) - montant_frais

            existing = await db.execute(
                select(Remboursement).where(
                    Remboursement.reservation_id == reservation.id,
                    Remboursement.passager_id.is_(None),
                    Remboursement.vehicule_id.is_(None),
                    Remboursement.colis_id.is_(None),
                    Remboursement.statut.in_([StatutRemboursement.en_attente, StatutRemboursement.approuve])
                )
            )
            if existing.scalar_one_or_none():
                raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="A refund request is already pending")

            remb = Remboursement(
                reference_remboursement=self._generer_reference(),
                reservation_id=reservation.id,
                paiement_id=paiement.id,
                montant_paye=Decimal(str(montant_paye)),
                pourcentage_frais=pourcentage_frais,
                montant_frais=montant_frais,
                montant_remboursement=montant_remboursement,
                date_demande=date_demande,
                date_depart_voyage=date_depart,
                delai_heures=Decimal(str(delai_heures)),
                statut=StatutRemboursement.en_attente,
                raison_demande=raison_demande,
                methode_remboursement=methode_remboursement,
                details_remboursement=details_remboursement or {}
            )
            db.add(remb)
            await db.commit()
            await db.refresh(remb)
            return [{
                "reference_remboursement": remb.reference_remboursement,
                "statut": remb.statut.value,
                "montant_paye": float(montant_paye),
                "pourcentage_frais": float(pourcentage_frais),
                "montant_frais": float(montant_frais),
                "montant_remboursement": float(montant_remboursement),
                "delai_heures": float(delai_heures),
                "passager_id": None,
                "vehicule_id": None,
                "colis_id": None,
                "message": (
                    f"Demande enregistrée. Remboursement de "
                    f"{float(montant_remboursement)} FCFA ({100 - float(pourcentage_frais)}%)."
                )
            }]

        # Remboursement(s) par item
        created = []
        for field_name, item_id, montant_paye in items:
            target_field = field_name
            existing = await db.execute(
                select(Remboursement).where(
                    Remboursement.reservation_id == reservation.id,
                    getattr(Remboursement, target_field) == item_id,
                    Remboursement.statut.in_([StatutRemboursement.en_attente, StatutRemboursement.approuve])
                )
            )
            if existing.scalar_one_or_none():
                raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Demande déjà en cours pour {target_field}={item_id}")

            if await self._check_already_refunded(db, **{target_field: item_id}):
                raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"L'élément {target_field}={item_id} a déjà été remboursé")

            pourcentage_frais = self._calculer_frais(Decimal(str(delai_heures)))
            montant_frais = (Decimal(str(montant_paye)) * pourcentage_frais / 100).quantize(Decimal("0.01"))
            montant_rembourse = Decimal(str(montant_paye)) - montant_frais

            kwargs = {"passager_id": None, "vehicule_id": None, "colis_id": None}
            kwargs[target_field] = item_id

            remb = Remboursement(
                reference_remboursement=self._generer_reference(),
                reservation_id=reservation.id,
                paiement_id=paiement.id,
                **kwargs,
                montant_paye=Decimal(str(montant_paye)),
                pourcentage_frais=pourcentage_frais,
                montant_frais=montant_frais,
                montant_remboursement=montant_rembourse,
                date_demande=date_demande,
                date_depart_voyage=date_depart,
                delai_heures=Decimal(str(delai_heures)),
                statut=StatutRemboursement.en_attente,
                raison_demande=raison_demande,
                methode_remboursement=methode_remboursement,
                details_remboursement=details_remboursement or {}
            )
            db.add(remb)
            await db.flush()

            created.append({
                "reference_remboursement": remb.reference_remboursement,
                "statut": remb.statut.value,
                "montant_paye": float(montant_paye),
                "pourcentage_frais": float(pourcentage_frais),
                "montant_frais": float(montant_frais),
                "montant_remboursement": float(montant_rembourse),
                "delai_heures": float(delai_heures),
                "passager_id": item_id if field_name == "passager_id" else None,
                "vehicule_id": item_id if field_name == "vehicule_id" else None,
                "colis_id": item_id if field_name == "colis_id" else None,
                "message": (
                    f"Demande enregistrée pour {field_name}={item_id}. "
                    f"Remboursement de {float(montant_rembourse)} FCFA ({100 - float(pourcentage_frais)}%)."
                )
            })

        await db.commit()
        return created

    async def mes_demandes(
        self,
        db: AsyncSession,
        utilisateur_id: int
    ) -> List[Dict[str, Any]]:
        """Liste des demandes de remboursement d'un utilisateur."""

        query = (
            select(Remboursement)
            .join(Reservation, Remboursement.reservation_id == Reservation.id)
            .where(Reservation.utilisateur_id == utilisateur_id)
            .options(
                selectinload(Remboursement.reservation).selectinload(
                    Reservation.voyage
                )
            )
            .order_by(Remboursement.date_creation.desc())
        )

        result = await db.execute(query)
        demandes = result.scalars().all()

        return [
            {
                "reference_remboursement": d.reference_remboursement,
                "reservation_reference": d.reservation.reference_reservation,
                "statut": d.statut.value,
                "montant_paye": float(d.montant_paye),
                "montant_remboursement": float(d.montant_remboursement),
                "pourcentage_frais": float(d.pourcentage_frais),
                "date_demande": d.date_demande,
                "raison_demande": d.raison_demande,
                "raison_rejet": d.raison_rejet,
                "date_remboursement": d.date_remboursement,
                "voyage_id": d.reservation.voyage.id,
                "date_depart": d.reservation.voyage.date_depart_programme,
                "passager_id": d.passager_id,
                "vehicule_id": d.vehicule_id,
                "colis_id": d.colis_id,
            }
            for d in demandes
        ]

    async def liste_demandes_admin(
        self,
        db: AsyncSession,
        statut: str = None,
        page: int = 1,
        limit: int = 50
    ) -> Dict[str, Any]:
        """Liste toutes les demandes (admin)."""

        query = (
            select(Remboursement)
            .options(
                selectinload(Remboursement.reservation)
            )
            .order_by(Remboursement.date_creation.desc())
        )

        if statut:
            query = query.where(Remboursement.statut == statut)

        # Pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)

        result = await db.execute(query)
        demandes = result.scalars().all()

        # Compter le total
        count_query = select(func.count(Remboursement.id))
        if statut:
            count_query = count_query.where(Remboursement.statut == statut)
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        return {
            "demandes": [
                {
                    "reference_remboursement": d.reference_remboursement,
                    "reservation_reference": d.reservation.reference_reservation,
                    "statut": d.statut.value,
                    "montant_paye": float(d.montant_paye),
                    "montant_remboursement": float(d.montant_remboursement),
                    "date_demande": d.date_demande,
                    "date_depart_voyage": d.date_depart_voyage,
                    "passager_id": d.passager_id,
                    "vehicule_id": d.vehicule_id,
                    "colis_id": d.colis_id,
                }
                for d in demandes
            ],
            "total": total,
            "page": page,
            "pages_total": (total + limit - 1) // limit
        }

    async def approuver_rejeter(
        self,
        db: AsyncSession,
        reference: str,
        approuve: bool,
        admin_id: int,
        admin_nom: str,
        raison_rejet: str = None
    ) -> Dict[str, Any]:
        """Approuver ou rejeter une demande."""

        query = select(Remboursement).where(
            Remboursement.reference_remboursement == reference
        )
        result = await db.execute(query)
        remboursement = result.scalar_one_or_none()

        if not remboursement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Refund request not found"
            )

        if remboursement.statut != StatutRemboursement.en_attente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot process: status is {remboursement.statut.value}"
            )

        if approuve:
            remboursement.statut = StatutRemboursement.approuve
            remboursement.approuve_par_id = admin_id
            remboursement.approuve_par_nom = admin_nom
            remboursement.date_approbation = datetime.utcnow()
            message = "Demande approuvée"
        else:
            if not raison_rejet:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Rejection reason is required"
                )
            remboursement.statut = StatutRemboursement.rejete
            remboursement.raison_rejet = raison_rejet
            message = "Demande rejetée"

        await db.commit()

        return {
            "status": "success",
            "message": message,
            "reference_remboursement": reference,
            "nouveau_statut": remboursement.statut.value
        }

    async def marquer_rembourse(
        self,
        db: AsyncSession,
        reference: str,
        admin_id: int,
        admin_nom: str,
        numero_transaction: str,
        notes: str = None
    ) -> Dict[str, Any]:
        """Marquer une demande comme remboursée + marque l'élément remboursé."""

        query = (
            select(Remboursement)
            .where(Remboursement.reference_remboursement == reference)
            .options(selectinload(Remboursement.reservation))
        )
        result = await db.execute(query)
        remboursement = result.scalar_one_or_none()

        if not remboursement:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Refund request not found")

        if remboursement.statut != StatutRemboursement.approuve:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=f"Cannot refund: status is {remboursement.statut.value}")

        remboursement.statut = StatutRemboursement.rembourse
        remboursement.rembourse_par_id = admin_id
        remboursement.rembourse_par_nom = admin_nom
        remboursement.date_remboursement = datetime.utcnow()
        remboursement.numero_transaction = numero_transaction

        # Marquer l'élément spécifique comme remboursé
        now = datetime.utcnow()
        if remboursement.passager_id:
            item = await db.get(ReservationPassager, remboursement.passager_id)
            if item:
                item.rembourse = True
                item.frais_annulation = float(remboursement.montant_frais)
                item.date_annulation = now
                item.raison_annulation = remboursement.raison_demande
        elif remboursement.vehicule_id:
            item = await db.get(ReservationVehicule, remboursement.vehicule_id)
            if item:
                item.rembourse = True
                item.frais_annulation = float(remboursement.montant_frais)
                item.date_annulation = now
                item.raison_annulation = remboursement.raison_demande
        elif remboursement.colis_id:
            item = await db.get(ReservationColis, remboursement.colis_id)
            if item:
                item.rembourse = True
                item.frais_annulation = float(remboursement.montant_frais)
                item.date_annulation = now
                item.raison_annulation = remboursement.raison_demande
        else:
            # Remboursement complet : annuler la réservation
            reservation = remboursement.reservation
            if reservation.statut_reservation != StatutReservation.annule:
                reservation.statut_reservation = StatutReservation.annule
                reservation.date_annulation = datetime.utcnow()
                reservation.raison_annulation = (
                    f"Remboursement {remboursement.reference_remboursement}: "
                    f"{remboursement.raison_demande}"
                )
                reservation.frais_annulation = float(remboursement.montant_frais)

        await db.commit()

        return {
            "status": "success",
            "message": "Remboursement effectué",
            "reference_remboursement": reference,
            "montant_rembourse": float(remboursement.montant_remboursement),
            "numero_transaction": numero_transaction
        }

    async def annuler_demande(
        self,
        db: AsyncSession,
        reference: str,
        current_user: Utilisateur
    ) -> Dict[str, Any]:
        """Annuler une demande (par le client ou admin)."""

        query = (
            select(Remboursement)
            .where(Remboursement.reference_remboursement == reference)
            .options(selectinload(Remboursement.reservation))
        )
        result = await db.execute(query)
        remboursement = result.scalar_one_or_none()

        if not remboursement:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Refund request not found")

        # Vérifier droits : soit le propriétaire de la résa (front) soit un admin (back)
        if remboursement.reservation.is_front:
            if remboursement.reservation.utilisateur_id != current_user.id:
                raise HTTPException(status.HTTP_403_FORBIDDEN, detail="This request does not belong to you")
        else:
            role = getattr(current_user, "role", None)
            is_admin = current_user.is_superuser or (
                role is not None and getattr(role, "value", role) in ("admin_compagnie", "super_admin")
            )
            if not is_admin:
                raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Admin access required")

        if remboursement.statut not in [
            StatutRemboursement.en_attente,
            StatutRemboursement.approuve
        ]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel: status is {remboursement.statut.value}"
            )

        remboursement.statut = StatutRemboursement.annule
        await db.commit()

        return {
            "status": "success",
            "message": "Demande annulée",
            "reference_remboursement": reference
        }

    async def get_statistiques(
        self,
        db: AsyncSession,
        date_debut: datetime = None,
        date_fin: datetime = None
    ) -> Dict[str, Any]:
        """Statistiques des remboursements."""

        query = select(Remboursement)

        if date_debut:
            query = query.where(Remboursement.date_creation >= date_debut)
        if date_fin:
            query = query.where(Remboursement.date_creation <= date_fin)

        result = await db.execute(query)
        demandes = result.scalars().all()

        total = len(demandes)
        par_statut = {}
        montant_total_paye = Decimal("0")
        montant_total_frais = Decimal("0")
        montant_total_rembourse = Decimal("0")
        par_delai = {
            "plus_7_jours": 0,
            "3_a_7_jours": 0,
            "1_a_3_jours": 0,
            "moins_24h": 0,
            "apres_depart": 0
        }

        for d in demandes:
            # Par statut
            par_statut[d.statut.value] = par_statut.get(d.statut.value, 0) + 1

            # Montants
            montant_total_paye += d.montant_paye
            montant_total_frais += d.montant_frais
            if d.statut == StatutRemboursement.rembourse:
                montant_total_rembourse += d.montant_remboursement

            # Par délai
            delai = float(d.delai_heures)
            if delai < 0:
                par_delai["apres_depart"] += 1
            elif delai < 24:
                par_delai["moins_24h"] += 1
            elif delai < 72:
                par_delai["1_a_3_jours"] += 1
            elif delai < 168:
                par_delai["3_a_7_jours"] += 1
            else:
                par_delai["plus_7_jours"] += 1

        taux_remboursement = (
            (par_statut.get("rembourse", 0) / total * 100)
            if total > 0 else 0
        )

        return {
            "periode": {
                "debut": date_debut,
                "fin": date_fin
            },
            "total_demandes": total,
            "par_statut": par_statut,
            "montants": {
                "total_paye": float(montant_total_paye),
                "total_frais": float(montant_total_frais),
                "total_rembourse": float(montant_total_rembourse)
            },
            "par_delai": par_delai,
            "taux_remboursement": round(taux_remboursement, 2)
        }


remboursement_service = RemboursementService()
