"""
Script d'initialisation de la base de données avec des données de test.
"""
import asyncio
import sys
from pathlib import Path

# Ajouter le répertoire parent au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime, timedelta
from sqlalchemy import select

from app.database import async_session_maker, init_db
# Import all models to ensure they are registered with SQLAlchemy
from app.models import *
from app.models.geographie import Pays, Ville, Port
from app.models.compagnie import CompagnieBateau, TypeBateau, Bateau, Niveau, Chambre, Lit, TypeLit
from app.models.route import Route
from app.models.voyage import ProgrammeVoyage, StatutVoyage
from app.models.utilisateur import Utilisateur
from app.models.reservation import Reservation
from app.models.ticket import Ticket
from app.models.paiement import Paiement
from app.models.promotion import Promotion
from app.models.document import DocumentVoyageur
from app.models.journal import Journal
from app.modules.auth.service import auth_service


async def create_sample_data():
    """Crée des données d'exemple"""
    async with async_session_maker() as db:
        print("🌍 Creating countries and cities...")

        # Pays
        france = Pays(nom="France", code="FR")
        espagne = Pays(nom="Espagne", code="ES")
        italie = Pays(nom="Italie", code="IT")
        maroc = Pays(nom="Maroc", code="MA")

        db.add_all([france, espagne, italie, maroc])
        await db.commit()

        # Villes
        marseille = Ville(pays_id=france.id, nom="Marseille", latitude=43.2965, longitude=5.3698)
        nice = Ville(pays_id=france.id, nom="Nice", latitude=43.7102, longitude=7.2620)
        barcelone = Ville(pays_id=espagne.id, nom="Barcelone", latitude=41.3851, longitude=2.1734)
        rome = Ville(pays_id=italie.id, nom="Rome", latitude=41.9028, longitude=12.4964)
        tanger = Ville(pays_id=maroc.id, nom="Tanger", latitude=35.7595, longitude=-5.8340)

        db.add_all([marseille, nice, barcelone, rome, tanger])
        await db.commit()

        # Ports
        port_marseille = Port(
            ville_id=marseille.id,
            nom="Port de Marseille",
            code_international="FRMRS",
            latitude=43.3047,
            longitude=5.3572,
            adresse="Quai du Port, 13002 Marseille",
            horaires_ouverture="06:00",
            horaires_fermeture="22:00",
            capacite_quai=10
        )

        port_nice = Port(
            ville_id=nice.id,
            nom="Port de Nice",
            code_international="FRNIC",
            latitude=43.6951,
            longitude=7.2758,
            adresse="Port Lympia, 06300 Nice",
            horaires_ouverture="06:00",
            horaires_fermeture="22:00",
            capacite_quai=8
        )

        port_barcelone = Port(
            ville_id=barcelone.id,
            nom="Port de Barcelone",
            code_international="ESBCN",
            latitude=41.3488,
            longitude=2.1750,
            adresse="Moll de Barcelona, 08039 Barcelona",
            horaires_ouverture="05:00",
            horaires_fermeture="23:00",
            capacite_quai=15
        )

        port_tanger = Port(
            ville_id=tanger.id,
            nom="Port de Tanger Med",
            code_international="MATNG",
            latitude=35.8767,
            longitude=-5.4200,
            adresse="Tanger Med, Maroc",
            horaires_ouverture="00:00",
            horaires_fermeture="23:59",
            capacite_quai=20
        )

        db.add_all([port_marseille, port_nice, port_barcelone, port_tanger])
        await db.commit()

        print("🚢 Creating ferry companies...")

        # Compagnies
        compagnie1 = CompagnieBateau(
            nom="Mediterranean Ferries",
            telephone="+33491234567",
            email="contact@medferries.com",
            numero_licence="FR-FERRY-001",
            pays_immatriculation="France",
            taux_commission=0.05
        )

        compagnie2 = CompagnieBateau(
            nom="TransMed Express",
            telephone="+34931234567",
            email="info@transmed.es",
            numero_licence="ES-FERRY-001",
            pays_immatriculation="Espagne",
            taux_commission=0.04
        )

        db.add_all([compagnie1, compagnie2])
        await db.commit()

        # Types de bateau
        type_ferry = TypeBateau(
            compagnie_id=compagnie1.id,
            nom="Ferry Standard",
            capacite=500,
            description="Ferry standard pour passagers et véhicules"
        )

        type_rapide = TypeBateau(
            compagnie_id=compagnie2.id,
            nom="Ferry Rapide",
            capacite=300,
            description="Ferry rapide haute vitesse"
        )

        db.add_all([type_ferry, type_rapide])
        await db.commit()

        # Bateaux
        bateau1 = Bateau(
            compagnie_id=compagnie1.id,
            type_bateau_id=type_ferry.id,
            nom="Méditerranée I",
            immatriculation="FR-MED-001",
            capacite_passagers=500,
            capacite_vehicules=100,
            vitesse_croisiere=25.0,
            clim=True,
            wifi=True,
            restaurant=True,
            boutique=True,
            cabines=True,
            en_maintenance=False
        )

        bateau2 = Bateau(
            compagnie_id=compagnie2.id,
            type_bateau_id=type_rapide.id,
            nom="Express Barcelona",
            immatriculation="ES-BCN-001",
            capacite_passagers=300,
            capacite_vehicules=50,
            vitesse_croisiere=35.0,
            clim=True,
            wifi=True,
            restaurant=False,
            boutique=True,
            cabines=False,
            en_maintenance=False
        )

        db.add_all([bateau1, bateau2])
        await db.commit()

        # Niveaux pour bateau1
        niveau1 = Niveau(
            bateau_id=bateau1.id,
            numero_niveau=1,
            nom="Pont Principal",
            multiplicateur_prix=1.0
        )

        niveau2 = Niveau(
            bateau_id=bateau1.id,
            numero_niveau=2,
            nom="Pont Supérieur",
            multiplicateur_prix=1.3
        )

        db.add_all([niveau1, niveau2])
        await db.commit()

        # Chambres
        for i in range(1, 11):
            chambre = Chambre(
                niveau_id=niveau2.id,
                numero_chambre=f"2{i:02d}",
                prix_base=50.0,
                type_chambre="Standard",
                fenetre=True,
                salle_de_bain=True
            )
            db.add(chambre)

            # Lits pour chaque chambre
            lit1 = Lit(
                chambre_id=chambre.id,
                numero_lit="A",
                disponible=True,
                prix_supplementaire=0.0,
                type_lit=TypeLit.double,
                taille="140x200"
            )
            lit2 = Lit(
                chambre_id=chambre.id,
                numero_lit="B",
                disponible=True,
                prix_supplementaire=10.0,
                type_lit=TypeLit.simple,
                taille="90x200"
            )
            db.add_all([lit1, lit2])

        await db.commit()

        print("🛣️ Creating routes...")

        # Routes
        route1 = Route(
            compagnie_id=compagnie1.id,
            port_depart_id=port_marseille.id,
            port_arrivee_id=port_barcelone.id,
            prix_base=80.0,
            distance_milles=250,
            duree_estimative=480  # 8 heures
        )

        route2 = Route(
            compagnie_id=compagnie1.id,
            port_depart_id=port_marseille.id,
            port_arrivee_id=port_tanger.id,
            prix_base=120.0,
            distance_milles=600,
            duree_estimative=1200  # 20 heures
        )

        route3 = Route(
            compagnie_id=compagnie2.id,
            port_depart_id=port_barcelone.id,
            port_arrivee_id=port_tanger.id,
            prix_base=100.0,
            distance_milles=400,
            duree_estimative=720  # 12 heures
        )

        db.add_all([route1, route2, route3])
        await db.commit()

        print("📅 Creating voyage schedules...")

        # Programmes de voyage (pour les 7 prochains jours)
        base_date = datetime.utcnow()

        for day in range(7):
            depart_date = base_date + timedelta(days=day, hours=8)
            arrivee_date = depart_date + timedelta(hours=8)

            voyage = ProgrammeVoyage(
                bateau_id=bateau1.id,
                compagnie_id=compagnie1.id,
                port_depart_id=port_marseille.id,
                port_arrivee_id=port_barcelone.id,
                route_id=route1.id,
                date_depart_programme=depart_date,
                date_arrivee_programmee=arrivee_date,
                prix_base=80.0,
                statut=StatutVoyage.confirme,
                places_disponibles_passagers=500,
                places_disponibles_vehicules=100,
                places_vendues_passagers=0,
                places_vendues_vehicules=0,
                capitaine_nom="Capitaine Dupont"
            )
            db.add(voyage)

        # Voyages pour route 2
        for day in range(0, 7, 2):  # Tous les 2 jours
            depart_date = base_date + timedelta(days=day, hours=20)
            arrivee_date = depart_date + timedelta(hours=20)

            voyage = ProgrammeVoyage(
                bateau_id=bateau1.id,
                compagnie_id=compagnie1.id,
                port_depart_id=port_marseille.id,
                port_arrivee_id=port_tanger.id,
                route_id=route2.id,
                date_depart_programme=depart_date,
                date_arrivee_programmee=arrivee_date,
                prix_base=120.0,
                statut=StatutVoyage.confirme,
                places_disponibles_passagers=500,
                places_disponibles_vehicules=100,
                places_vendues_passagers=0,
                places_vendues_vehicules=0,
                capitaine_nom="Capitaine Martin"
            )
            db.add(voyage)

        await db.commit()

        print("👤 Creating admin user...")

        # Créer un utilisateur admin
        admin = Utilisateur(
            username="admin",
            email="admin@compagnie-bateau.com",
            numero_telephone="+33600000000",
            hashed_password=auth_service.get_password_hash("admin123"),
            nom_complet="Administrateur",
            is_active=True,
            is_superuser=True
        )

        # Créer un utilisateur test
        user = Utilisateur(
            username="testuser",
            email="test@example.com",
            numero_telephone="+33600000001",
            hashed_password=auth_service.get_password_hash("test123"),
            nom_complet="Test User",
            is_active=True,
            is_superuser=False
        )

        db.add_all([admin, user])
        await db.commit()

        print("✅ Sample data created successfully!")
        print("\n📝 Login credentials:")
        print("   Admin: username=admin, password=admin123")
        print("   User:  username=testuser, password=test123")


async def main():
    """Point d'entrée principal"""
    print("🚀 Initializing database...")

    # Créer les tables
    await init_db()
    print("✅ Database tables created")

    # Créer les données d'exemple
    await create_sample_data()

    print("\n🎉 Database initialization complete!")


if __name__ == "__main__":
    asyncio.run(main())
