"""
Script d'exemple pour tester le module Analytics.

Usage:
    python test_analytics_example.py

Note: Assurez-vous que le serveur FastAPI est lancé sur localhost:8000
"""
import asyncio
import httpx
from datetime import date, datetime, timedelta


# Configuration
BASE_URL = "http://localhost:8000"
API_PREFIX = "/analytics"


class AnalyticsTestClient:
    """Client de test pour le module Analytics."""

    def __init__(self, base_url: str):
        self.base_url = base_url
        self.token = None

    async def login(self, username: str, password: str):
        """Se connecter et obtenir un token."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/auth/login",
                json={"username": username, "password": password}
            )
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                print(f"✅ Connecté en tant que {username}")
                return True
            else:
                print(f"❌ Échec de connexion: {response.status_code}")
                return False

    @property
    def headers(self):
        """Headers avec token d'authentification."""
        if not self.token:
            raise ValueError("Non connecté. Appelez login() d'abord.")
        return {"Authorization": f"Bearer {self.token}"}

    async def test_dashboard_direction(self):
        """Tester le dashboard direction."""
        print("\n📊 Test: Dashboard Direction")
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}{API_PREFIX}/dashboard/direction",
                headers=self.headers
            )
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Réussi!")
                print(f"   - CA aujourd'hui: {data['kpi_financiers']['ca_aujourdhui']}€")
                print(f"   - CA mois: {data['kpi_financiers']['ca_mois_en_cours']}€")
                print(f"   - Voyages aujourd'hui: {data['kpi_operationnels']['voyages_aujourdhui']}")
                print(f"   - Réservations: {data['kpi_clients']['reservations_aujourdhui']}")
                if data['alertes']:
                    print(f"   - Alertes: {', '.join(data['alertes'])}")
            else:
                print(f"❌ Échec: {response.status_code}")
                print(f"   {response.json()}")

    async def test_ca_periode(self):
        """Tester le CA par période."""
        print("\n💰 Test: Chiffre d'Affaires par Mois")

        # Dernier mois
        aujourd_hui = date.today()
        date_fin = aujourd_hui
        date_debut = aujourd_hui - timedelta(days=30)

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}{API_PREFIX}/financier/chiffre-affaires",
                params={
                    "date_debut": date_debut.isoformat(),
                    "date_fin": date_fin.isoformat(),
                    "grouper_par": "mois"
                },
                headers=self.headers
            )
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Réussi! {len(data)} période(s) trouvée(s)")
                for periode in data[:3]:  # Afficher les 3 premières
                    print(f"   - {periode['periode']}: {periode['montant_total']}€ "
                          f"({periode['nombre_reservations']} réservations)")
            else:
                print(f"❌ Échec: {response.status_code}")

    async def test_top_routes(self):
        """Tester les top routes."""
        print("\n🗺️  Test: Top 5 Routes Rentables")
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}{API_PREFIX}/financier/routes",
                params={"limit": 5},
                headers=self.headers
            )
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Réussi! {len(data)} route(s) trouvée(s)")
                for i, route in enumerate(data, 1):
                    print(f"   {i}. {route['port_depart']} → {route['port_arrivee']}: "
                          f"{route['montant_total']}€ ({route['nombre_reservations']} rés.)")
            else:
                print(f"❌ Échec: {response.status_code}")

    async def test_statistiques_clients(self):
        """Tester les statistiques clients."""
        print("\n👥 Test: Statistiques Clients")
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}{API_PREFIX}/clients/statistiques",
                headers=self.headers
            )
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Réussi!")
                print(f"   - Total clients: {data['total_clients']}")
                print(f"   - Nouveaux clients: {data['nouveaux_clients']}")
                print(f"   - Clients récurrents: {data['clients_recurrents']}")
                print(f"   - Taux de récurrence: {data['taux_recurrence']}%")
            else:
                print(f"❌ Échec: {response.status_code}")

    async def test_taux_remplissage(self):
        """Tester le taux de remplissage."""
        print("\n🚢 Test: Taux de Remplissage des Voyages")
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}{API_PREFIX}/operationnel/taux-remplissage",
                headers=self.headers
            )
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Réussi! {len(data)} voyage(s) trouvé(s)")
                for voyage in data[:3]:  # Afficher les 3 premiers
                    print(f"   - {voyage['bateau']} ({voyage['route']}): "
                          f"{voyage['taux_remplissage_passagers']}% passagers, "
                          f"{voyage['taux_remplissage_vehicules']}% véhicules")
            else:
                print(f"❌ Échec: {response.status_code}")

    async def test_equipage(self):
        """Tester les statistiques équipage."""
        print("\n👨‍✈️ Test: Statistiques Équipage")
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}{API_PREFIX}/equipage/statistiques",
                headers=self.headers
            )
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Réussi!")
                print(f"   - Total membres: {data['total_membres']}")
                print(f"   - Actifs: {data['membres_actifs']}")
                print(f"   - En congé: {data['membres_en_conge']}")
                print(f"   - Répartition par rôle:")
                for role, nombre in data['repartition_par_role'].items():
                    print(f"     • {role}: {nombre}")
            else:
                print(f"❌ Échec: {response.status_code}")

    async def test_tendances_saisonnieres(self):
        """Tester les tendances saisonnières."""
        print("\n📈 Test: Tendances Saisonnières")
        annee = datetime.now().year
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}{API_PREFIX}/tendances/saisonnieres",
                params={"annee": annee},
                headers=self.headers
            )
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Réussi! {len(data)} mois trouvé(s)")
                for tendance in data[:3]:  # Afficher les 3 premiers mois
                    print(f"   - {tendance['mois']}: {tendance['ca_total']}€ "
                          f"({tendance['nombre_reservations']} rés., "
                          f"remplissage: {tendance['taux_remplissage_moyen']}%)")
            else:
                print(f"❌ Échec: {response.status_code}")

    async def test_acces_non_autorise(self):
        """Tester l'accès non autorisé."""
        print("\n🔒 Test: Accès Non Autorisé (sans token)")
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}{API_PREFIX}/dashboard/direction"
            )
            if response.status_code == 401:
                print(f"✅ Sécurité OK: Accès refusé sans token (401)")
            else:
                print(f"⚠️  Inattendu: {response.status_code}")

    async def run_all_tests(self):
        """Exécuter tous les tests."""
        print("=" * 60)
        print("🧪 TEST DU MODULE ANALYTICS")
        print("=" * 60)

        # Test sécurité
        await self.test_acces_non_autorise()

        # Se connecter
        success = await self.login("admin", "admin123")
        if not success:
            print("\n❌ Impossible de se connecter. Tests annulés.")
            print("Note: Assurez-vous d'avoir un utilisateur admin avec ces credentials.")
            return

        # Tests des endpoints
        await self.test_dashboard_direction()
        await self.test_ca_periode()
        await self.test_top_routes()
        await self.test_statistiques_clients()
        await self.test_taux_remplissage()
        await self.test_equipage()
        await self.test_tendances_saisonnieres()

        print("\n" + "=" * 60)
        print("✅ TESTS TERMINÉS")
        print("=" * 60)
        print("\nNote: Si aucune donnée n'est retournée, assurez-vous d'avoir")
        print("des données de test dans votre base de données.")


async def main():
    """Point d'entrée principal."""
    client = AnalyticsTestClient(BASE_URL)
    await client.run_all_tests()


if __name__ == "__main__":
    print("\n🚀 Lancement des tests du module Analytics...")
    print("📝 Note: Le serveur FastAPI doit être lancé sur localhost:8000\n")

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⏹️  Tests interrompus par l'utilisateur")
    except Exception as e:
        print(f"\n\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
