import json
from typing import Optional, Any
import redis.asyncio as redis
from app.config import settings


class RedisClient:
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        self.pubsub: Optional[redis.client.PubSub] = None

    async def connect(self):
        """Connexion à Redis"""
        self.redis = await redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )

    async def disconnect(self):
        """Déconnexion de Redis"""
        if self.redis:
            await self.redis.close()

    async def get(self, key: str) -> Optional[Any]:
        """Récupérer une valeur du cache"""
        if not self.redis:
            return None
        value = await self.redis.get(key)
        if value:
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return None

    async def set(self, key: str, value: Any, ttl: int = None) -> bool:
        """Définir une valeur dans le cache"""
        if not self.redis:
            return False

        if ttl is None:
            ttl = settings.REDIS_CACHE_TTL

        if not isinstance(value, str):
            value = json.dumps(value, default=str)

        await self.redis.setex(key, ttl, value)
        return True

    async def delete(self, key: str) -> bool:
        """Supprimer une clé du cache"""
        if not self.redis:
            return False
        await self.redis.delete(key)
        return True

    async def delete_pattern(self, pattern: str) -> int:
        """Supprimer toutes les clés correspondant au pattern via SCAN (non-bloquant)"""
        if not self.redis:
            return 0
        deleted = 0
        cursor = 0
        while True:
            cursor, keys = await self.redis.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                deleted += await self.redis.delete(*keys)
            if cursor == 0:
                break
        return deleted

    async def publish(self, channel: str, message: Any) -> int:
        """Publier un message sur un canal"""
        if not self.redis:
            return 0
        if not isinstance(message, str):
            message = json.dumps(message, default=str)
        return await self.redis.publish(channel, message)

    async def subscribe(self, *channels: str):
        """S'abonner à des canaux"""
        if not self.redis:
            return None
        self.pubsub = self.redis.pubsub()
        await self.pubsub.subscribe(*channels)
        return self.pubsub

    async def unsubscribe(self, *channels: str):
        """Se désabonner de canaux"""
        if self.pubsub:
            await self.pubsub.unsubscribe(*channels)

    async def listen(self):
        """Écouter les messages sur les canaux abonnés"""
        if not self.pubsub:
            return
        async for message in self.pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    yield data
                except json.JSONDecodeError:
                    yield message["data"]


redis_client = RedisClient()


async def get_redis() -> RedisClient:
    """Dépendance pour obtenir le client Redis"""
    return redis_client
