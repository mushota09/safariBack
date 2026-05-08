"""
Script de vérification de l'installation et de la configuration.
"""
import sys
import os
from pathlib import Path


def check_file(filepath: str, description: str) -> bool:
    """Vérifie qu'un fichier existe"""
    if Path(filepath).exists():
        print(f"✅ {description}: {filepath}")
        return True
    else:
        print(f"❌ {description} manquant: {filepath}")
        return False


def check_directory(dirpath: str, description: str) -> bool:
    """Vérifie qu'un répertoire existe"""
    if Path(dirpath).is_dir():
        print(f"✅ {description}: {dirpath}")
        return True
    else:
        print(f"❌ {description} manquant: {dirpath}")
        return False


def main():
    print("🔍 Vérification de la structure du projet...\n")

    checks = []

    # Fichiers de configuration
    print("📋 Fichiers de configuration:")
    checks.append(check_file("pyproject.toml", "Configuration du projet"))
    checks.append(check_file(".env.example", "Exemple de configuration"))
    checks.append(check_file("docker-compose.yml", "Configuration Docker"))
    checks.append(check_file("alembic.ini", "Configuration Alembic"))
    checks.append(check_file("Dockerfile", "Dockerfile"))
    checks.append(check_file("README.md", "Documentation"))
    checks.append(check_file("QUICKSTART.md", "Guide de démarrage"))
    print()

    # Structure de l'application
    print("📁 Structure de l'application:")
    checks.append(check_directory("app", "Répertoire app"))
    checks.append(check_file("app/main.py", "Point d'entrée"))
    checks.append(check_file("app/config.py", "Configuration"))
    checks.append(check_file("app/database.py", "Base de données"))
    checks.append(check_file("app/redis_client.py", "Client Redis"))
    checks.append(check_file("app/dependencies.py", "Dépendances"))
    checks.append(check_file("app/websocket_manager.py", "Gestionnaire WebSocket"))
    print()

    # Modèles
    print("🗄️ Modèles:")
    checks.append(check_directory("app/models", "Répertoire models"))
    checks.append(check_file("app/models/base.py", "Modèle de base"))
    checks.append(check_file("app/models/utilisateur.py", "Modèle Utilisateur"))
    checks.append(check_file("app/models/geographie.py", "Modèles géographiques"))
    checks.append(check_file("app/models/compagnie.py", "Modèles compagnie"))
    checks.append(check_file("app/models/route.py", "Modèle Route"))
    checks.append(check_file("app/models/voyage.py", "Modèle Voyage"))
    checks.append(check_file("app/models/reservation.py", "Modèle Réservation"))
    checks.append(check_file("app/models/paiement.py", "Modèle Paiement"))
    checks.append(check_file("app/models/ticket.py", "Modèle Ticket"))
    checks.append(check_file("app/models/journal.py", "Modèle Journal"))
    checks.append(check_file("app/models/document.py", "Modèle Document"))
    checks.append(check_file("app/models/promotion.py", "Modèle Promotion"))
    print()

    # Modules
    print("📦 Modules:")
    checks.append(check_directory("app/modules", "Répertoire modules"))

    modules = [
        "auth", "compagnie", "traversee", "reservation",
        "paiement", "embarquement", "websocket"
    ]

    for module in modules:
        checks.append(check_directory(f"app/modules/{module}", f"Module {module}"))
        if module != "websocket":
            checks.append(check_file(f"app/modules/{module}/schemas.py", f"Schemas {module}"))
            checks.append(check_file(f"app/modules/{module}/service.py", f"Service {module}"))
        checks.append(check_file(f"app/modules/{module}/router.py", f"Router {module}"))
    print()

    # Services
    print("🔧 Services:")
    checks.append(check_directory("app/services", "Répertoire services"))
    checks.append(check_file("app/services/email.py", "Service email"))
    checks.append(check_file("app/services/paiement_simulateur.py", "Simulateur de paiement"))
    checks.append(check_file("app/services/pdf_generator.py", "Générateur PDF"))
    checks.append(check_file("app/services/qrcode.py", "Service QR code"))
    print()

    # Utilitaires
    print("🛠️ Utilitaires:")
    checks.append(check_directory("app/utils", "Répertoire utils"))
    checks.append(check_file("app/utils/expand.py", "Système d'expand"))
    checks.append(check_file("app/utils/pagination.py", "Système de pagination"))
    print()

    # Tâches
    print("⏰ Tâches périodiques:")
    checks.append(check_directory("app/tasks", "Répertoire tasks"))
    checks.append(check_file("app/tasks/scheduler.py", "Scheduler"))
    print()

    # Scripts
    print("📜 Scripts:")
    checks.append(check_directory("scripts", "Répertoire scripts"))
    checks.append(check_file("scripts/init_db.py", "Script d'initialisation"))
    print()

    # Tests
    print("🧪 Tests:")
    checks.append(check_directory("tests", "Répertoire tests"))
    checks.append(check_file("tests/conftest.py", "Configuration pytest"))
    checks.append(check_file("tests/test_auth.py", "Tests authentification"))
    checks.append(check_file("tests/test_compagnie.py", "Tests compagnie"))
    checks.append(check_file("tests/test_reservation.py", "Tests réservation"))
    checks.append(check_file("pytest.ini", "Configuration pytest"))
    print()

    # Alembic
    print("🔄 Migrations:")
    checks.append(check_directory("alembic", "Répertoire alembic"))
    checks.append(check_file("alembic/env.py", "Configuration Alembic"))
    checks.append(check_directory("alembic/versions", "Répertoire versions"))
    print()

    # Résumé
    total = len(checks)
    passed = sum(checks)
    failed = total - passed

    print("\n" + "="*60)
    print(f"📊 Résumé: {passed}/{total} vérifications réussies")

    if failed > 0:
        print(f"⚠️  {failed} élément(s) manquant(s)")
        print("\n💡 Conseil: Vérifiez que tous les fichiers ont été créés correctement")
        return 1
    else:
        print("✅ Tous les fichiers sont en place!")
        print("\n🎉 Le projet est prêt à être utilisé!")
        print("\n📝 Prochaines étapes:")
        print("   1. Copier .env.example vers .env et configurer")
        print("   2. Démarrer PostgreSQL et Redis (docker-compose up -d)")
        print("   3. Initialiser la base de données (python scripts/init_db.py)")
        print("   4. Lancer l'API (uvicorn app.main:app --reload)")
        return 0


if __name__ == "__main__":
    sys.exit(main())
