"""Module d'embarquement pour le système de tickets globaux."""
from app.modules.embarquement.router import router
from app.modules.embarquement.service import embarquement_service

__all__ = ["router", "embarquement_service"]
