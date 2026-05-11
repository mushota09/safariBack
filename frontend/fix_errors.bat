@echo off
echo Nettoyage du cache et redemarrage...
echo.

REM Supprimer node_modules/.cache
if exist node_modules\.cache (
    echo Suppression du cache webpack...
    rmdir /s /q node_modules\.cache
)

REM Supprimer le dossier build si existe
if exist build (
    echo Suppression du dossier build...
    rmdir /s /q build
)

echo.
echo Cache nettoye! Redemarrez avec: npm start
echo.
pause
