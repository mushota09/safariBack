"""Router pour le module de remboursement."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from typing import Optional, Annotated

from app.database import get_db
from app.dependencies import get_current_user, get_admin_user
from app.models.utilisateur import Utilisateur
from app.modules.remboursement.service import remboursement_service
from app.modules.remboursement.schemas import (
    DemandeRemboursementCreate,
    DemandeRemboursementResponse,
    RemboursementListItem,
    RemboursementListResponse,
    ApprouverRejeterRequest,
    MarquerRemboursementRequest,
    StatistiquesRemboursementResponse,
)

router = APIRouter(prefix="/remboursements", tags=["Remboursements"])


@router.post("/demander", response_model=list[DemandeRemboursementResponse])
async def demander_remboursement(
    demande: DemandeRemboursementCreate,
    current_user: Annotated[Utilisateur, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """
    Créer une ou plusieurs demandes de remboursement.

    **Barème des frais:**
    - Plus de 7 jours avant: 0% frais
    - 3 à 7 jours avant: 25% frais
    - 1 à 3 jours avant: 50% frais
    - Moins de 24h avant: 80% frais
    - Après le départ: Non remboursable (100% frais)

    **Validations:**
    - La réservation doit être confirmée
    - Pas de demande en cours
    - Paiement complet
    """
    return await remboursement_service.demander_remboursement(
        db=db,
        current_user=current_user,
        reference_reservation=demande.reference_reservation,
        passager_ids=demande.passager_ids,
        vehicule_ids=demande.vehicule_ids,
        colis_ids=demande.colis_ids,
        raison_demande=demande.raison_demande,
        methode_remboursement=demande.methode_remboursement,
        details_remboursement=demande.details_remboursement
    )


@router.get("/mes-demandes", response_model=list[RemboursementListItem])
async def mes_demandes(
    current_user: Annotated[Utilisateur, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """
    Liste des demandes de remboursement du client connecté.
    """
    return await remboursement_service.mes_demandes(db, current_user.id)


@router.get("/liste", response_model=RemboursementListResponse)
async def liste_demandes_admin(
    admin: Annotated[Utilisateur, Depends(get_admin_user)],
    statut: Optional[str] = Query(None, description="Filtrer par statut"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Liste toutes les demandes de remboursement (Admin).

    **Filtres:**
    - statut: en_attente, approuve, rejete, rembourse, annule
    """
    return await remboursement_service.liste_demandes_admin(
        db, statut=statut, page=page, limit=limit
    )


@router.post("/{reference}/approuver")
async def approuver_rejeter(
    reference: str,
    request: ApprouverRejeterRequest,
    admin: Annotated[Utilisateur, Depends(get_admin_user)],
    db: AsyncSession = Depends(get_db),
):
    """
    Approuver ou rejeter une demande de remboursement (Admin).

    **Permissions:** Admin/Finance uniquement

    **Si rejeté:** raison_rejet obligatoire
    """
    return await remboursement_service.approuver_rejeter(
        db=db,
        reference=reference,
        approuve=request.approuve,
        admin_id=admin.id,
        admin_nom=admin.nom_complet or admin.email,
        raison_rejet=request.raison_rejet
    )


@router.post("/{reference}/rembourser")
async def marquer_rembourse(
    reference: str,
    request: MarquerRemboursementRequest,
    admin: Annotated[Utilisateur, Depends(get_admin_user)],
    db: AsyncSession = Depends(get_db),
):
    """
    Marquer une demande comme remboursée (Admin).

    **Permissions:** Admin/Finance uniquement

    **Prérequis:** Statut doit être "approuve"
    """
    return await remboursement_service.marquer_rembourse(
        db=db,
        reference=reference,
        admin_id=admin.id,
        admin_nom=admin.nom_complet or admin.email,
        numero_transaction=request.numero_transaction,
        notes=request.notes
    )


@router.post("/{reference}/annuler")
async def annuler_demande(
    reference: str,
    current_user: Annotated[Utilisateur, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """
    Annuler sa propre demande de remboursement (Client).

    **Conditions:**
    - Statut doit être "en_attente" ou "approuve"
    - Pas encore remboursé
    """
    return await remboursement_service.annuler_demande(
        db, reference=reference, current_user=current_user
    )


@router.get("/statistiques", response_model=StatistiquesRemboursementResponse)
async def get_statistiques(
    admin: Annotated[Utilisateur, Depends(get_admin_user)],
    date_debut: Optional[datetime] = Query(None),
    date_fin: Optional[datetime] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Statistiques des remboursements (Admin).

    **Métriques:**
    - Total demandes
    - Répartition par statut
    - Montants (payé, frais, remboursé)
    - Répartition par délai
    - Taux de remboursement
    """
    return await remboursement_service.get_statistiques(
        db, date_debut=date_debut, date_fin=date_fin
    )
