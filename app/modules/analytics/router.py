"""Router pour le module Analytics/Rapports."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, datetime, timedelta
from typing import Optional, List

from app.database import get_db
from app.dependencies import get_current_user
from app.models.utilisateur import Utilisateur, RoleUtilisateur
from app.modules.analytics import schemas
from app.modules.analytics.service import AnalyticsService


router = APIRouter(prefix="/analytics", tags=["Analytics & Rapports"])


# ============================================================================
# HELPERS
# ============================================================================

def verifier_acces_analytics(utilisateur: Utilisateur):
    """Vérifie que l'utilisateur a accès aux analytics."""
    if utilisateur.role not in [
        RoleUtilisateur.super_admin,
        RoleUtilisateur.admin_compagnie
    ]:
        raise HTTPException(
            status_code=403,
            detail="Accès réservé aux administrateurs"
        )


def get_dates_par_defaut(
    date_debut: Optional[date] = None,
    date_fin: Optional[date] = None
) -> tuple[date, date]:
    """Retourne les dates par défaut si non fournies (30 derniers jours)."""
    if not date_fin:
        date_fin = datetime.now().date()
    if not date_debut:
        date_debut = date_fin - timedelta(days=30)
    return date_debut, date_fin


# ============================================================================
# RAPPORTS FINANCIERS
# ============================================================================

@router.get(
    "/financier/chiffre-affaires",
    response_model=List[schemas.ChiffreAffairesPeriode],
    summary="Chiffre d'affaires par période"
)
async def get_chiffre_affaires_periode(
    date_debut: Optional[date] = Query(None, description="Date de début"),
    date_fin: Optional[date] = Query(None, description="Date de fin"),
    grouper_par: str = Query("mois", regex="^(jour|mois|annee)$"),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """
    Récupère le chiffre d'affaires par période avec détail par type de réservation.

    - **grouper_par**: jour, mois ou annee
    """
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_chiffre_affaires_periode(date_debut, date_fin, grouper_par)


@router.get(
    "/financier/routes",
    response_model=List[schemas.ChiffreAffairesRoute],
    summary="CA par route"
)
async def get_ca_par_route(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """Top routes par chiffre d'affaires."""
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_ca_par_route(date_debut, date_fin, limit)


@router.get(
    "/financier/bateaux",
    response_model=List[schemas.ChiffreAffairesBateau],
    summary="CA par bateau"
)
async def get_ca_par_bateau(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """Top bateaux par chiffre d'affaires."""
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_ca_par_bateau(date_debut, date_fin, limit)


@router.get(
    "/financier/repartition-revenus",
    response_model=schemas.RepartitionRevenus,
    summary="Répartition des revenus"
)
async def get_repartition_revenus(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """Répartition des revenus par type de réservation."""
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_repartition_revenus(date_debut, date_fin)


@router.get(
    "/financier/paiements",
    response_model=List[schemas.PaiementsParMode],
    summary="Paiements par mode"
)
async def get_paiements_par_mode(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """Statistiques de paiements par mode de paiement."""
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_paiements_par_mode(date_debut, date_fin)


@router.get(
    "/financier/remboursements",
    response_model=schemas.AnalyseRemboursements,
    summary="Analyse des remboursements"
)
async def get_analyse_remboursements(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """Analyse complète des remboursements."""
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_analyse_remboursements(date_debut, date_fin)


@router.get(
    "/financier/rapport-complet",
    response_model=schemas.RapportFinancier,
    summary="Rapport financier complet"
)
async def get_rapport_financier_complet(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """
    Rapport financier complet incluant:
    - CA total et répartition
    - Paiements par mode
    - Remboursements
    - Top routes et bateaux
    """
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_rapport_financier_complet(date_debut, date_fin)


# ============================================================================
# RAPPORTS OPÉRATIONNELS
# ============================================================================

@router.get(
    "/operationnel/taux-remplissage",
    response_model=List[schemas.TauxRemplissage],
    summary="Taux de remplissage des voyages"
)
async def get_taux_remplissage_voyages(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """Taux de remplissage par voyage."""
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_taux_remplissage_voyages(date_debut, date_fin)


@router.get(
    "/operationnel/performance-voyages",
    response_model=List[schemas.PerformanceVoyage],
    summary="Performance des voyages"
)
async def get_performance_voyages(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """Performance des voyages (ponctualité, CA, embarquement)."""
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_performance_voyages(date_debut, date_fin)


@router.get(
    "/operationnel/embarquement",
    response_model=List[schemas.StatistiquesEmbarquement],
    summary="Statistiques d'embarquement"
)
async def get_statistiques_embarquement(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    grouper_par: str = Query("mois", regex="^(jour|mois)$"),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """Statistiques d'embarquement par période."""
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_statistiques_embarquement(date_debut, date_fin, grouper_par)


@router.get(
    "/operationnel/flotte",
    response_model=List[schemas.AnalyseFlotte],
    summary="Analyse de la flotte"
)
async def get_analyse_flotte(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """Analyse de la flotte de bateaux."""
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_analyse_flotte(date_debut, date_fin)


@router.get(
    "/operationnel/flotte/par-periode",
    response_model=List[schemas.FlottePeriodeStat],
    summary="Statistiques flotte par période"
)
async def get_flotte_par_periode(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    grouper_par: str = Query("mois", regex="^(semaine|mois|annee)$"),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """
    Statistiques des bateaux regroupées par période (semaine/mois/annee).
    Ex: grouper_par=annee&date_debut=2014-01-01&date_fin=2026-12-31
    """
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_flotte_par_periode(date_debut, date_fin, grouper_par)


@router.get(
    "/operationnel/compagnie",
    response_model=schemas.StatistiquesCompagnie,
    summary="Statistiques globales de la compagnie"
)
async def get_statistiques_compagnie(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """Statistiques globales de la compagnie (tous bateaux confondus)."""
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_statistiques_compagnie(date_debut, date_fin)


@router.get(
    "/operationnel/rapport-complet",
    response_model=schemas.RapportOperationnel,
    summary="Rapport opérationnel complet"
)
async def get_rapport_operationnel_complet(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """
    Rapport opérationnel complet incluant:
    - Statistiques voyages (ponctualité, annulations)
    - Taux de remplissage moyen
    - Taux d'embarquement
    - Analyse de la flotte
    """
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_rapport_operationnel_complet(date_debut, date_fin)


# ============================================================================
# RAPPORTS CLIENTS
# ============================================================================

@router.get(
    "/clients/statistiques",
    response_model=schemas.StatistiquesClients,
    summary="Statistiques clients"
)
async def get_statistiques_clients(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """Statistiques des clients (total, nouveaux, récurrents)."""
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_statistiques_clients(date_debut, date_fin)


@router.get(
    "/clients/top",
    response_model=List[schemas.TopClient],
    summary="Top clients VIP"
)
async def get_top_clients(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """Top clients VIP par chiffre d'affaires."""
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_top_clients(date_debut, date_fin, limit)


@router.get(
    "/clients/rapport-complet",
    response_model=schemas.RapportClients,
    summary="Rapport clients complet"
)
async def get_rapport_clients_complet(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """
    Rapport clients complet incluant:
    - Statistiques clients
    - Top clients VIP
    - Taux de rétention
    """
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_rapport_clients_complet(date_debut, date_fin)


# ============================================================================
# RAPPORTS GÉOGRAPHIQUES
# ============================================================================

@router.get(
    "/geographique/routes-populaires",
    response_model=List[schemas.RoutePopulaire],
    summary="Routes populaires"
)
async def get_routes_populaires(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """Routes les plus fréquentées."""
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_routes_populaires(date_debut, date_fin, limit)


@router.get(
    "/geographique/origines-clients",
    response_model=List[schemas.OrigineClients],
    summary="Origines des clients"
)
async def get_origines_clients(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """Origine géographique des clients."""
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_origines_clients(date_debut, date_fin, limit)


@router.get(
    "/geographique/rapport-complet",
    response_model=schemas.RapportGeographique,
    summary="Rapport géographique complet"
)
async def get_rapport_geographique_complet(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """
    Rapport géographique complet incluant:
    - Routes populaires
    - Routes rentables
    - Origines des clients
    """
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_rapport_geographique_complet(date_debut, date_fin)


# ============================================================================
# TENDANCES ET PRÉVISIONS
# ============================================================================

@router.get(
    "/tendances/saisonnieres",
    response_model=List[schemas.TendanceSaisonniere],
    summary="Tendances saisonnières"
)
async def get_tendances_saisonnieres(
    annee: Optional[int] = Query(None, description="Année (par défaut: année en cours)"),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """Tendances saisonnières par mois."""
    verifier_acces_analytics(utilisateur)

    service = AnalyticsService(db)
    return await service.get_tendances_saisonnieres(annee)


@router.get(
    "/tendances/journalieres",
    response_model=List[schemas.TendanceJournaliere],
    summary="Tendances par jour de la semaine"
)
async def get_tendances_journalieres(
    date_debut: Optional[date] = Query(None),
    date_fin: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """Tendances par jour de la semaine."""
    verifier_acces_analytics(utilisateur)
    date_debut, date_fin = get_dates_par_defaut(date_debut, date_fin)

    service = AnalyticsService(db)
    return await service.get_tendances_journalieres(date_debut, date_fin)


# ============================================================================
# RAPPORTS ÉQUIPAGE
# ============================================================================

@router.get(
    "/equipage/statistiques",
    response_model=schemas.StatistiquesEquipage,
    summary="Statistiques équipage"
)
async def get_statistiques_equipage(
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """Statistiques de l'équipage."""
    verifier_acces_analytics(utilisateur)

    service = AnalyticsService(db)
    return await service.get_statistiques_equipage()


@router.get(
    "/equipage/par-bateau",
    response_model=List[schemas.EquipageBateau],
    summary="Équipages par bateau"
)
async def get_equipages_par_bateau(
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """Équipages par bateau."""
    verifier_acces_analytics(utilisateur)

    service = AnalyticsService(db)
    return await service.get_equipages_par_bateau()


@router.get(
    "/equipage/certifications",
    response_model=List[schemas.CertificationsStatut],
    summary="Statut des certifications"
)
async def get_certifications_statut(
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """Statut des certifications de l'équipage."""
    verifier_acces_analytics(utilisateur)

    service = AnalyticsService(db)
    return await service.get_certifications_statut()


@router.get(
    "/equipage/rapport-complet",
    response_model=schemas.RapportEquipage,
    summary="Rapport équipage complet"
)
async def get_rapport_equipage_complet(
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """
    Rapport équipage complet incluant:
    - Statistiques globales
    - Équipages par bateau
    - Statut des certifications
    """
    verifier_acces_analytics(utilisateur)

    service = AnalyticsService(db)
    return await service.get_rapport_equipage_complet()


# ============================================================================
# DASHBOARDS KPI
# ============================================================================

@router.get(
    "/dashboard/direction",
    response_model=schemas.DashboardDirection,
    summary="Dashboard Direction"
)
async def get_dashboard_direction(
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """
    Dashboard pour la direction avec KPI temps réel:
    - KPI Financiers (CA jour/mois/année, panier moyen)
    - KPI Opérationnels (voyages, ponctualité)
    - KPI Clients (réservations, nouveaux clients)
    - Alertes importantes
    """
    verifier_acces_analytics(utilisateur)

    service = AnalyticsService(db)
    return await service.get_dashboard_direction()


@router.get(
    "/dashboard/operations",
    response_model=schemas.DashboardOperations,
    summary="Dashboard Opérations"
)
async def get_dashboard_operations(
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """
    Dashboard pour les opérations:
    - Voyages du jour
    - Taux de remplissage
    - Embarquements en cours
    - Incidents
    """
    verifier_acces_analytics(utilisateur)

    service = AnalyticsService(db)
    return await service.get_dashboard_operations()


@router.get(
    "/dashboard/finances",
    response_model=schemas.DashboardFinances,
    summary="Dashboard Finances"
)
async def get_dashboard_finances(
    db: AsyncSession = Depends(get_db),
    utilisateur: Utilisateur = Depends(get_current_user),
):
    """
    Dashboard pour les finances:
    - CA jour et mois
    - Paiements en attente
    - Remboursements en attente
    """
    verifier_acces_analytics(utilisateur)

    service = AnalyticsService(db)
    return await service.get_dashboard_finances()
