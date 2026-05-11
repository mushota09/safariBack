"""
Script pour peupler la base de données avec des données de test
- 5 compagnies maritimes
- 3 ports (Kalemie, Moba, Uvira) avec coordonnées GPS réelles
- Bateaux variés (avec et sans niveaux/chambres)
- Routes entre les ports
- Programmes de voyage pour les 7 prochains jours
"""
import asyncio
from datetime import datetime, timedelta, date
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker, engine
from app.models.base import Base
from app.models.geographie import Pays, Ville, Port
from app.models.compagnie import CompagnieBateau, TypeBateau, Bateau, Niveau, Chambre, Lit
from app.models.route import Route, TarifSaisonnier
from app.models.voyage import ProgrammeVoyage


async def clear_database():
    """Supprime toutes les données existantes"""
    print("🗑️  Suppression des données existantes...")
    async with engine.begin() as conn:
        # Supprimer dans l'ordre inverse des dépendances
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Base de données nettoyée")


async def create_geography(db: AsyncSession):
    """Crée les données géographiques"""
    print("\n🌍 Création des données géographiques...")

    # Pays
    rdc = Pays(
        nom="République Démocratique du Congo",
        code="CD"
    )
    db.add(rdc)
    await db.flush()

    # Villes avec coordonnées
    kalemie_ville = Ville(
        nom="Kalemie",
        pays_id=rdc.id,
        latitude=-5.9475,
        longitude=29.1944
    )
    moba_ville = Ville(
        nom="Moba",
        pays_id=rdc.id,
        latitude=-7.0500,
        longitude=29.7333
    )
    uvira_ville = Ville(
        nom="Uvira",
        pays_id=rdc.id,
        latitude=-3.3833,
        longitude=29.1333
    )

    db.add_all([kalemie_ville, moba_ville, uvira_ville])
    await db.flush()

    # Ports avec coordonnées GPS réelles et tous les champs
    port_kalemie = Port(
        nom="Port de Kalemie",
        code_international="FMI",
        latitude=-5.9475,
        longitude=29.1944,
        ville_id=kalemie_ville.id,
        adresse="Avenue du Port, Kalemie",
        horaires_ouverture="06:00",
        horaires_fermeture="20:00",
        capacite_quai=10,
        installations="Embarquement, Débarquement, Douane, Restaurant, Parking"
    )

    port_moba = Port(
        nom="Port de Moba",
        code_international="MOB",
        latitude=-7.0500,
        longitude=29.7333,
        ville_id=moba_ville.id,
        adresse="Quai Principal, Moba",
        horaires_ouverture="05:30",
        horaires_fermeture="19:00",
        capacite_quai=8,
        installations="Embarquement, Débarquement, Douane, Salle d'attente"
    )

    port_uvira = Port(
        nom="Port d'Uvira",
        code_international="UVR",
        latitude=-3.3833,
        longitude=29.1333,
        ville_id=uvira_ville.id,
        adresse="Boulevard du Lac, Uvira",
        horaires_ouverture="06:00",
        horaires_fermeture="21:00",
        capacite_quai=12,
        installations="Embarquement, Débarquement, Douane, Restaurant, Hôtel, Parking"
    )

    db.add_all([port_kalemie, port_moba, port_uvira])
    await db.flush()

    print(f"✅ Créé: {rdc.nom}")
    print("✅ Créé: 3 villes (Kalemie, Moba, Uvira)")
    print("✅ Créé: 3 ports avec coordonnées GPS")

    return {
        'pays': rdc,
        'villes': {'kalemie': kalemie_ville, 'moba': moba_ville, 'uvira': uvira_ville},
        'ports': {'kalemie': port_kalemie, 'moba': port_moba, 'uvira': port_uvira}
    }


async def create_companies(db: AsyncSession):
    """Crée 5 compagnies maritimes avec tous les champs"""
    print("\n🚢 Création des compagnies maritimes...")

    companies = [
        CompagnieBateau(
            nom="Tanganyika Express",
            telephone="+243 997 123 456",
            email="contact@tanganyika-express.cd",
            adresse_siege="Avenue Lumumba, Kalemie, RDC",
            site_web="https://tanganyika-express.cd",
            logo="https://example.com/logos/tge.png",
            numero_licence="TGE-2020-001",
            numero_registre="REG-TGE-2020",
            pays_immatriculation="République Démocratique du Congo",
            date_creation_compagnie=date(2020, 3, 15),
            taux_commission=5.0,
            politique_annulation="Remboursement à 100% si annulation 48h avant"
        ),
        CompagnieBateau(
            nom="Lac Kivu Navigation",
            telephone="+243 998 234 567",
            email="info@lac-kivu-nav.cd",
            adresse_siege="Boulevard du Lac, Uvira, RDC",
            site_web="https://lac-kivu-nav.cd",
            logo="https://example.com/logos/lkn.png",
            numero_licence="LKN-2019-002",
            numero_registre="REG-LKN-2019",
            pays_immatriculation="République Démocratique du Congo",
            date_creation_compagnie=date(2019, 6, 20),
            taux_commission=4.5,
            politique_annulation="Remboursement à 80% si annulation 24h avant"
        ),
        CompagnieBateau(
            nom="Safari Maritime",
            telephone="+243 999 345 678",
            email="reservation@safari-maritime.cd",
            adresse_siege="Rue du Port, Moba, RDC",
            site_web="https://safari-maritime.cd",
            logo="https://example.com/logos/saf.png",
            numero_licence="SAF-2018-003",
            numero_registre="REG-SAF-2018",
            pays_immatriculation="République Démocratique du Congo",
            date_creation_compagnie=date(2018, 9, 10),
            taux_commission=6.0,
            politique_annulation="Remboursement à 70% si annulation 72h avant"
        ),
        CompagnieBateau(
            nom="Blue Waters Transport",
            telephone="+243 997 456 789",
            email="contact@bluewaters.cd",
            adresse_siege="Avenue du Commerce, Kalemie, RDC",
            site_web="https://bluewaters.cd",
            logo="https://example.com/logos/bwt.png",
            numero_licence="BWT-2021-004",
            numero_registre="REG-BWT-2021",
            pays_immatriculation="République Démocratique du Congo",
            date_creation_compagnie=date(2021, 1, 5),
            taux_commission=5.5,
            politique_annulation="Remboursement à 90% si annulation 48h avant"
        ),
        CompagnieBateau(
            nom="Grands Lacs Shipping",
            telephone="+243 998 567 890",
            email="info@grandslacs.cd",
            adresse_siege="Place de l'Indépendance, Uvira, RDC",
            site_web="https://grandslacs.cd",
            logo="https://example.com/logos/gls.png",
            numero_licence="GLS-2022-005",
            numero_registre="REG-GLS-2022",
            pays_immatriculation="République Démocratique du Congo",
            date_creation_compagnie=date(2022, 4, 12),
            taux_commission=4.0,
            politique_annulation="Remboursement à 100% si annulation 72h avant"
        )
    ]

    db.add_all(companies)
    await db.flush()

    for company in companies:
        print(f"✅ Créé: {company.nom} ({company.numero_licence})")

    return companies


async def create_boats(db: AsyncSession, companies: list):
    """Crée des bateaux variés avec noms congolais réels"""
    print("\n⛴️  Création des bateaux...")

    # Types de bateaux avec compagnie_id
    type_ferry = TypeBateau(
        compagnie_id=companies[0].id,
        nom="Ferry",
        capacite=400,
        description="Grand ferry pour passagers et véhicules"
    )
    type_rapide = TypeBateau(
        compagnie_id=companies[1].id,
        nom="Vedette Rapide",
        capacite=150,
        description="Bateau rapide pour passagers uniquement"
    )
    type_cargo = TypeBateau(
        compagnie_id=companies[2].id,
        nom="Cargo Mixte",
        capacite=300,
        description="Transport de marchandises et passagers"
    )

    db.add_all([type_ferry, type_rapide, type_cargo])
    await db.flush()

    boats = []
    from datetime import date as dt_date

    # 1. OKAKO - Tanganyika Express (avec niveaux et chambres)
    okako = Bateau(
        nom='Okako',
        compagnie_id=companies[0].id,
        type_bateau_id=type_ferry.id,
        immatriculation='TGE-OKAKO-001',
        capacite_passagers=400,
        capacite=400,
        capacite_vehicules=20,
        vitesse_croisiere=25.5,
        clim=True,
        wifi=True,
        restaurant=True,
        boutique=True,
        cabines=True,
        en_maintenance=False,
        date_derniere_revision=dt_date(2026, 3, 15),
        date_prochaine_revision=dt_date(2026, 9, 15),
        photo_principale='https://example.com/boats/okako.jpg',
        plan_bateau='https://example.com/boats/okako-plan.pdf',
        longueur=85.5,
        tirant_eau=3.2,
        puissance_moteur=2500.0
    )
    db.add(okako)
    await db.flush()

    # Créer 3 niveaux pour Okako
    for niveau_num in range(1, 4):
        niveau = Niveau(
            bateau_id=okako.id,
            numero_niveau=niveau_num,
            nom=f"Niveau {niveau_num}",
            multiplicateur_prix=1.0 + (niveau_num - 1) * 0.3,
            description=f"Niveau {niveau_num} avec vue panoramique"
        )
        db.add(niveau)
        await db.flush()

        # Créer chambres pour niveaux 2 et 3
        if niveau_num >= 2:
            for chambre_num in range(1, 6):
                is_double = chambre_num % 2 == 0
                chambre = Chambre(
                    niveau_id=niveau.id,
                    numero_chambre=f"{niveau_num}0{chambre_num}",
                    prix_base=50.0 if is_double else 30.0,
                    type_chambre='double' if is_double else 'simple',
                    fenetre=True,
                    salle_de_bain=niveau_num == 3
                )
                db.add(chambre)
                await db.flush()

                # Créer lits
                nb_lits = 2 if is_double else 1
                for lit_num in range(1, nb_lits + 1):
                    lit = Lit(
                        chambre_id=chambre.id,
                        numero_lit=f"{chambre.numero_chambre}-L{lit_num}",
                        disponible=True,
                        prix_supplementaire=10.0 if lit_num == 1 else 5.0,
                        type_lit='double' if lit_num == 1 else 'simple',
                        taille='140x200' if lit_num == 1 else '90x200'
                    )
                    db.add(lit)

    boats.append(okako)
    print(f"✅ Créé: Okako ({companies[0].nom}) - Avec 3 niveaux/chambres")

    # 2. AMANI - Tanganyika Express (avec niveaux)
    amani = Bateau(
        nom='Amani',
        compagnie_id=companies[0].id,
        type_bateau_id=type_rapide.id,
        immatriculation='TGE-AMANI-002',
        capacite_passagers=120,
        capacite=120,
        capacite_vehicules=0,
        vitesse_croisiere=35.0,
        clim=True,
        wifi=True,
        restaurant=False,
        boutique=False,
        cabines=True,
        en_maintenance=False,
        date_derniere_revision=dt_date(2026, 4, 10),
        date_prochaine_revision=dt_date(2026, 10, 10),
        photo_principale='https://example.com/boats/amani.jpg',
        plan_bateau='https://example.com/boats/amani-plan.pdf',
        longueur=45.0,
        tirant_eau=2.1,
        puissance_moteur=1800.0
    )
    db.add(amani)
    await db.flush()

    # 2 niveaux pour Amani
    for niveau_num in range(1, 3):
        niveau = Niveau(
            bateau_id=amani.id,
            numero_niveau=niveau_num,
            nom=f"Pont {niveau_num}",
            multiplicateur_prix=1.0 + (niveau_num - 1) * 0.5,
            description=f"Pont {niveau_num} - Confort moderne"
        )
        db.add(niveau)
        await db.flush()

        if niveau_num == 2:
            for chambre_num in range(1, 4):
                chambre = Chambre(
                    niveau_id=niveau.id,
                    numero_chambre=f"A{chambre_num:02d}",
                    prix_base=40.0,
                    type_chambre='double',
                    fenetre=True,
                    salle_de_bain=True
                )
                db.add(chambre)
                await db.flush()

                for lit_num in range(1, 3):
                    lit = Lit(
                        chambre_id=chambre.id,
                        numero_lit=f"A{chambre_num:02d}-L{lit_num}",
                        disponible=True,
                        prix_supplementaire=8.0,
                        type_lit='simple',
                        taille='90x200'
                    )
                    db.add(lit)

    boats.append(amani)
    print(f"✅ Créé: Amani ({companies[0].nom}) - Avec 2 niveaux/chambres")

    # 3. MWANGA - Lac Kivu Navigation (avec niveaux)
    mwanga = Bateau(
        nom='Mwanga',
        compagnie_id=companies[1].id,
        type_bateau_id=type_ferry.id,
        immatriculation='LKN-MWANGA-001',
        capacite_passagers=350,
        capacite=350,
        capacite_vehicules=15,
        vitesse_croisiere=28.0,
        clim=True,
        wifi=True,
        restaurant=True,
        boutique=True,
        cabines=True,
        en_maintenance=False,
        date_derniere_revision=dt_date(2026, 2, 20),
        date_prochaine_revision=dt_date(2026, 8, 20),
        photo_principale='https://example.com/boats/mwanga.jpg',
        plan_bateau='https://example.com/boats/mwanga-plan.pdf',
        longueur=78.0,
        tirant_eau=3.0,
        puissance_moteur=2200.0
    )
    db.add(mwanga)
    await db.flush()

    # 2 niveaux pour Mwanga
    for niveau_num in range(1, 3):
        niveau = Niveau(
            bateau_id=mwanga.id,
            numero_niveau=niveau_num,
            nom=f"Étage {niveau_num}",
            multiplicateur_prix=1.0 + (niveau_num - 1) * 0.4,
            description=f"Étage {niveau_num} - Vue sur le lac"
        )
        db.add(niveau)
        await db.flush()

        if niveau_num == 2:
            for chambre_num in range(1, 5):
                is_suite = chambre_num == 1
                chambre = Chambre(
                    niveau_id=niveau.id,
                    numero_chambre=f"M{chambre_num:02d}",
                    prix_base=100.0 if is_suite else 45.0,
                    type_chambre='suite' if is_suite else 'double',
                    fenetre=True,
                    salle_de_bain=True
                )
                db.add(chambre)
                await db.flush()

                nb_lits = 3 if is_suite else 2
                for lit_num in range(1, nb_lits + 1):
                    lit = Lit(
                        chambre_id=chambre.id,
                        numero_lit=f"M{chambre_num:02d}-L{lit_num}",
                        disponible=True,
                        prix_supplementaire=15.0 if is_suite else 7.0,
                        type_lit='double' if lit_num == 1 else 'simple',
                        taille='160x200' if lit_num == 1 else '90x200'
                    )
                    db.add(lit)

    boats.append(mwanga)
    print(f"✅ Créé: Mwanga ({companies[1].nom}) - Avec 2 niveaux/chambres")

    # 4. FURAHA - Lac Kivu Navigation (standard)
    furaha = Bateau(
        nom='Furaha',
        compagnie_id=companies[1].id,
        type_bateau_id=type_rapide.id,
        immatriculation='LKN-FURAHA-002',
        capacite_passagers=80,
        capacite=80,
        capacite_vehicules=0,
        vitesse_croisiere=40.0,
        clim=True,
        wifi=False,
        restaurant=False,
        boutique=False,
        cabines=False,
        en_maintenance=False,
        date_derniere_revision=dt_date(2026, 4, 5),
        date_prochaine_revision=dt_date(2026, 10, 5),
        photo_principale='https://example.com/boats/furaha.jpg',
        plan_bateau='https://example.com/boats/furaha-plan.pdf',
        longueur=35.0,
        tirant_eau=1.8,
        puissance_moteur=1500.0
    )
    db.add(furaha)
    boats.append(furaha)
    print(f"✅ Créé: Furaha ({companies[1].nom}) - Standard rapide")

    # 5. TUMAINI - Safari Maritime (standard)
    tumaini = Bateau(
        nom='Tumaini',
        compagnie_id=companies[2].id,
        type_bateau_id=type_cargo.id,
        immatriculation='SAF-TUMAINI-001',
        capacite_passagers=250,
        capacite=250,
        capacite_vehicules=10,
        vitesse_croisiere=22.0,
        clim=False,
        wifi=False,
        restaurant=True,
        boutique=False,
        cabines=False,
        en_maintenance=False,
        date_derniere_revision=dt_date(2026, 1, 15),
        date_prochaine_revision=dt_date(2026, 7, 15),
        photo_principale='https://example.com/boats/tumaini.jpg',
        plan_bateau='https://example.com/boats/tumaini-plan.pdf',
        longueur=65.0,
        tirant_eau=2.8,
        puissance_moteur=1900.0
    )
    db.add(tumaini)
    boats.append(tumaini)
    print(f"✅ Créé: Tumaini ({companies[2].nom}) - Cargo mixte")

    # 6. UPENDO - Blue Waters Transport (standard)
    upendo = Bateau(
        nom='Upendo',
        compagnie_id=companies[3].id,
        type_bateau_id=type_rapide.id,
        immatriculation='BWT-UPENDO-001',
        capacite_passagers=100,
        capacite=100,
        capacite_vehicules=0,
        vitesse_croisiere=38.0,
        clim=True,
        wifi=True,
        restaurant=False,
        boutique=False,
        cabines=False,
        en_maintenance=False,
        date_derniere_revision=dt_date(2026, 3, 1),
        date_prochaine_revision=dt_date(2026, 9, 1),
        photo_principale='https://example.com/boats/upendo.jpg',
        plan_bateau='https://example.com/boats/upendo-plan.pdf',
        longueur=40.0,
        tirant_eau=2.0,
        puissance_moteur=1600.0
    )
    db.add(upendo)
    boats.append(upendo)
    print(f"✅ Créé: Upendo ({companies[3].nom}) - Vedette rapide")

    # 7. BARAKA - Grands Lacs Shipping (avec niveaux VIP)
    baraka = Bateau(
        nom='Baraka',
        compagnie_id=companies[4].id,
        type_bateau_id=type_ferry.id,
        immatriculation='GLS-BARAKA-001',
        capacite_passagers=300,
        capacite=300,
        capacite_vehicules=25,
        vitesse_croisiere=30.0,
        clim=True,
        wifi=True,
        restaurant=True,
        boutique=True,
        cabines=True,
        en_maintenance=False,
        date_derniere_revision=dt_date(2026, 4, 20),
        date_prochaine_revision=dt_date(2026, 10, 20),
        photo_principale='https://example.com/boats/baraka.jpg',
        plan_bateau='https://example.com/boats/baraka-plan.pdf',
        longueur=90.0,
        tirant_eau=3.5,
        puissance_moteur=2800.0
    )
    db.add(baraka)
    await db.flush()

    # 2 niveaux VIP pour Baraka
    for niveau_num in range(1, 3):
        niveau = Niveau(
            bateau_id=baraka.id,
            numero_niveau=niveau_num,
            nom=f"Deck Premium {niveau_num}",
            multiplicateur_prix=1.0 + (niveau_num - 1) * 0.6,
            description=f"Deck Premium {niveau_num} - Luxe et confort"
        )
        db.add(niveau)
        await db.flush()

        if niveau_num == 2:
            for chambre_num in range(1, 6):
                chambre = Chambre(
                    niveau_id=niveau.id,
                    numero_chambre=f"VIP-{chambre_num}",
                    prix_base=150.0,
                    type_chambre='suite',
                    fenetre=True,
                    salle_de_bain=True
                )
                db.add(chambre)
                await db.flush()

                for lit_num in range(1, 3):
                    lit = Lit(
                        chambre_id=chambre.id,
                        numero_lit=f"VIP-{chambre_num}-L{lit_num}",
                        disponible=True,
                        prix_supplementaire=20.0,
                        type_lit='double',
                        taille='180x200'
                    )
                    db.add(lit)

    boats.append(baraka)
    print(f"✅ Créé: Baraka ({companies[4].nom}) - Premium avec suites VIP")

    await db.flush()
    return boats


async def create_routes(db: AsyncSession, ports: dict, companies: list):
    """Crée les routes entre les ports"""
    print("\n🗺️  Création des routes...")

    routes_data = [
        # Kalemie <-> Moba (Tanganyika Express)
        {
            'compagnie': companies[0],
            'depart': ports['kalemie'],
            'arrivee': ports['moba'],
            'distance': 180,
            'duree': 480,  # 8 heures en minutes
            'prix_base': 50.0
        },
        {
            'compagnie': companies[0],
            'depart': ports['moba'],
            'arrivee': ports['kalemie'],
            'distance': 180,
            'duree': 480,
            'prix_base': 50.0
        },
        # Kalemie <-> Uvira (Lac Kivu Navigation)
        {
            'compagnie': companies[1],
            'depart': ports['kalemie'],
            'arrivee': ports['uvira'],
            'distance': 320,
            'duree': 840,  # 14 heures en minutes
            'prix_base': 80.0
        },
        {
            'compagnie': companies[1],
            'depart': ports['uvira'],
            'arrivee': ports['kalemie'],
            'distance': 320,
            'duree': 840,
            'prix_base': 80.0
        },
        # Moba <-> Uvira (Safari Maritime)
        {
            'compagnie': companies[2],
            'depart': ports['moba'],
            'arrivee': ports['uvira'],
            'distance': 250,
            'duree': 660,  # 11 heures en minutes
            'prix_base': 65.0
        },
        {
            'compagnie': companies[2],
            'depart': ports['uvira'],
            'arrivee': ports['moba'],
            'distance': 250,
            'duree': 660,
            'prix_base': 65.0
        }
    ]

    routes = []
    for route_data in routes_data:
        route = Route(
            compagnie_id=route_data['compagnie'].id,
            port_depart_id=route_data['depart'].id,
            port_arrivee_id=route_data['arrivee'].id,
            distance_milles=route_data['distance'],
            duree_estimative=route_data['duree'],
            prix_base=route_data['prix_base']
        )
        db.add(route)
        await db.flush()

        # Ajouter un tarif saisonnier (haute saison)
        tarif = TarifSaisonnier(
            route_id=route.id,
            type_saison='haute',
            date_debut=date(2026, 6, 1),
            date_fin=date(2026, 8, 31),
            coefficient=1.3
        )
        db.add(tarif)

        routes.append(route)
        depart_nom = route_data['depart'].nom
        arrivee_nom = route_data['arrivee'].nom
        distance = route_data['distance']
        print(f"✅ Créé: {depart_nom} → {arrivee_nom} ({distance} km)")

    await db.flush()
    return routes


async def create_voyage_programs(db: AsyncSession, boats: list, routes: list):
    """Crée des programmes de voyage pour les 7 prochains jours"""
    print("\n📅 Création des programmes de voyage...")

    base_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    programs = []

    # Définir des horaires variés pour chaque bateau
    schedules = [
        {'boat_idx': 0, 'route_idx': 0, 'hour': 8, 'days': [0, 2, 4, 6]},
        {'boat_idx': 0, 'route_idx': 1, 'hour': 18, 'days': [0, 2, 4, 6]},
        {'boat_idx': 1, 'route_idx': 2, 'hour': 9, 'days': [1, 3, 5]},
        {'boat_idx': 1, 'route_idx': 3, 'hour': 6, 'days': [2, 4, 6]},
        {'boat_idx': 2, 'route_idx': 4, 'hour': 10, 'days': [0, 3, 6]},
        {'boat_idx': 2, 'route_idx': 5, 'hour': 7, 'days': [1, 4]},
        {'boat_idx': 3, 'route_idx': 0, 'hour': 13, 'days': [1, 3, 5]},
        {'boat_idx': 3, 'route_idx': 1, 'hour': 22, 'days': [1, 3, 5]},
        {'boat_idx': 4, 'route_idx': 2, 'hour': 14, 'days': [0, 2, 4, 6]},
        {'boat_idx': 5, 'route_idx': 4, 'hour': 11, 'days': [1, 2, 5, 6]},
        {'boat_idx': 6, 'route_idx': 3, 'hour': 15, 'days': [0, 1, 3, 5]},
    ]

    statuts = ['programme', 'confirme', 'confirme', 'confirme', 'retarde']
    capitaines = [
        'Capitaine Kabila',
        'Capitaine Tshisekedi',
        'Capitaine Mulamba',
        'Capitaine Ndombele',
        'Capitaine Lukaku'
    ]

    for day in range(7):
        current_date = base_date + timedelta(days=day)

        for schedule in schedules:
            if day in schedule['days']:
                boat = boats[schedule['boat_idx']]
                route = routes[schedule['route_idx']]

                date_depart = current_date.replace(hour=schedule['hour'], minute=0)
                # Calculer date d'arrivée en ajoutant la durée en minutes
                duree_minutes = route.duree_estimative or 480
                date_arrivee = date_depart + timedelta(minutes=duree_minutes)

                # Varier les statuts
                statut = statuts[day % len(statuts)]

                program = ProgrammeVoyage(
                    route_id=route.id,
                    bateau_id=boat.id,
                    compagnie_id=boat.compagnie_id,
                    port_depart_id=route.port_depart_id,
                    port_arrivee_id=route.port_arrivee_id,
                    date_depart_programme=date_depart,
                    date_arrivee_programmee=date_arrivee,
                    prix_base=route.prix_base,
                    places_disponibles_passagers=boat.capacite_passagers,
                    places_disponibles_vehicules=boat.capacite_vehicules or 0,
                    places_vendues_passagers=0,
                    places_vendues_vehicules=0,
                    statut=statut,
                    capitaine_nom=capitaines[schedule['boat_idx'] % len(capitaines)],
                    equipage_nombre=15 + (schedule['boat_idx'] * 2),
                    remarques="Voyage régulier" if statut == 'confirme' else None,
                    retard_motif="Conditions météo" if statut == 'retarde' else None
                )
                db.add(program)
                programs.append(program)

    await db.flush()
    print(f"✅ Créé: {len(programs)} programmes de voyage sur 7 jours")

    return programs


async def main():
    """Fonction principale"""
    print("=" * 60)
    print("🚀 INITIALISATION DE LA BASE DE DONNÉES")
    print("=" * 60)

    # Nettoyer la base de données
    await clear_database()

    # Créer une session
    async with async_session_maker() as db:
        try:
            # Créer les données géographiques
            geo_data = await create_geography(db)

            # Créer les compagnies
            companies = await create_companies(db)

            # Créer les bateaux
            boats = await create_boats(db, companies)

            # Créer les routes
            routes = await create_routes(db, geo_data['ports'], companies)

            # Créer les programmes de voyage
            programs = await create_voyage_programs(db, boats, routes)

            # Commit final
            await db.commit()

            print("\n" + "=" * 60)
            print("✅ BASE DE DONNÉES INITIALISÉE AVEC SUCCÈS!")
            print("=" * 60)
            print("\n📊 Résumé:")
            print("   • 1 pays (RDC)")
            print("   • 3 villes (Kalemie, Moba, Uvira)")
            print("   • 3 ports avec coordonnées GPS")
            print(f"   • {len(companies)} compagnies maritimes")
            print(f"   • {len(boats)} bateaux congolais:")
            print("     - Okako, Amani (Tanganyika Express)")
            print("     - Mwanga, Furaha (Lac Kivu Navigation)")
            print("     - Tumaini (Safari Maritime)")
            print("     - Upendo (Blue Waters Transport)")
            print("     - Baraka (Grands Lacs Shipping)")
            print(f"   • {len(routes)} routes")
            print(f"   • {len(programs)} programmes de voyage")
            print("\n🌐 Vous pouvez maintenant accéder à:")
            print("   • Backend: http://localhost:8000")
            print("   • Frontend: http://localhost:3000/compagnies")
            print("\n⛴️  Bon voyage!")

        except Exception as e:
            print(f"\n❌ Erreur: {e}")
            import traceback
            traceback.print_exc()
            await db.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(main())
