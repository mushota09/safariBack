#!/bin/bash

# Script de démarrage du frontend Safari Fast
# Ce script vérifie la configuration et démarre le serveur React

echo "🚢 Safari Fast - Démarrage du Frontend"
echo "======================================="
echo ""

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    echo "Installez Node.js depuis https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js installé: $(node --version)"

# Vérifier que npm est installé
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé"
    exit 1
fi

echo "✅ npm installé: $(npm --version)"
echo ""

# Vérifier que les dépendances sont installées
if [ ! -d "node_modules" ]; then
    echo "⚠️  Dépendances non installées"
    echo "📦 Installation des dépendances..."
    npm install

    if [ $? -ne 0 ]; then
        echo "❌ Erreur lors de l'installation des dépendances"
        exit 1
    fi
fi

echo "✅ Dépendances installées"
echo ""

# Vérifier que le backend est accessible
echo "🔍 Vérification du backend..."
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend accessible sur http://localhost:8000"
else
    echo "⚠️  Backend non accessible sur http://localhost:8000"
    echo "Assurez-vous que le backend est démarré avant d'utiliser le frontend"
    echo ""
    echo "Voulez-vous continuer quand même? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "Arrêt du démarrage"
        exit 1
    fi
fi

echo ""
echo "🚀 Démarrage du serveur React..."
echo "Frontend: http://localhost:3000"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter"
echo ""

# Démarrer le serveur
npm start
