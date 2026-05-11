from typing import Optional
import httpx
import random
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.utilisateur import Utilisateur
from app.modules.auth.service import auth_service


class GoogleAuthService:
    GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
    GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

    async def exchange_code_for_token(self, code: str) -> dict:
        """Échange le code d'autorisation contre un token d'accès"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code"
                }
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to exchange code for token"
                )

            return response.json()

    async def get_user_info(self, access_token: str) -> dict:
        """Récupère les informations de l'utilisateur depuis Google"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"}
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get user info from Google"
                )

            return response.json()

    async def authenticate_or_create_user(
        self,
        db: AsyncSession,
        google_user_info: dict
    ) -> Utilisateur:
        """Authentifie ou crée un utilisateur à partir des infos Google"""
        email = google_user_info.get("email")

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not provided by Google"
            )

        # Chercher l'utilisateur existant
        result = await db.execute(
            select(Utilisateur).where(Utilisateur.email == email)
        )
        user = result.scalar_one_or_none()

        if user:
            # Utilisateur existant
            return user

        # Créer un nouvel utilisateur
        username = email.split("@")[0]

        # Vérifier si le username existe déjà
        result = await db.execute(
            select(Utilisateur).where(Utilisateur.username == username)
        )
        if result.scalar_one_or_none():
            # Ajouter un suffixe si le username existe
            username = f"{username}_{random.randint(1000, 9999)}"

        new_user = Utilisateur(
            username=username,
            email=email,
            numero_telephone=None,  # NULL - à compléter par l'utilisateur
            hashed_password=auth_service.get_password_hash(f"google_oauth_{email}"),
            nom_complet=google_user_info.get("name", ""),
            photo_profil=google_user_info.get("picture"),  # Photo de profil Google
            is_active=False,  # Inactif jusqu'à complétion du profil
            is_superuser=False
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        return new_user


google_auth_service = GoogleAuthService()
