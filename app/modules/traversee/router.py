from typing import Annotated, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.modules.traversee.service import traversee_service
from app.modules.traversee.schemas import TraverseeSearchParams, TraverseeResponse

router = APIRouter(prefix="/traversees", tags=["Traversées"])


@router.get("", response_model=list[TraverseeResponse])
async def search_traversees(
    db: Annotated[AsyncSession, Depends(get_db)],
    port_depart: Optional[int] = Query(None),
    port_arrivee: Optional[int] = Query(None),
    date_min: Optional[datetime] = Query(None),
    date_max: Optional[datetime] = Query(None),
    passagers: int = Query(1, ge=1),
    vehicule: bool = Query(False),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """Recherche des traversées disponibles avec cache Redis"""
    search_params = TraverseeSearchParams(
        port_depart=port_depart,
        port_arrivee=port_arrivee,
        date_min=date_min,
        date_max=date_max,
        passagers=passagers,
        vehicule=vehicule,
        page=page,
        page_size=page_size
    )

    return await traversee_service.search_traversees(db, search_params)


@router.get("/stream")
async def stream_traversees(
    db: Annotated[AsyncSession, Depends(get_db)],
    port_depart: Optional[int] = Query(None),
    port_arrivee: Optional[int] = Query(None),
    date_min: Optional[datetime] = Query(None),
    date_max: Optional[datetime] = Query(None),
    passagers: int = Query(1, ge=1),
    vehicule: bool = Query(False)
):
    """Streaming des résultats de recherche de traversées"""
    search_params = TraverseeSearchParams(
        port_depart=port_depart,
        port_arrivee=port_arrivee,
        date_min=date_min,
        date_max=date_max,
        passagers=passagers,
        vehicule=vehicule
    )

    return StreamingResponse(
        traversee_service.stream_traversees(db, search_params),
        media_type="application/x-ndjson"
    )
