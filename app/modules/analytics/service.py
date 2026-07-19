"""Service pour les analytics et rapports - Partie 1."""
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import select, func, and_, case, extract
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, aliased

from app.models.reservation import (
    Reservation, ReservationPassager, ReservationVehicule,
    StatutReservation, TypeReservation,
)
from app.models.paiement import Paiement, StatutPaiement, ModePaiement
from app.models.remboursement import Remboursement, StatutRemboursement
from app.models.voyage import ProgrammeVoyage, StatutVoyage
from app.models.traversee import Traversee
from app.models.compagnie import Bateau, CompagnieBateau
from app.models.geographie import Port
from app.models.utilisateur import Utilisateur
from app.models.ticket import Ticket
from app.models.embarquement_log import EmbarquementLog
from app.models.equipage import MembreEquipage, EquipageRole, Certification, EquipageCertification, StatutEquipage

from app.modules.analytics import schemas


class AnalyticsService:
    """Service pour générer tous les rapports et analytics."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # RAPPORTS FINANCIERS
    # ========================================================================

    async def get_chiffre_affaires_periode(
        self,
        date_debut: date,
        date_fin: date,
        grouper_par: str = "mois"  # "jour", "mois", "annee"
    ) -> List[schemas.ChiffreAffairesPeriode]:
        """Chiffre d'affaires par période avec détail par type."""

        if grouper_par == "jour":
            date_format = func.to_char(Reservation.date_reservation, 'YYYY-MM-DD')
        elif grouper_par == "mois":
            date_format = func.to_char(Reservation.date_reservation, 'YYYY-MM')
        else:  # annee
            date_format = func.extract('year', Reservation.date_reservation)

        query = select(
            date_format.label('periode'),
            func.count(Reservation.id).label('nombre_reservations'),
            func.sum(Reservation.montant_total).label('montant_total'),
            func.sum(
                case(
                    (Reservation.type_reservation == TypeReservation.passager, Reservation.montant_total),
                    else_=0
                )
            ).label('montant_passagers'),
            func.sum(
                case(
                    (Reservation.type_reservation == TypeReservation.vehicule, Reservation.montant_total),
                    else_=0
                )
            ).label('montant_vehicules'),
            func.sum(
                case(
                    (Reservation.type_reservation == TypeReservation.colis, Reservation.montant_total),
                    else_=0
                )
            ).label('montant_colis'),
        ).where(
            and_(
                Reservation.date_reservation >= date_debut,
                Reservation.date_reservation <= date_fin,
                Reservation.statut_reservation == StatutReservation.confirme
            )
        ).group_by('periode').order_by('periode')

        result = await self.db.execute(query)
        rows = result.all()

        return [
            schemas.ChiffreAffairesPeriode(
                periode=str(row.periode),
                nombre_reservations=row.nombre_reservations,
                montant_total=float(row.montant_total or 0),
                montant_passagers=float(row.montant_passagers or 0),
                montant_vehicules=float(row.montant_vehicules or 0),
                montant_colis=float(row.montant_colis or 0),
            )
            for row in rows
        ]

    async def get_ca_par_route(
        self,
        date_debut: date,
        date_fin: date,
        limit: int = 10
    ) -> List[schemas.ChiffreAffairesRoute]:
        """Top routes par chiffre d'affaires."""

        PortDepart = aliased(Port)
        PortArrivee = aliased(Port)

        query = select(
            Traversee.id.label('route_id'),
            PortDepart.nom.label('port_depart'),
            PortArrivee.nom.label('port_arrivee'),
            func.count(func.distinct(ProgrammeVoyage.id)).label('nombre_voyages'),
            func.count(Reservation.id).label('nombre_reservations'),
            func.sum(Reservation.montant_total).label('montant_total'),
        ).select_from(Reservation).join(
            ProgrammeVoyage, Reservation.voyage_id == ProgrammeVoyage.id
        ).join(
            Traversee, ProgrammeVoyage.route_id == Traversee.id
        ).join(
            PortDepart, Traversee.port_depart_id == PortDepart.id
        ).join(
            PortArrivee, Traversee.port_arrivee_id == PortArrivee.id
        ).where(
            and_(
                Reservation.date_reservation >= date_debut,
                Reservation.date_reservation <= date_fin,
                Reservation.statut_reservation == StatutReservation.confirme
            )
        ).group_by(
            Traversee.id, PortDepart.nom, PortArrivee.nom
        ).order_by(
            func.sum(Reservation.montant_total).desc()
        ).limit(limit)

        result = await self.db.execute(query)
        rows = result.all()

        return [
            schemas.ChiffreAffairesRoute(
                route_id=row.route_id,
                port_depart=row.port_depart,
                port_arrivee=row.port_arrivee,
                montant_total=float(row.montant_total or 0),
                nombre_voyages=row.nombre_voyages,
                nombre_reservations=row.nombre_reservations,
            )
            for row in rows
        ]

    async def get_ca_par_bateau(
        self,
        date_debut: date,
        date_fin: date,
        limit: int = 10
    ) -> List[schemas.ChiffreAffairesBateau]:
        """Top bateaux par chiffre d'affaires."""

        query = select(
            Bateau.id.label('bateau_id'),
            Bateau.nom.label('nom_bateau'),
            CompagnieBateau.nom.label('compagnie'),
            func.count(func.distinct(ProgrammeVoyage.id)).label('nombre_voyages'),
            func.count(Reservation.id).label('nombre_reservations'),
            func.sum(Reservation.montant_total).label('montant_total'),
        ).select_from(Reservation).join(
            ProgrammeVoyage, Reservation.voyage_id == ProgrammeVoyage.id
        ).join(
            Bateau, ProgrammeVoyage.bateau_id == Bateau.id
        ).join(
            CompagnieBateau, Bateau.compagnie_id == CompagnieBateau.id
        ).where(
            and_(
                Reservation.date_reservation >= date_debut,
                Reservation.date_reservation <= date_fin,
                Reservation.statut_reservation == StatutReservation.confirme
            )
        ).group_by(
            Bateau.id, Bateau.nom, CompagnieBateau.nom
        ).order_by(
            func.sum(Reservation.montant_total).desc()
        ).limit(limit)

        result = await self.db.execute(query)
        rows = result.all()

        return [
            schemas.ChiffreAffairesBateau(
                bateau_id=row.bateau_id,
                nom_bateau=row.nom_bateau,
                compagnie=row.compagnie,
                montant_total=float(row.montant_total or 0),
                nombre_voyages=row.nombre_voyages,
                nombre_reservations=row.nombre_reservations,
            )
            for row in rows
        ]

    async def get_repartition_revenus(
        self,
        date_debut: date,
        date_fin: date
    ) -> schemas.RepartitionRevenus:
        """Répartition des revenus par type de réservation."""

        query = select(
            func.sum(Reservation.montant_total).label('total_ca'),
            func.sum(
                case(
                    (Reservation.type_reservation == TypeReservation.passager, Reservation.montant_total),
                    else_=0
                )
            ).label('ca_passagers'),
            func.sum(
                case(
                    (Reservation.type_reservation == TypeReservation.vehicule, Reservation.montant_total),
                    else_=0
                )
            ).label('ca_vehicules'),
            func.sum(
                case(
                    (Reservation.type_reservation == TypeReservation.colis, Reservation.montant_total),
                    else_=0
                )
            ).label('ca_colis'),
        ).where(
            and_(
                Reservation.date_reservation >= date_debut,
                Reservation.date_reservation <= date_fin,
                Reservation.statut_reservation == StatutReservation.confirme
            )
        )

        result = await self.db.execute(query)
        row = result.one()

        total_ca = float(row.total_ca or 0)
        ca_passagers = float(row.ca_passagers or 0)
        ca_vehicules = float(row.ca_vehicules or 0)
        ca_colis = float(row.ca_colis or 0)

        return schemas.RepartitionRevenus(
            total_ca=total_ca,
            ca_passagers=ca_passagers,
            ca_vehicules=ca_vehicules,
            ca_colis=ca_colis,
            pourcentage_passagers=round((ca_passagers / total_ca * 100) if total_ca > 0 else 0, 2),
            pourcentage_vehicules=round((ca_vehicules / total_ca * 100) if total_ca > 0 else 0, 2),
            pourcentage_colis=round((ca_colis / total_ca * 100) if total_ca > 0 else 0, 2),
        )

    async def get_paiements_par_mode(
        self,
        date_debut: date,
        date_fin: date
    ) -> List[schemas.PaiementsParMode]:
        """Statistiques de paiements par mode de paiement."""

        query = select(
            Paiement.mode_paiement,
            func.count(Paiement.id).label('nombre_transactions'),
            func.sum(Paiement.montant).label('montant_total'),
            func.count(
                case((Paiement.statut == StatutPaiement.reussi, 1))
            ).label('nombre_reussis'),
        ).join(
            Reservation, Paiement.reservation_id == Reservation.id
        ).where(
            and_(
                Reservation.date_reservation >= date_debut,
                Reservation.date_reservation <= date_fin
            )
        ).group_by(Paiement.mode_paiement)

        result = await self.db.execute(query)
        rows = result.all()

        # Calculer le total pour les pourcentages
        total_montant = sum(float(row.montant_total or 0) for row in rows)

        return [
            schemas.PaiementsParMode(
                mode_paiement=row.mode_paiement.value,
                nombre_transactions=row.nombre_transactions,
                montant_total=float(row.montant_total or 0),
                pourcentage=round(
                    (float(row.montant_total or 0) / total_montant * 100) if total_montant > 0 else 0,
                    2
                ),
                taux_reussite=round(
                    (row.nombre_reussis / row.nombre_transactions * 100) if row.nombre_transactions > 0 else 0,
                    2
                ),
            )
            for row in rows
        ]

    async def get_analyse_remboursements(
        self,
        date_debut: date,
        date_fin: date
    ) -> schemas.AnalyseRemboursements:
        """Analyse des remboursements."""

        query = select(
            func.count(Remboursement.id).label('nombre_total'),
            func.count(
                case((Remboursement.statut == StatutRemboursement.approuve, 1))
            ).label('nombre_approuvees'),
            func.count(
                case((Remboursement.statut == StatutRemboursement.rejete, 1))
            ).label('nombre_rejetees'),
            func.count(
                case((Remboursement.statut == StatutRemboursement.rembourse, 1))
            ).label('nombre_remboursees'),
            func.sum(Remboursement.montant_rembourser).label('montant_total_demande'),
            func.sum(
                case(
                    (Remboursement.statut == StatutRemboursement.rembourse, Remboursement.montant_rembourser),
                    else_=0
                )
            ).label('montant_total_rembourse'),
            func.sum(Remboursement.frais_annulation).label('montant_frais'),
        ).where(
            and_(
                Remboursement.date_demande >= date_debut,
                Remboursement.date_demande <= date_fin
            )
        )

        result = await self.db.execute(query)
        row = result.one()

        return schemas.AnalyseRemboursements(
            nombre_demandes_total=row.nombre_total or 0,
            nombre_approuvees=row.nombre_approuvees or 0,
            nombre_rejetees=row.nombre_rejetees or 0,
            nombre_remboursees=row.nombre_remboursees or 0,
            montant_total_demande=float(row.montant_total_demande or 0),
            montant_total_rembourse=float(row.montant_total_rembourse or 0),
            montant_frais_annulation=float(row.montant_frais or 0),
        )

    async def get_rapport_financier_complet(
        self,
        date_debut: date,
        date_fin: date
    ) -> schemas.RapportFinancier:
        """Rapport financier complet."""

        # Récupérer tous les composants
        repartition = await self.get_repartition_revenus(date_debut, date_fin)
        paiements = await self.get_paiements_par_mode(date_debut, date_fin)
        remboursements = await self.get_analyse_remboursements(date_debut, date_fin)
        top_routes = await self.get_ca_par_route(date_debut, date_fin, limit=5)
        top_bateaux = await self.get_ca_par_bateau(date_debut, date_fin, limit=5)

        return schemas.RapportFinancier(
            date_debut=date_debut,
            date_fin=date_fin,
            ca_total=repartition.total_ca,
            repartition_revenus=repartition,
            paiements_par_mode=paiements,
            remboursements=remboursements,
            top_routes=top_routes,
            top_bateaux=top_bateaux,
        )

    # ========================================================================
    # RAPPORTS OPÉRATIONNELS
    # ========================================================================

    async def get_taux_remplissage_voyages(
        self,
        date_debut: date,
        date_fin: date
    ) -> List[schemas.TauxRemplissage]:
        """Taux de remplissage des voyages."""

        query = select(ProgrammeVoyage).where(
            and_(
                ProgrammeVoyage.date_depart_programme >= date_debut,
                ProgrammeVoyage.date_depart_programme <= date_fin
            )
        ).options(
            selectinload(ProgrammeVoyage.bateau),
            selectinload(ProgrammeVoyage.route).selectinload(Traversee.port_depart),
            selectinload(ProgrammeVoyage.route).selectinload(Traversee.port_arrivee)
        )

        result = await self.db.execute(query)
        voyages = result.scalars().all()

        resultats = []
        for voyage in voyages:
            route_str = f"{voyage.route.port_depart.nom} → {voyage.route.port_arrivee.nom}" if voyage.route else "N/A"

            taux_pass = round(
                (voyage.places_vendues_passagers / voyage.places_disponibles_passagers * 100)
                if voyage.places_disponibles_passagers > 0 else 0,
                2
            )

            taux_veh = round(
                (voyage.places_vendues_vehicules / voyage.places_disponibles_vehicules * 100)
                if voyage.places_disponibles_vehicules > 0 else 0,
                2
            )

            resultats.append(schemas.TauxRemplissage(
                voyage_id=voyage.id,
                bateau=voyage.bateau.nom,
                route=route_str,
                date_depart=voyage.date_depart_programme,
                capacite_passagers=voyage.places_disponibles_passagers,
                passagers_embarques=voyage.places_vendues_passagers,
                taux_remplissage_passagers=taux_pass,
                capacite_vehicules=voyage.places_disponibles_vehicules,
                vehicules_embarques=voyage.places_vendues_vehicules,
                taux_remplissage_vehicules=taux_veh,
                statut_voyage=voyage.statut.value,
            ))

        return resultats

    async def get_performance_voyages(
        self,
        date_debut: date,
        date_fin: date
    ) -> List[schemas.PerformanceVoyage]:
        """Performance des voyages (ponctualité, CA, embarquement)."""

        query = select(
            ProgrammeVoyage.id,
            ProgrammeVoyage.date_depart_programme,
            ProgrammeVoyage.date_depart_reel,
            Bateau.nom.label('bateau_nom'),
            func.count(Reservation.id).label('nombre_reservations'),
            func.sum(Reservation.montant_total).label('montant_ca'),
        ).select_from(ProgrammeVoyage).join(
            Bateau, ProgrammeVoyage.bateau_id == Bateau.id
        ).outerjoin(
            Reservation, ProgrammeVoyage.id == Reservation.voyage_id
        ).where(
            and_(
                ProgrammeVoyage.date_depart_programme >= date_debut,
                ProgrammeVoyage.date_depart_programme <= date_fin
            )
        ).group_by(
            ProgrammeVoyage.id,
            ProgrammeVoyage.date_depart_programme,
            ProgrammeVoyage.date_depart_reel,
            Bateau.nom
        )

        result = await self.db.execute(query)
        rows = result.all()

        resultats = []
        for row in rows:
            retard_minutes = None
            if row.date_depart_reel and row.date_depart_programme:
                delta = row.date_depart_reel - row.date_depart_programme
                retard_minutes = int(delta.total_seconds() / 60)

            # Calculer taux d'embarquement
            # TODO: Améliorer avec les vraies données d'embarquement
            taux_embarquement = 95.0  # Placeholder

            resultats.append(schemas.PerformanceVoyage(
                voyage_id=row.id,
                reference=f"VOY-{row.id}",
                date_depart_programmee=row.date_depart_programme,
                date_depart_reelle=row.date_depart_reel,
                retard_minutes=retard_minutes,
                nombre_reservations=row.nombre_reservations or 0,
                montant_ca=float(row.montant_ca or 0),
                taux_embarquement=taux_embarquement,
                nombre_absents=0,  # Placeholder
            ))

        return resultats

    async def get_statistiques_embarquement(
        self,
        date_debut: date,
        date_fin: date,
        grouper_par: str = "mois"
    ) -> List[schemas.StatistiquesEmbarquement]:
        """Statistiques d'embarquement par période."""

        if grouper_par == "jour":
            date_format = func.to_char(Ticket.date_embarquement, 'YYYY-MM-DD')
        else:  # mois
            date_format = func.to_char(Ticket.date_embarquement, 'YYYY-MM')

        query = select(
            date_format.label('periode'),
            func.count(Ticket.id).label('total_tickets'),
            func.count(case((Ticket.embarque == True, 1))).label('tickets_embarques'),
        ).join(
            Reservation, Ticket.reservation_id == Reservation.id
        ).where(
            and_(
                Reservation.date_reservation >= date_debut,
                Reservation.date_reservation <= date_fin
            )
        ).group_by('periode').order_by('periode')

        result = await self.db.execute(query)
        rows = result.all()

        resultats = []
        for row in rows:
            total = row.total_tickets or 0
            embarques = row.tickets_embarques or 0
            absents = total - embarques

            taux_emb = round((embarques / total * 100) if total > 0 else 0, 2)
            taux_abs = round((absents / total * 100) if total > 0 else 0, 2)

            resultats.append(schemas.StatistiquesEmbarquement(
                periode=str(row.periode),
                total_tickets=total,
                tickets_embarques=embarques,
                tickets_annules=0,  # TODO: Ajouter champ
                tickets_absents=absents,
                taux_embarquement=taux_emb,
                taux_absence=taux_abs,
            ))

        return resultats

    async def get_analyse_flotte(
        self,
        date_debut: date,
        date_fin: date
    ) -> List[schemas.AnalyseFlotte]:
        """Analyse de la flotte de bateaux."""

        # Compter le total de bateaux
        query_total_bateaux = select(func.count(Bateau.id))
        result_total = await self.db.execute(query_total_bateaux)
        total_bateaux = result_total.scalar() or 0

        # Statistiques par bateau
        query = select(
            Bateau.id.label('bateau_id'),
            Bateau.nom.label('nom_bateau'),
            func.count(func.distinct(ProgrammeVoyage.id)).label('nombre_voyages'),
            func.sum(Reservation.montant_total).label('ca_genere'),
            func.avg(
                case(
                    (ProgrammeVoyage.places_disponibles_passagers > 0,
                     (ProgrammeVoyage.places_vendues_passagers * 100.0 / ProgrammeVoyage.places_disponibles_passagers))
                )
            ).label('taux_remplissage_moyen'),
        ).select_from(Bateau).outerjoin(
            ProgrammeVoyage, Bateau.id == ProgrammeVoyage.bateau_id
        ).outerjoin(
            Reservation, ProgrammeVoyage.id == Reservation.voyage_id
        ).where(
            and_(
                ProgrammeVoyage.date_depart_programme >= date_debut,
                ProgrammeVoyage.date_depart_programme <= date_fin
            )
        ).group_by(
            Bateau.id, Bateau.nom
        )

        result = await self.db.execute(query)
        rows = result.all()

        # Calculer taux d'utilisation (jours avec voyages / jours totaux)
        nb_jours = (date_fin - date_debut).days + 1

        resultats = []
        for row in rows:
            taux_utilisation = round(
                (row.nombre_voyages / nb_jours * 100) if nb_jours > 0 else 0,
                2
            )

            resultats.append(schemas.AnalyseFlotte(
                total_bateaux=total_bateaux,
                total_voyages=row.nombre_voyages or 0,
                bateau_id=row.bateau_id,
                nom_bateau=row.nom_bateau,
                nombre_voyages=row.nombre_voyages or 0,
                taux_utilisation=taux_utilisation,
                ca_genere=float(row.ca_genere or 0),
                taux_remplissage_moyen=round(float(row.taux_remplissage_moyen or 0), 2),
            ))

        return resultats

    async def get_flotte_par_periode(
        self,
        date_debut: date,
        date_fin: date,
        grouper_par: str = "mois"
    ) -> List[schemas.FlottePeriodeStat]:
        """Statistiques des bateaux avec regroupement hebdomadaire/mensuel/annuel."""

        if grouper_par == "semaine":
            periode_sql = func.to_char(ProgrammeVoyage.date_depart_programme, 'IYYY-IW')
        elif grouper_par == "mois":
            periode_sql = func.to_char(ProgrammeVoyage.date_depart_programme, 'YYYY-MM')
        else:  # annee
            periode_sql = func.to_char(ProgrammeVoyage.date_depart_programme, 'YYYY')

        query = select(
            Bateau.id.label('bateau_id'),
            Bateau.nom.label('nom_bateau'),
            CompagnieBateau.nom.label('compagnie'),
            periode_sql.label('periode'),
            func.count(func.distinct(ProgrammeVoyage.id)).label('nombre_voyages'),
            func.coalesce(func.sum(Reservation.montant_total), 0).label('ca_genere'),
            func.avg(
                case(
                    (ProgrammeVoyage.places_disponibles_passagers > 0,
                     (ProgrammeVoyage.places_vendues_passagers * 100.0 / ProgrammeVoyage.places_disponibles_passagers))
                )
            ).label('taux_remplissage_moyen'),
        ).select_from(Bateau).join(
            CompagnieBateau, Bateau.compagnie_id == CompagnieBateau.id
        ).outerjoin(
            ProgrammeVoyage, Bateau.id == ProgrammeVoyage.bateau_id
        ).outerjoin(
            Reservation, ProgrammeVoyage.id == Reservation.voyage_id
        ).where(
            and_(
                ProgrammeVoyage.date_depart_programme >= date_debut,
                ProgrammeVoyage.date_depart_programme <= date_fin
            )
        ).group_by(
            Bateau.id, Bateau.nom, CompagnieBateau.nom, 'periode'
        ).order_by(
            Bateau.id, 'periode'
        )

        result = await self.db.execute(query)
        rows = result.all()

        return [
            schemas.FlottePeriodeStat(
                bateau_id=row.bateau_id,
                nom_bateau=row.nom_bateau,
                compagnie=row.compagnie,
                periode=row.periode,
                nombre_voyages=row.nombre_voyages or 0,
                ca_genere=float(row.ca_genere or 0),
                taux_remplissage_moyen=round(float(row.taux_remplissage_moyen or 0), 2),
            )
            for row in rows
        ]

    async def get_statistiques_compagnie(
        self,
        date_debut: date,
        date_fin: date
    ) -> schemas.StatistiquesCompagnie:
        """Statistiques globales de la compagnie (tous bateaux)."""

        query = select(
            func.count(func.distinct(Bateau.id)).label('total_bateaux'),
            func.count(func.distinct(ProgrammeVoyage.id)).label('total_voyages'),
            func.coalesce(func.sum(Reservation.montant_total), 0).label('total_ca'),
            func.avg(
                case(
                    (ProgrammeVoyage.places_disponibles_passagers > 0,
                     (ProgrammeVoyage.places_vendues_passagers * 100.0 / ProgrammeVoyage.places_disponibles_passagers))
                )
            ).label('taux_remplissage_global'),
        ).select_from(Bateau).outerjoin(
            ProgrammeVoyage, Bateau.id == ProgrammeVoyage.bateau_id
        ).outerjoin(
            Reservation, ProgrammeVoyage.id == Reservation.voyage_id
        ).where(
            and_(
                ProgrammeVoyage.date_depart_programme >= date_debut,
                ProgrammeVoyage.date_depart_programme <= date_fin
            )
        )

        result = await self.db.execute(query)
        row = result.one()

        return schemas.StatistiquesCompagnie(
            total_bateaux=row.total_bateaux or 0,
            total_voyages=row.total_voyages or 0,
            total_ca=float(row.total_ca or 0),
            taux_remplissage_global=round(float(row.taux_remplissage_global or 0), 2),
        )

    async def get_rapport_operationnel_complet(
        self,
        date_debut: date,
        date_fin: date
    ) -> schemas.RapportOperationnel:
        """Rapport opérationnel complet."""

        # Statistiques globales des voyages
        query_voyages = select(
            func.count(ProgrammeVoyage.id).label('total_voyages'),
            func.count(
                case((ProgrammeVoyage.statut == StatutVoyage.confirme, 1))
            ).label('voyages_a_lheure'),
            func.count(
                case((ProgrammeVoyage.statut == StatutVoyage.retarde, 1))
            ).label('voyages_retardes'),
            func.count(
                case((ProgrammeVoyage.statut == StatutVoyage.annule, 1))
            ).label('voyages_annules'),
            func.avg(
                case(
                    (ProgrammeVoyage.places_disponibles_passagers > 0,
                     (ProgrammeVoyage.places_vendues_passagers * 100.0 / ProgrammeVoyage.places_disponibles_passagers))
                )
            ).label('taux_remplissage_moyen'),
        ).where(
            and_(
                ProgrammeVoyage.date_depart_programme >= date_debut,
                ProgrammeVoyage.date_depart_programme <= date_fin
            )
        )

        result_voyages = await self.db.execute(query_voyages)
        row_voyages = result_voyages.one()

        # Taux d'embarquement moyen
        query_embarquement = select(
            func.count(Ticket.id).label('total'),
            func.count(case((Ticket.embarque == True, 1))).label('embarques'),
        ).join(
            Reservation, Ticket.reservation_id == Reservation.id
        ).where(
            and_(
                Reservation.date_reservation >= date_debut,
                Reservation.date_reservation <= date_fin
            )
        )

        result_emb = await self.db.execute(query_embarquement)
        row_emb = result_emb.one()

        taux_embarquement_moyen = round(
            (row_emb.embarques / row_emb.total * 100) if row_emb.total > 0 else 0,
            2
        )

        # Taux de ponctualité
        total_voy = row_voyages.total_voyages or 0
        taux_ponctualite = round(
            (row_voyages.voyages_a_lheure / total_voy * 100) if total_voy > 0 else 0,
            2
        )

        # Analyse flotte
        flotte = await self.get_analyse_flotte(date_debut, date_fin)

        return schemas.RapportOperationnel(
            date_debut=date_debut,
            date_fin=date_fin,
            total_voyages=total_voy,
            voyages_a_lheure=row_voyages.voyages_a_lheure or 0,
            voyages_retardes=row_voyages.voyages_retardes or 0,
            voyages_annules=row_voyages.voyages_annules or 0,
            taux_ponctualite=taux_ponctualite,
            taux_remplissage_moyen=round(float(row_voyages.taux_remplissage_moyen or 0), 2),
            taux_embarquement_moyen=taux_embarquement_moyen,
            statistiques_flotte=flotte,
        )

    # ========================================================================
    # RAPPORTS CLIENTS
    # ========================================================================

    async def get_statistiques_clients(
        self,
        date_debut: date,
        date_fin: date
    ) -> schemas.StatistiquesClients:
        """Statistiques des clients basées sur ReservationPassager (vrais passagers)."""

        # Total passagers uniques (par email) dans la période
        query_total = select(
            func.count(func.distinct(ReservationPassager.email))
        ).join(
            Reservation, ReservationPassager.reservation_id == Reservation.id
        ).where(
            and_(
                Reservation.date_reservation >= date_debut,
                Reservation.date_reservation <= date_fin,
                Reservation.statut_reservation == StatutReservation.confirme,
                ReservationPassager.email.isnot(None)
            )
        )
        result_total = await self.db.execute(query_total)
        total_clients = result_total.scalar() or 0

        # Nouveaux passagers (première apparition de l'email dans une réservation confirmée)
        subquery_first = select(
            ReservationPassager.email,
            func.min(Reservation.date_reservation).label('premiere_date')
        ).join(
            Reservation, ReservationPassager.reservation_id == Reservation.id
        ).where(
            Reservation.statut_reservation == StatutReservation.confirme
        ).group_by(ReservationPassager.email).subquery()

        query_nouveaux = select(
            func.count(func.distinct(subquery_first.c.email))
        ).where(
            and_(
                subquery_first.c.premiere_date >= date_debut,
                subquery_first.c.premiere_date <= date_fin
            )
        )
        result_nouveaux = await self.db.execute(query_nouveaux)
        nouveaux_clients = result_nouveaux.scalar() or 0

        # Passagers récurrents (même email dans >1 réservation confirmée)
        query_recurrents = select(
            func.count(func.distinct(ReservationPassager.email))
        ).where(
            ReservationPassager.email.in_(
                select(ReservationPassager.email)
                .join(Reservation, ReservationPassager.reservation_id == Reservation.id)
                .where(
                    Reservation.statut_reservation == StatutReservation.confirme,
                    ReservationPassager.email.isnot(None)
                )
                .group_by(ReservationPassager.email)
                .having(func.count(ReservationPassager.id) > 1)
            )
        )
        result_recurrents = await self.db.execute(query_recurrents)
        clients_recurrents = result_recurrents.scalar() or 0

        taux_recurrence = round(
            (clients_recurrents / total_clients * 100) if total_clients > 0 else 0,
            2
        )

        return schemas.StatistiquesClients(
            total_clients=total_clients,
            nouveaux_clients=nouveaux_clients,
            clients_recurrents=clients_recurrents,
            taux_recurrence=taux_recurrence,
        )

    async def get_top_clients(
        self,
        date_debut: date,
        date_fin: date,
        limit: int = 10
    ) -> List[schemas.TopClient]:
        """Top passagers par dépense totale (basé sur ReservationPassager)."""

        query = select(
            func.min(ReservationPassager.id).label('client_id'),
            ReservationPassager.nom_complet,
            ReservationPassager.email,
            func.count(func.distinct(Reservation.id)).label('nombre_reservations'),
            func.sum(Reservation.montant_total).label('montant_total'),
            func.max(Reservation.date_reservation).label('derniere_reservation'),
        ).join(
            Reservation, ReservationPassager.reservation_id == Reservation.id
        ).where(
            and_(
                Reservation.date_reservation >= date_debut,
                Reservation.date_reservation <= date_fin,
                Reservation.statut_reservation == StatutReservation.confirme,
                ReservationPassager.email.isnot(None)
            )
        ).group_by(
            ReservationPassager.email, ReservationPassager.nom_complet
        ).order_by(
            func.sum(Reservation.montant_total).desc()
        ).limit(limit)

        result = await self.db.execute(query)
        rows = result.all()

        return [
            schemas.TopClient(
                client_id=int(row.client_id),
                nom_complet=row.nom_complet or "N/A",
                email=row.email,
                nombre_reservations=row.nombre_reservations,
                montant_total_depense=float(row.montant_total or 0),
                derniere_reservation=row.derniere_reservation,
            )
            for row in rows
        ]

    async def get_rapport_clients_complet(
        self,
        date_debut: date,
        date_fin: date
    ) -> schemas.RapportClients:
        """Rapport clients complet."""

        stats = await self.get_statistiques_clients(date_debut, date_fin)
        top_clients = await self.get_top_clients(date_debut, date_fin)

        # Taux de rétention (simplifié)
        # Comparer les clients actifs début vs fin
        taux_retention = schemas.TauxRetention(
            periode=f"{date_debut} - {date_fin}",
            clients_actifs_debut=stats.total_clients,
            clients_actifs_fin=stats.total_clients,
            clients_perdus=0,  # Placeholder
            clients_gagnes=stats.nouveaux_clients,
            taux_retention=95.0,  # Placeholder
            taux_attrition=5.0,  # Placeholder
        )

        return schemas.RapportClients(
            date_debut=date_debut,
            date_fin=date_fin,
            statistiques_clients=stats,
            top_clients=top_clients,
            taux_retention=taux_retention,
        )

    # ========================================================================
    # RAPPORTS GÉOGRAPHIQUES
    # ========================================================================

    async def get_routes_populaires(
        self,
        date_debut: date,
        date_fin: date,
        limit: int = 10
    ) -> List[schemas.RoutePopulaire]:
        """Routes les plus fréquentées."""

        PortDepart = aliased(Port)
        PortArrivee = aliased(Port)

        query = select(
            Traversee.id.label('route_id'),
            PortDepart.nom.label('port_depart'),
            PortArrivee.nom.label('port_arrivee'),
            func.count(func.distinct(ProgrammeVoyage.id)).label('nombre_voyages'),
            func.count(Reservation.id).label('nombre_reservations'),
            func.sum(Reservation.montant_total).label('ca_total'),
            func.avg(
                case(
                    (ProgrammeVoyage.places_disponibles_passagers > 0,
                     (ProgrammeVoyage.places_vendues_passagers * 100.0 / ProgrammeVoyage.places_disponibles_passagers))
                )
            ).label('taux_remplissage_moyen'),
        ).select_from(Traversee).join(
            PortDepart, Traversee.port_depart_id == PortDepart.id
        ).join(
            PortArrivee, Traversee.port_arrivee_id == PortArrivee.id
        ).join(
            ProgrammeVoyage, Traversee.id == ProgrammeVoyage.route_id
        ).outerjoin(
            Reservation, ProgrammeVoyage.id == Reservation.voyage_id
        ).where(
            and_(
                ProgrammeVoyage.date_depart_programme >= date_debut,
                ProgrammeVoyage.date_depart_programme <= date_fin
            )
        ).group_by(
            Traversee.id, PortDepart.nom, PortArrivee.nom
        ).order_by(
            func.count(Reservation.id).desc()
        ).limit(limit)

        result = await self.db.execute(query)
        rows = result.all()

        return [
            schemas.RoutePopulaire(
                route_id=row.route_id,
                port_depart=row.port_depart,
                port_arrivee=row.port_arrivee,
                nombre_voyages=row.nombre_voyages or 0,
                nombre_reservations=row.nombre_reservations or 0,
                ca_total=float(row.ca_total or 0),
                taux_remplissage_moyen=round(float(row.taux_remplissage_moyen or 0), 2),
            )
            for row in rows
        ]

    async def get_origines_clients(
        self,
        date_debut: date,
        date_fin: date,
        limit: int = 10
    ) -> List[schemas.OrigineClients]:
        """Origine géographique des passagers (email passager → nationalité utilisateur)."""

        # Sous-requête : emails des passagers uniques dans la période
        passager_emails = select(
            ReservationPassager.email
        ).join(
            Reservation, ReservationPassager.reservation_id == Reservation.id
        ).where(
            and_(
                Reservation.date_reservation >= date_debut,
                Reservation.date_reservation <= date_fin,
                ReservationPassager.email.isnot(None)
            )
        ).distinct().subquery()

        query = select(
            Utilisateur.nationalite,
            func.count(func.distinct(Utilisateur.id)).label('nombre_clients'),
            func.count(func.distinct(ReservationPassager.id)).label('nombre_reservations'),
        ).join(
            passager_emails, Utilisateur.email == passager_emails.c.email
        ).join(
            ReservationPassager, ReservationPassager.email == Utilisateur.email
        ).where(
            Utilisateur.nationalite.isnot(None)
        ).group_by(
            Utilisateur.nationalite
        ).order_by(
            func.count(func.distinct(ReservationPassager.id)).desc()
        ).limit(limit)

        result = await self.db.execute(query)
        rows = result.all()

        total = sum(row.nombre_reservations for row in rows)

        return [
            schemas.OrigineClients(
                nationalite=row.nationalite,
                nombre_clients=row.nombre_clients,
                nombre_reservations=row.nombre_reservations,
                pourcentage=round(
                    (row.nombre_reservations / total * 100) if total > 0 else 0, 2
                ),
            )
            for row in rows
        ]

    async def get_rapport_geographique_complet(
        self,
        date_debut: date,
        date_fin: date
    ) -> schemas.RapportGeographique:
        """Rapport géographique complet."""

        routes_pop = await self.get_routes_populaires(date_debut, date_fin)

        # Routes rentables = même requête mais triée par CA
        routes_rentables = await self.get_ca_par_route(date_debut, date_fin, limit=5)
        routes_rentables_formatted = [
            schemas.RoutePopulaire(
                route_id=r.route_id,
                port_depart=r.port_depart,
                port_arrivee=r.port_arrivee,
                nombre_voyages=r.nombre_voyages,
                nombre_reservations=r.nombre_reservations,
                ca_total=r.montant_total,
                taux_remplissage_moyen=0.0,  # Pas calculé ici
            )
            for r in routes_rentables
        ]

        origines = await self.get_origines_clients(date_debut, date_fin)

        return schemas.RapportGeographique(
            routes_populaires=routes_pop,
            routes_rentables=routes_rentables_formatted,
            origines_clients=origines,
        )

    # ========================================================================
    # TENDANCES ET PRÉVISIONS
    # ========================================================================

    async def get_tendances_saisonnieres(
        self,
        annee: Optional[int] = None
    ) -> List[schemas.TendanceSaisonniere]:
        """Tendances saisonnières par mois."""

        if not annee:
            annee = datetime.now().year

        query = select(
            extract('month', Reservation.date_reservation).label('mois'),
            extract('year', Reservation.date_reservation).label('annee'),
            func.count(Reservation.id).label('nombre_reservations'),
            func.sum(Reservation.montant_total).label('ca_total'),
            func.avg(
                select(
                    case(
                        (ProgrammeVoyage.places_disponibles_passagers > 0,
                         (ProgrammeVoyage.places_vendues_passagers * 100.0 / ProgrammeVoyage.places_disponibles_passagers))
                    )
                ).where(ProgrammeVoyage.id == Reservation.voyage_id).scalar_subquery()
            ).label('taux_remplissage_moyen'),
        ).where(
            extract('year', Reservation.date_reservation) == annee
        ).group_by(
            'mois', 'annee'
        ).order_by('mois')

        result = await self.db.execute(query)
        rows = result.all()

        mois_noms = {
            1: "Janvier", 2: "Février", 3: "Mars", 4: "Avril",
            5: "Mai", 6: "Juin", 7: "Juillet", 8: "Août",
            9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre"
        }

        return [
            schemas.TendanceSaisonniere(
                mois=mois_noms.get(int(row.mois), f"Mois {row.mois}"),
                annee=int(row.annee),
                nombre_reservations=row.nombre_reservations or 0,
                ca_total=float(row.ca_total or 0),
                taux_remplissage_moyen=round(float(row.taux_remplissage_moyen or 0), 2),
            )
            for row in rows
        ]

    async def get_tendances_journalieres(
        self,
        date_debut: date,
        date_fin: date
    ) -> List[schemas.TendanceJournaliere]:
        """Tendances par jour de la semaine."""

        query = select(
            extract('dow', ProgrammeVoyage.date_depart_programme).label('jour_semaine'),
            func.count(func.distinct(ProgrammeVoyage.id)).label('nombre_departs'),
            func.avg(
                select(func.count(Reservation.id)).where(
                    Reservation.voyage_id == ProgrammeVoyage.id
                ).scalar_subquery()
            ).label('nombre_reservations_moyen'),
            func.avg(
                select(func.sum(Reservation.montant_total)).where(
                    Reservation.voyage_id == ProgrammeVoyage.id
                ).scalar_subquery()
            ).label('ca_moyen'),
        ).where(
            and_(
                ProgrammeVoyage.date_depart_programme >= date_debut,
                ProgrammeVoyage.date_depart_programme <= date_fin
            )
        ).group_by('jour_semaine').order_by('jour_semaine')

        result = await self.db.execute(query)
        rows = result.all()

        jours_noms = {
            0: "Dimanche", 1: "Lundi", 2: "Mardi", 3: "Mercredi",
            4: "Jeudi", 5: "Vendredi", 6: "Samedi"
        }

        return [
            schemas.TendanceJournaliere(
                jour_semaine=jours_noms.get(int(row.jour_semaine), f"Jour {row.jour_semaine}"),
                nombre_departs=row.nombre_departs or 0,
                nombre_reservations_moyen=int(row.nombre_reservations_moyen or 0),
                ca_moyen=float(row.ca_moyen or 0),
            )
            for row in rows
        ]

    # ========================================================================
    # RAPPORTS ÉQUIPAGE
    # ========================================================================

    async def get_statistiques_equipage(self) -> schemas.StatistiquesEquipage:
        """Statistiques de l'équipage."""

        query = select(
            func.count(MembreEquipage.id).label('total'),
            func.count(
                case((MembreEquipage.statut == StatutEquipage.actif, 1))
            ).label('actifs'),
            func.count(
                case((MembreEquipage.statut == StatutEquipage.conge, 1))
            ).label('en_conge'),
            func.count(
                case((MembreEquipage.statut == StatutEquipage.suspendu, 1))
            ).label('suspendus'),
        )

        result = await self.db.execute(query)
        row = result.one()

        # Répartition par rôle
        query_roles = select(
            EquipageRole.nom,
            func.count(MembreEquipage.id).label('nombre')
        ).join(
            MembreEquipage, EquipageRole.id == MembreEquipage.role_id
        ).where(
            MembreEquipage.statut == StatutEquipage.actif
        ).group_by(EquipageRole.nom)

        result_roles = await self.db.execute(query_roles)
        rows_roles = result_roles.all()

        repartition_par_role = {row.nom: row.nombre for row in rows_roles}

        return schemas.StatistiquesEquipage(
            total_membres=row.total or 0,
            membres_actifs=row.actifs or 0,
            membres_en_conge=row.en_conge or 0,
            membres_suspendus=row.suspendus or 0,
            repartition_par_role=repartition_par_role,
        )

    async def get_equipages_par_bateau(self) -> List[schemas.EquipageBateau]:
        """Équipages par bateau."""

        query = select(Bateau).options(
            selectinload(Bateau.equipages).selectinload(MembreEquipage.role)
        )

        result = await self.db.execute(query)
        bateaux = result.scalars().all()

        resultats = []
        for bateau in bateaux:
            membres_actifs = [
                {
                    "id": m.id,
                    "nom_complet": m.nom_complet,
                    "role": m.role.nom,
                    "numero_licence": m.numero_licence,
                    "statut": m.statut.value,
                }
                for m in bateau.equipages
                if m.statut == StatutEquipage.actif
            ]

            resultats.append(schemas.EquipageBateau(
                bateau_id=bateau.id,
                nom_bateau=bateau.nom,
                nombre_membres=len(membres_actifs),
                membres=membres_actifs,
            ))

        return resultats

    async def get_certifications_statut(self) -> List[schemas.CertificationsStatut]:
        """Statut des certifications."""

        query = select(
            Certification.nom,
            func.count(EquipageCertification.id).label('total'),
            func.count(
                case((EquipageCertification.est_valide == True, 1))
            ).label('valides'),
        ).join(
            EquipageCertification, Certification.id == EquipageCertification.certification_id
        ).group_by(Certification.nom)

        result = await self.db.execute(query)
        rows = result.all()

        aujourd_hui = datetime.now().date()
        dans_30_jours = aujourd_hui + timedelta(days=30)

        resultats = []
        for row in rows:
            # Compter expirées et à expirer bientôt
            query_details = select(
                func.count(
                    case((EquipageCertification.date_expiration < aujourd_hui, 1))
                ).label('expirees'),
                func.count(
                    case(
                        (and_(
                            EquipageCertification.date_expiration >= aujourd_hui,
                            EquipageCertification.date_expiration <= dans_30_jours
                        ), 1)
                    )
                ).label('expire_bientot'),
            ).join(
                Certification, EquipageCertification.certification_id == Certification.id
            ).where(Certification.nom == row.nom)

            result_details = await self.db.execute(query_details)
            row_details = result_details.one()

            resultats.append(schemas.CertificationsStatut(
                certification=row.nom,
                total=row.total or 0,
                valides=row.valides or 0,
                expirees=row_details.expirees or 0,
                expire_bientot=row_details.expire_bientot or 0,
            ))

        return resultats

    async def get_rapport_equipage_complet(self) -> schemas.RapportEquipage:
        """Rapport équipage complet."""

        stats = await self.get_statistiques_equipage()
        equipages = await self.get_equipages_par_bateau()
        certifications = await self.get_certifications_statut()

        return schemas.RapportEquipage(
            statistiques=stats,
            equipages_par_bateau=equipages,
            certifications=certifications,
        )

    # ========================================================================
    # DASHBOARDS KPI
    # ========================================================================

    async def get_dashboard_direction(self) -> schemas.DashboardDirection:
        """Dashboard pour la direction avec KPI temps réel."""

        aujourd_hui = datetime.now().date()
        debut_mois = date(aujourd_hui.year, aujourd_hui.month, 1)
        debut_annee = date(aujourd_hui.year, 1, 1)

        # KPI Financiers
        query_ca_jour = select(
            func.sum(Reservation.montant_total)
        ).where(
            and_(
                func.date(Reservation.date_reservation) == aujourd_hui,
                Reservation.statut_reservation == StatutReservation.confirme
            )
        )
        result_jour = await self.db.execute(query_ca_jour)
        ca_aujourdhui = float(result_jour.scalar() or 0)

        query_ca_mois = select(
            func.sum(Reservation.montant_total)
        ).where(
            and_(
                Reservation.date_reservation >= debut_mois,
                Reservation.statut_reservation == StatutReservation.confirme
            )
        )
        result_mois = await self.db.execute(query_ca_mois)
        ca_mois = float(result_mois.scalar() or 0)

        query_ca_annee = select(
            func.sum(Reservation.montant_total)
        ).where(
            and_(
                Reservation.date_reservation >= debut_annee,
                Reservation.statut_reservation == StatutReservation.confirme
            )
        )
        result_annee = await self.db.execute(query_ca_annee)
        ca_annee = float(result_annee.scalar() or 0)

        # Panier moyen
        query_panier = select(
            func.avg(Reservation.montant_total)
        ).where(
            Reservation.statut_reservation == StatutReservation.confirme
        )
        result_panier = await self.db.execute(query_panier)
        panier_moyen = float(result_panier.scalar() or 0)

        # Taux de conversion
        query_conversion = select(
            func.count(Paiement.id).label('total'),
            func.count(case((Paiement.statut == StatutPaiement.reussi, 1))).label('reussis'),
        )
        result_conv = await self.db.execute(query_conversion)
        row_conv = result_conv.one()
        taux_conversion = round(
            (row_conv.reussis / row_conv.total * 100) if row_conv.total > 0 else 0,
            2
        )

        kpi_financiers = schemas.KPIFinancier(
            ca_aujourdhui=ca_aujourdhui,
            ca_mois_en_cours=ca_mois,
            ca_annee=ca_annee,
            panier_moyen=round(panier_moyen, 2),
            taux_conversion=taux_conversion,
        )

        # KPI Opérationnels
        query_voyages_jour = select(
            func.count(ProgrammeVoyage.id)
        ).where(
            func.date(ProgrammeVoyage.date_depart_programme) == aujourd_hui
        )
        result_voy_jour = await self.db.execute(query_voyages_jour)
        voyages_aujourdhui = result_voy_jour.scalar() or 0

        query_voyages_en_cours = select(
            func.count(ProgrammeVoyage.id)
        ).where(
            and_(
                ProgrammeVoyage.date_depart_reel.isnot(None),
                ProgrammeVoyage.date_arrivee_reelle.is_(None)
            )
        )
        result_voy_cours = await self.db.execute(query_voyages_en_cours)
        voyages_en_cours = result_voy_cours.scalar() or 0

        kpi_operationnels = schemas.KPIOperationnel(
            voyages_aujourdhui=voyages_aujourdhui,
            voyages_en_cours=voyages_en_cours,
            taux_ponctualite_jour=95.0,  # Placeholder
            taux_remplissage_jour=85.0,  # Placeholder
            incidents_jour=0,  # Placeholder
        )

        # KPI Clients
        query_resa_jour = select(
            func.count(Reservation.id)
        ).where(
            func.date(Reservation.date_reservation) == aujourd_hui
        )
        result_resa_jour = await self.db.execute(query_resa_jour)
        reservations_aujourdhui = result_resa_jour.scalar() or 0

        query_nouveaux_jour = select(
            func.count(func.distinct(Utilisateur.id))
        ).join(
            Reservation, Utilisateur.id == Reservation.utilisateur_id
        ).where(
            func.date(Utilisateur.date_creation) == aujourd_hui
        )
        result_nouv_jour = await self.db.execute(query_nouveaux_jour)
        nouveaux_clients = result_nouv_jour.scalar() or 0

        query_total_actifs = select(func.count(Utilisateur.id)).where(
            Utilisateur.is_active == True
        )
        result_actifs = await self.db.execute(query_total_actifs)
        total_clients_actifs = result_actifs.scalar() or 0

        kpi_clients = schemas.KPIClient(
            reservations_aujourdhui=reservations_aujourdhui,
            nouveaux_clients_aujourdhui=nouveaux_clients,
            total_clients_actifs=total_clients_actifs,
        )

        # Alertes
        alertes = []
        if ca_aujourdhui < 1000:
            alertes.append("⚠️ CA du jour inférieur à l'objectif")
        if voyages_en_cours > 5:
            alertes.append(f"ℹ️ {voyages_en_cours} voyages en cours")

        return schemas.DashboardDirection(
            date_generation=datetime.now(),
            kpi_financiers=kpi_financiers,
            kpi_operationnels=kpi_operationnels,
            kpi_clients=kpi_clients,
            alertes=alertes,
        )

    async def get_dashboard_operations(self) -> schemas.DashboardOperations:
        """Dashboard pour les opérations."""

        aujourd_hui = datetime.now().date()

        # Voyages du jour
        voyages = await self.get_performance_voyages(aujourd_hui, aujourd_hui)

        # Taux remplissage jour
        taux_remplissage = await self.get_taux_remplissage_voyages(aujourd_hui, aujourd_hui)
        taux_moyen = round(
            sum(t.taux_remplissage_passagers for t in taux_remplissage) / len(taux_remplissage)
            if taux_remplissage else 0,
            2
        )

        return schemas.DashboardOperations(
            date_generation=datetime.now(),
            voyages_aujourdhui=voyages,
            taux_remplissage_jour=taux_moyen,
            embarquements_en_cours=0,  # Placeholder
            incidents_signales=0,  # Placeholder
        )

    async def get_dashboard_finances(self) -> schemas.DashboardFinances:
        """Dashboard pour les finances."""

        aujourd_hui = datetime.now().date()
        debut_mois = date(aujourd_hui.year, aujourd_hui.month, 1)

        # CA jour et mois
        query_ca_jour = select(
            func.sum(Reservation.montant_total)
        ).where(
            and_(
                func.date(Reservation.date_reservation) == aujourd_hui,
                Reservation.statut_reservation == StatutReservation.confirme
            )
        )
        result_jour = await self.db.execute(query_ca_jour)
        ca_jour = float(result_jour.scalar() or 0)

        query_ca_mois = select(
            func.sum(Reservation.montant_total)
        ).where(
            and_(
                Reservation.date_reservation >= debut_mois,
                Reservation.statut_reservation == StatutReservation.confirme
            )
        )
        result_mois = await self.db.execute(query_ca_mois)
        ca_mois = float(result_mois.scalar() or 0)

        # Paiements en attente
        query_attente = select(
            func.count(Paiement.id),
            func.sum(Paiement.montant),
        ).where(
            Paiement.statut.in_([StatutPaiement.initie, StatutPaiement.en_cours])
        )
        result_attente = await self.db.execute(query_attente)
        row_attente = result_attente.one()

        # Remboursements en attente
        query_rembours = select(
            func.count(Remboursement.id),
            func.sum(Remboursement.montant_rembourser),
        ).where(
            Remboursement.statut.in_([
                StatutRemboursement.en_attente,
                StatutRemboursement.approuve
            ])
        )
        result_rembours = await self.db.execute(query_rembours)
        row_rembours = result_rembours.one()

        return schemas.DashboardFinances(
            date_generation=datetime.now(),
            ca_jour=ca_jour,
            ca_mois=ca_mois,
            paiements_en_attente=row_attente[0] or 0,
            montant_en_attente=float(row_attente[1] or 0),
            remboursements_en_attente=row_rembours[0] or 0,
            montant_remboursements=float(row_rembours[1] or 0),
        )
