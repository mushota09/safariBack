import asyncio
from typing import Annotated
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.availability_cache import get_voyage_availability
from app.websocket_manager import websocket_manager

router = APIRouter(tags=["WebSocket"])


@router.get("/voyages/{voyage_id}/disponibilite")
async def get_voyage_disponibilite(
    voyage_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Disponibilité d'un voyage (cache Redis court TTL + fallback DB)."""
    data = await get_voyage_availability(db, voyage_id)
    if data is None:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Voyage not found")
    return data


@router.websocket("/ws/disponibilite/{voyage_id}")
async def websocket_disponibilite(websocket: WebSocket, voyage_id: int):
    """
    WebSocket endpoint pour recevoir les mises à jour de disponibilité en temps réel.

    Le client reçoit:
    - Les mises à jour de disponibilité quand une réservation est confirmée
    - Des heartbeats toutes les 30 secondes
    """
    await websocket_manager.connect(websocket, voyage_id)

    try:
        # Envoyer un message de bienvenue
        await websocket_manager.send_personal_message(
            {
                "type": "connected",
                "voyage_id": voyage_id,
                "message": "Connected to availability updates"
            },
            websocket
        )

        # Boucle de heartbeat
        heartbeat_task = asyncio.create_task(send_heartbeats(websocket))

        # Écouter les messages du client (pour maintenir la connexion)
        while True:
            data = await websocket.receive_text()

            # Le client peut envoyer un ping
            if data == "ping":
                await websocket_manager.send_personal_message(
                    {"type": "pong"},
                    websocket
                )

    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket, voyage_id)
        heartbeat_task.cancel()
    except Exception as e:
        print(f"WebSocket error: {e}")
        websocket_manager.disconnect(websocket, voyage_id)
        if 'heartbeat_task' in locals():
            heartbeat_task.cancel()


async def send_heartbeats(websocket: WebSocket):
    """Envoie des heartbeats périodiques pour maintenir la connexion"""
    try:
        while True:
            await asyncio.sleep(30)
            await websocket_manager.send_heartbeat(websocket)
    except asyncio.CancelledError:
        pass
    except Exception:
        pass
