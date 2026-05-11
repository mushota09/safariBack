@echo off
REM Script de démarrage du frontend Safari Fast pour Windows
REM Ce script vérifie la configuration et démarre le serveur React

echo.
echo ========================================
echo Safari Fast - Demarrage du Frontend
echo ========================================
echo.

REM Vérifier que Node.js est installé
node --version >nul 2>&1
if errorlevel 1 (
    echo Erreur: Node.js n'est pas installe
    echo Installez Node.js depuis https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js installe
echo.

REM Vérifier que npm est installé
npm --version >nul 2>&1
if errorlevel 1 (
    echo Erreur: npm n'est pas installe
    pause
    exit /b 1
)

echo npm installe
echo.

REM Vérifier que les dépendances sont installées
if not exist "node_modules" (
    echo Dependances non installees
    echo Installation des dependances...
    call npm install

    if errorlevel 1 (
        echo Erreur lors de l'installation des dependances
        pause
        exit /b 1
    )
)

echo Dependances installees
echo.

REM Vérifier que le backend est accessible
echo Verification du backend...
curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo Backend non accessible sur http://localhost:8000
    echo Assurez-vous que le backend est demarre avant d'utiliser le frontend
    echo.
    echo Voulez-vous continuer quand meme? (O/N)
    set /p response=
    if /i not "%response%"=="O" (
        echo Arret du demarrage
        pause
        exit /b 1
    )
) else (
    echo Backend accessible
)

echo.
echo Demarrage du serveur React...
echo Frontend: http://localhost:3000
echo.
echo Appuyez sur Ctrl+C pour arreter
echo.

REM Démarrer le serveur
call npm start
