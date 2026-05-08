from typing import Optional
from datetime import timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext
from fastapi import HTTPException, status

from app.models.utilisateur import Utilisateur
from app.modules.auth.schemas import UserRegister, UserLogin
from app.dependencies import create_access_token, create_refresh_token

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Vérifie un mot de passe"""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash un mot de passe"""
        return pwd_context.hash(password)

    async def register(self, db: AsyncSession, user_data: UserRegister) -> Utilisateur:
        """Enregistre un nouvel utilisateur"""
        # Vérifier si l'utilisateur existe déjà
        result = await db.execute(
            select(Utilisateur).where(
                (Utilisateur.username == user_data.username) |
                (Utilisateur.email == user_data.email) |
                (Utilisateur.numero_telephone == user_data.numero_telephone)
            )
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            if existing_user.username == user_data.username:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already registered"
                )
            elif existing_user.email == user_data.email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number already registered"
                )

        # Créer l'utilisateur
        hashed_password = self.get_password_hash(user_data.password)

        new_user = Utilisateur(
            username=user_data.username,
            email=user_data.email,
            numero_telephone=user_data.numero_telephone,
            hashed_password=hashed_password,
            nom_complet=user_data.nom_complet,
            date_naissance=user_data.date_naissance,
            langue_preferee=user_data.langue_preferee,
            is_active=True,
            is_superuser=False
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        return new_user

    async def authenticate(self, db: AsyncSession, login_data: UserLogin) -> Optional[Utilisateur]:
        """Authentifie un utilisateur"""
        result = await db.execute(
            select(Utilisateur).where(Utilisateur.username == login_data.username)
        )
        user = result.scalar_one_or_none()

        if not user:
            return None

        if not self.verify_password(login_data.password, user.hashed_password):
            return None

        return user

    def create_tokens(self, user_id: int) -> dict:
        """Crée les tokens d'accès et de rafraîchissement"""
        access_token = create_access_token(data={"sub": user_id})
        refresh_token = create_refresh_token(data={"sub": user_id})

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }

    async def change_password(
        self,
        db: AsyncSession,
        user: Utilisateur,
        old_password: str,
        new_password: str
    ) -> bool:
        """Change le mot de passe d'un utilisateur"""
        if not self.verify_password(old_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect password"
            )

        user.hashed_password = self.get_password_hash(new_password)
        await db.commit()

        return True


auth_service = AuthService()
