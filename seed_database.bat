@echo off
echo ========================================
echo   INITIALISATION DE LA BASE DE DONNEES
echo ========================================
echo.
echo Ce script va:
echo - Supprimer toutes les donnees existantes
echo - Creer 5 compagnies maritimes
echo - Creer 3 ports (Kalemie, Moba, Uvira)
echo - Creer des bateaux avec et sans niveaux
echo - Creer des programmes de voyage
echo.
echo ATTENTION: Toutes les donnees existantes seront supprimees!
echo.
pause

echo.
echo Execution du script avec uv...
echo.

cd /d "%~dp0"
uv run python scripts/seed_data.py

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   TERMINE AVEC SUCCES!
    echo ========================================
    echo.
    echo Vous pouvez maintenant demarrer:
    echo   1. Backend:  uv run uvicorn app.main:app --reload
    echo   2. Frontend: cd frontend ^&^& npm start
    echo.
) else (
    echo.
    echo ========================================
    echo   ERREUR LORS DE L'EXECUTION
    echo ========================================
    echo.
    echo Verifiez que:
    echo   - La base de donnees est accessible
    echo   - Le fichier .env est correctement configure
    echo   - uv est installe
    echo.
)

pause
