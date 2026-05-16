import asyncio
import json
from typing import Dict, Set
from fastapi import WebSocket
from app.redis_client import redis_client


class WebSocketManager:
    def __init__(self):
        # Dictionnaire: voyage_id -> Set[WebSocket]
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        self._pubsub_task = None

    async def connect(self, websocket: WebSocket, voyage_id: int):
        """Connecte un client WebSocket à un voyage spécifique"""
        await websocket.accept()

        if voyage_id not in self.active_connections:
            self.active_connections[voyage_id] = set()

        self.active_connections[voyage_id].add(websocket)

        # Démarrer l'écoute Redis si ce n'est pas déjà fait
        if self._pubsub_task is None:
            self._pubsub_task = asyncio.create_task(self._listen_redis())

    def disconnect(self, websocket: WebSocket, voyage_id: int):
        """Déconnecte un client WebSocket"""
        if voyage_id in self.active_connections:
            self.active_connections[voyage_id].discard(websocket)

            # Nettoyer si plus de connexions
            if not self.active_connections[voyage_id]:
                del self.active_connections[voyage_id]

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Envoie un message à un client spécifique"""
        try:
            await websocket.send_json(message)
        except Exception:
            pass

    async def broadcast_to_voyage(self, voyage_id: int, message: dict):
        """Broadcast un message à tous les clients connectés à un voyage"""
        if voyage_id not in self.active_connections:
            return

        disconnected = set()
        for connection in self.active_connections[voyage_id]:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)

        # Nettoyer les connexions mortes
        for conn in disconnected:
            self.disconnect(conn, voyage_id)

    async def publish_update(self, voyage_id: int, data: dict, event: str = "availability"):
        """Publie une mise à jour via Redis pour le scaling horizontal.

        ``event`` permet d'étiqueter le type de notification: ``availability``
        (mise à jour de places), ``reservation`` (réservation validée),
        ``voyage_status`` (changement de statut du voyage).
        """
        channel = f"voyage_updates:{voyage_id}"
        message = {
            "voyage_id": voyage_id,
            "event": event,
            "data": data,
            "timestamp": asyncio.get_event_loop().time(),
        }
        await redis_client.publish(channel, message)

    async def _listen_redis(self):
        """Écoute les messages Redis et les broadcast aux WebSockets"""
        try:
            # S'abonner à tous les canaux de mise à jour de voyage
            pubsub = await redis_client.subscribe("voyage_updates:*")

            async for message in redis_client.listen():
                if isinstance(message, dict) and "voyage_id" in message:
                    voyage_id = message["voyage_id"]
                    data = message.get("data", {})
                    await self.broadcast_to_voyage(voyage_id, data)
        except Exception as e:
            print(f"Erreur dans l'écoute Redis: {e}")

    async def send_heartbeat(self, websocket: WebSocket):
        """Envoie un heartbeat pour maintenir la connexion"""
        try:
            await websocket.send_json({"type": "heartbeat", "timestamp": asyncio.get_event_loop().time()})
        except Exception:
            pass


websocket_manager = WebSocketManager()
