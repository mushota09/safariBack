from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import init_db, close_db
from app.redis_client import redis_client

# Import all models to register them with SQLAlchemy
from app.models import *

# Import des routers
from app.modules.auth.router import router as auth_router
from app.modules.compagnie.router import router as compagnie_router
from app.modules.compagnie.galerie_router import router as galerie_bateau_router
from app.modules.traversee.router import router as traversee_router
from app.modules.reservation.router import router as reservation_router
from app.modules.paiement.router import router as paiement_router
from app.modules.embarquement.router import router as embarquement_router
from app.modules.websocket.router import router as websocket_router
from app.modules.geographie.router import router as geographie_router

# Import des tâches périodiques
from app.tasks.scheduler import start_scheduler, stop_scheduler


# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestion du cycle de vie de l'application"""
    # Startup
    print("🚀 Starting application...")

    # Connexion à Redis
    await redis_client.connect()
    print("✅ Redis connected")

    # Initialiser la base de données (optionnel en production)
    if settings.DEBUG:
        await init_db()
        print("✅ Database initialized")

    # Démarrer le scheduler
    start_scheduler()
    print("✅ Scheduler started")

    yield

    # Shutdown
    print("🛑 Shutting down application...")

    # Arrêter le scheduler
    stop_scheduler()
    print("✅ Scheduler stopped")

    # Fermer les connexions
    await redis_client.disconnect()
    await close_db()
    print("✅ Connections closed")


# Créer l'application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API complète de réservation de billets de bateau",
    lifespan=lifespan
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Routes de santé
@app.get("/")
async def root():
    return {
        "message": "Compagnie Bateau API",
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Vérification de santé de l'API"""
    return {
        "status": "healthy",
        "redis": "connected" if redis_client.redis else "disconnected"
    }


# Enregistrer les routers
app.include_router(auth_router)
app.include_router(compagnie_router)
app.include_router(galerie_bateau_router)
app.include_router(traversee_router)
app.include_router(reservation_router)
app.include_router(paiement_router)
app.include_router(embarquement_router)
app.include_router(websocket_router)
app.include_router(geographie_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
