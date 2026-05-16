"""Endpoints d'embarquement (scan QR global ou individuel).

Tous les endpoints requièrent une clé API administrateur. Le scanner frontend
envoie soit ``numero_ticket`` (rétrocompat) soit ``qr_code`` (QR signé brut).
"""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import verify_api_key
from app.modules.embarquement.service import embarquement_service

router = APIRouter(prefix="/embarquement", tags=["Embarquement"])


class ScanRequest(BaseModel):
    code: Optional[str] = None
    qr_code: Optional[str] = None
    numero_ticket: Optional[str] = None

    def resolved(self) -> str:
        return self.code or self.qr_code or self.numero_ticket or ""


@router.post("/scan/{numero_ticket}")
async def scan_ticket_path(
    numero_ticket: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[bool, Depends(verify_api_key)],
):
    """Scan via path (rétrocompat) — accepte aussi un QR signé URL-safe."""
    return await embarquement_service.scan_ticket(db, numero_ticket)


@router.post("/scan")
async def scan_ticket_body(
    payload: ScanRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[bool, Depends(verify_api_key)],
):
    """Scan d'un ticket via body JSON. Accepte ``code`` / ``qr_code`` / ``numero_ticket``."""
    code = payload.resolved().strip()
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing scan code",
        )
    return await embarquement_service.scan_ticket(db, code)


@router.get("/verify/{numero_ticket}")
async def verify_ticket(
    numero_ticket: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[bool, Depends(verify_api_key)],
):
    """Vérifie la validité d'un billet sans l'embarquer."""
    return await embarquement_service.verify_ticket(db, numero_ticket)


@router.post("/verify")
async def verify_ticket_body(
    payload: ScanRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[bool, Depends(verify_api_key)],
):
    """Vérifie un billet via body JSON (utile pour les QR signés volumineux)."""
    code = payload.resolved().strip()
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing scan code",
        )
    return await embarquement_service.verify_ticket(db, code)
