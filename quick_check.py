#!/usr/bin/env python3
"""
Script de vérification rapide avant démarrage
"""
import os
import sys

def check_file(path, description):
    """Vérifie qu'un fichier existe"""
    if os.path.exists(path):
        print(f"✅ {description}")
        return True
    else:
        print(f"❌ {description} - MANQUANT: {path}")
        return False

def check_directory(path, description):
    """Vérifie qu'un dossier existe"""
    if os.path.isdir(path):
        print(f"✅ {description}")
        return True
    else:
        print(f"❌ {description} - MANQUANT: {path}")
        return False

print("🔍 VÉRIFICATION RAPIDE - Safari Fast")
print("=" * 60)

all_ok = True

# Backend
print("\n📦 BACKEND")
all_ok &= check_file(".env", "Fichier .env")
all_ok &= check_file("app/main.py", "Point d'entrée backend")
all_ok &= check_file("app/config.py", "Configuration")
all_ok &= check_directory("app/modules", "Modules API")
all_ok &= check_directory("app/models", "Modèles")
all_ok &= check_directory("app/services", "Services")

# Frontend
print("\n🎨 FRONTEND")
all_ok &= check_directory("frontend", "Dossier frontend")
all_ok &= check_file("frontend/package.json", "Package.json")
all_ok &= check_file("frontend/src/App.js", "App.js")
all_ok &= check_directory("frontend/src/pages", "Pages")
all_ok &= check_directory("frontend/src/components", "Composants")

# Nouvelles pages
print("\n✨ NOUVELLES PAGES")
all_ok &= check_file("frontend/src/pages/LoginPage.js", "LoginPage")
all_ok &= check_file("frontend/src/pages/ProfilePage.js", "ProfilePage")
all_ok &= check_file("frontend/src/pages/MyReservationsPage.js", "MyReservationsPage")
all_ok &= check_file("frontend/src/pages/ReservationDetailsPage.js", "ReservationDetailsPage")
all_ok &= check_file("frontend/src/pages/CompagniesPage.js", "CompagniesPage")

# CSS
print("\n🎨 STYLES")
all_ok &= check_file("frontend/src/pages/LoginPage.css", "LoginPage.css")
all_ok &= check_file("frontend/src/pages/ProfilePage.css", "ProfilePage.css")
all_ok &= check_file("frontend/src/pages/MyReservationsPage.css", "MyReservationsPage.css")
all_ok &= check_file("frontend/src/pages/ReservationDetailsPage.css", "ReservationDetailsPage.css")
all_ok &= check_file("frontend/src/pages/CompagniesPage.css", "CompagniesPage.css")
all_ok &= check_file("frontend/src/components/Header.css", "Header.css")

# Documentation
print("\n📚 DOCUMENTATION")
all_ok &= check_file("README.md", "README principal")
all_ok &= check_file("TESTING_GUIDE.md", "Guide de test")
all_ok &= check_file("FINAL_STATUS.md", "Statut final")
all_ok &= check_file("frontend/README.md", "README frontend")

print("\n" + "=" * 60)
if all_ok:
    print("✅ TOUT EST OK! Prêt à démarrer!")
    print("\n📝 PROCHAINES ÉTAPES:")
    print("1. Backend: uvicorn app.main:app --reload")
    print("2. Frontend: cd frontend && npm start")
    sys.exit(0)
else:
    print("❌ CERTAINS FICHIERS MANQUENT!")
    print("Veuillez vérifier les erreurs ci-dessus.")
    sys.exit(1)
