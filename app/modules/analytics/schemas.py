"""Schémas Pydantic pour le module Analytics/Rapports."""
from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import List, Dict, Any, Optional


# ============================================================================
# RAPPORTS FINANCIERS
# ============================================================================

class ChiffreAffairesPeriode(BaseModel):
    """Chiffre d'affaires par période."""
    periode: str = Field(..., description="Période (YYYY-MM ou YYYY-MM-DD)")
    montant_total: float = Field(..., description="Montant total CA")
    nombre_reservations: int = Field(..., description="Nombre de réservations")
    montant_passagers: float = Field(0.0, description="CA Passagers")
    montant_vehicules: float = Field(0.0, description="CA Véhicules")
    montant_colis: float = Field(0.0, description="CA Colis")


class ChiffreAffairesRoute(BaseModel):
    """Chiffre d'affaires par route/traversée."""
    route_id: int
    port_depart: str
    port_arrivee: str
    montant_total: float
    nombre_voyages: int
    nombre_reservations: int


class ChiffreAffairesBateau(BaseModel):
    """Chiffre d'affaires par bateau."""
    bateau_id: int
    nom_bateau: str
    compagnie: str
    montant_total: float
    nombre_voyages: int
    nombre_reservations: int


class RepartitionRevenus(BaseModel):
    """Répartition des revenus par type de réservation."""
    total_ca: float
    ca_passagers: float
    ca_vehicules: float
    ca_colis: float
    pourcentage_passagers: float
    pourcentage_vehicules: float
    pourcentage_colis: float


class PaiementsParMode(BaseModel):
    """Statistiques de paiements par mode de paiement."""
    mode_paiement: str
    nombre_transactions: int
    montant_total: float
    pourcentage: float
    taux_reussite: float  # % de paiements réussis


class AnalyseRemboursements(BaseModel):
    """Analyse des remboursements."""
    nombre_demandes_total: int
    nombre_approuvees: int
    nombre_rejetees: int
    nombre_remboursees: int
    montant_total_demande: float
    montant_total_rembourse: float
    montant_frais_annulation: float


class RapportFinancier(BaseModel):
    """Rapport financier complet."""
    date_debut: date
    date_fin: date
    ca_total: float
    repartition_revenus: RepartitionRevenus
    paiements_par_mode: List[PaiementsParMode]
    remboursements: AnalyseRemboursements
    top_routes: List[ChiffreAffairesRoute]
    top_bateaux: List[ChiffreAffairesBateau]


# ============================================================================
# RAPPORTS OPÉRATIONNELS
# ============================================================================

class TauxRemplissage(BaseModel):
    """Taux de remplissage d'un voyage."""
    voyage_id: int
    bateau: str
    route: str
    date_depart: datetime
    capacite_passagers: int
    passagers_embarques: int
    taux_remplissage_passagers: float
    capacite_vehicules: int
    vehicules_embarques: int
    taux_remplissage_vehicules: float
    statut_voyage: str


class PerformanceVoyage(BaseModel):
    """Performance d'un voyage."""
    voyage_id: int
    reference: str
    date_depart_programmee: datetime
    date_depart_reelle: Optional[datetime]
    retard_minutes: Optional[int]
    nombre_reservations: int
    montant_ca: float
    taux_embarquement: float
    nombre_absents: int


class StatistiquesEmbarquement(BaseModel):
    """Statistiques d'embarquement."""
    periode: str
    total_tickets: int
    tickets_embarques: int
    tickets_annules: int
    tickets_absents: int
    taux_embarquement: float
    taux_absence: float


class AnalyseFlotte(BaseModel):
    """Analyse de la flotte de bateaux."""
    total_bateaux: int
    total_voyages: int
    bateau_id: int
    nom_bateau: str
    nombre_voyages: int
    taux_utilisation: float  # % de jours avec au moins 1 voyage
    ca_genere: float
    taux_remplissage_moyen: float


class FlottePeriodeStat(BaseModel):
    """Statistiques d'un bateau par période."""
    bateau_id: int
    nom_bateau: str
    compagnie: str
    periode: str  # "2026-W23", "2026-06" ou "2026"
    nombre_voyages: int
    ca_genere: float
    taux_remplissage_moyen: float


class StatistiquesCompagnie(BaseModel):
    """Statistiques globales de la compagnie."""
    total_bateaux: int
    total_voyages: int
    total_ca: float
    taux_remplissage_global: float


class RapportOperationnel(BaseModel):
    """Rapport opérationnel complet."""
    date_debut: date
    date_fin: date
    total_voyages: int
    voyages_a_lheure: int
    voyages_retardes: int
    voyages_annules: int
    taux_ponctualite: float
    taux_remplissage_moyen: float
    taux_embarquement_moyen: float
    statistiques_flotte: List[AnalyseFlotte]


# ============================================================================
# RAPPORTS CLIENTS
# ============================================================================

class StatistiquesClients(BaseModel):
    """Statistiques des clients."""
    total_clients: int
    nouveaux_clients: int
    clients_recurrents: int
    taux_recurrence: float


class TopClient(BaseModel):
    """Top client VIP."""
    client_id: int
    nom_complet: str
    email: str
    nombre_reservations: int
    montant_total_depense: float
    derniere_reservation: datetime


class AnalyseComportement(BaseModel):
    """Analyse du comportement client."""
    classe_preferee: str
    route_preferee: str
    mode_paiement_prefere: str
    delai_moyen_reservation: float  # Jours avant départ
    panier_moyen: float


class TauxRetention(BaseModel):
    """Taux de rétention des clients."""
    periode: str
    clients_actifs_debut: int
    clients_actifs_fin: int
    clients_perdus: int
    clients_gagnes: int
    taux_retention: float
    taux_attrition: float


class RapportClients(BaseModel):
    """Rapport clients complet."""
    date_debut: date
    date_fin: date
    statistiques_clients: StatistiquesClients
    top_clients: List[TopClient]
    taux_retention: TauxRetention


# ============================================================================
# RAPPORTS GÉOGRAPHIQUES
# ============================================================================

class RoutePopulaire(BaseModel):
    """Route la plus fréquentée."""
    route_id: int
    port_depart: str
    port_arrivee: str
    nombre_voyages: int
    nombre_reservations: int
    ca_total: float
    taux_remplissage_moyen: float


class OrigineClients(BaseModel):
    """Origine géographique des clients."""
    nationalite: str
    nombre_clients: int
    nombre_reservations: int
    pourcentage: float


class RapportGeographique(BaseModel):
    """Rapport géographique complet."""
    routes_populaires: List[RoutePopulaire]
    routes_rentables: List[RoutePopulaire]
    origines_clients: List[OrigineClients]


# ============================================================================
# TENDANCES ET PRÉVISIONS
# ============================================================================

class TendanceSaisonniere(BaseModel):
    """Tendance saisonnière."""
    mois: str
    annee: int
    nombre_reservations: int
    ca_total: float
    taux_remplissage_moyen: float


class PrevisionDemande(BaseModel):
    """Prévision de la demande."""
    periode_future: str
    demande_estimee: int
    ca_estime: float
    confiance: str  # "haute", "moyenne", "basse"


class TendanceJournaliere(BaseModel):
    """Tendance par jour de la semaine."""
    jour_semaine: str
    nombre_departs: int
    nombre_reservations_moyen: int
    ca_moyen: float


# ============================================================================
# RAPPORTS ÉQUIPAGE
# ============================================================================

class StatistiquesEquipage(BaseModel):
    """Statistiques de l'équipage."""
    total_membres: int
    membres_actifs: int
    membres_en_conge: int
    membres_suspendus: int
    repartition_par_role: Dict[str, int]


class EquipageBateau(BaseModel):
    """Équipage par bateau."""
    bateau_id: int
    nom_bateau: str
    nombre_membres: int
    membres: List[Dict[str, Any]]


class CertificationsStatut(BaseModel):
    """Statut des certifications."""
    certification: str
    total: int
    valides: int
    expirees: int
    expire_bientot: int  # < 30 jours


class RapportEquipage(BaseModel):
    """Rapport équipage complet."""
    statistiques: StatistiquesEquipage
    equipages_par_bateau: List[EquipageBateau]
    certifications: List[CertificationsStatut]


# ============================================================================
# DASHBOARDS KPI
# ============================================================================

class KPIFinancier(BaseModel):
    """KPI financiers en temps réel."""
    ca_aujourdhui: float
    ca_mois_en_cours: float
    ca_annee: float
    objectif_mois: Optional[float] = None
    progression_objectif: Optional[float] = None
    panier_moyen: float
    taux_conversion: float  # % de paiements réussis


class KPIOperationnel(BaseModel):
    """KPI opérationnels en temps réel."""
    voyages_aujourdhui: int
    voyages_en_cours: int
    taux_ponctualite_jour: float
    taux_remplissage_jour: float
    incidents_jour: int


class KPIClient(BaseModel):
    """KPI clients en temps réel."""
    reservations_aujourdhui: int
    nouveaux_clients_aujourdhui: int
    total_clients_actifs: int
    satisfaction_moyenne: Optional[float] = None


class DashboardDirection(BaseModel):
    """Dashboard pour la direction."""
    date_generation: datetime
    kpi_financiers: KPIFinancier
    kpi_operationnels: KPIOperationnel
    kpi_clients: KPIClient
    alertes: List[str]


class DashboardOperations(BaseModel):
    """Dashboard pour les opérations."""
    date_generation: datetime
    voyages_aujourdhui: List[PerformanceVoyage]
    taux_remplissage_jour: float
    embarquements_en_cours: int
    incidents_signales: int


class DashboardFinances(BaseModel):
    """Dashboard pour les finances."""
    date_generation: datetime
    ca_jour: float
    ca_mois: float
    paiements_en_attente: int
    montant_en_attente: float
    remboursements_en_attente: int
    montant_remboursements: float


# ============================================================================
# PARAMÈTRES DE FILTRAGE
# ============================================================================

class FiltresRapport(BaseModel):
    """Filtres communs pour les rapports."""
    date_debut: Optional[date] = None
    date_fin: Optional[date] = None
    compagnie_id: Optional[int] = None
    bateau_id: Optional[int] = None
    route_id: Optional[int] = None
    type_reservation: Optional[str] = None  # passager, vehicule, colis


# ============================================================================
# EXPORT
# ============================================================================

class FormatExport(BaseModel):
    """Format d'export demandé."""
    format: str = Field(..., description="Format: pdf, excel, csv, json")
    inclure_graphiques: bool = Field(default=False, description="Inclure graphiques (PDF/Excel)")
    nom_fichier: Optional[str] = Field(None, description="Nom du fichier personnalisé")


class ExportResponse(BaseModel):
    """Réponse après export."""
    success: bool
    format: str
    url_telechargement: Optional[str] = None
    nom_fichier: str
    taille_octets: int
    message: Optional[str] = None
