from typing import Optional
from datetime import timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext
from fastapi import HTTPException, status

from app.models.utilisateur import Utilisateur
from app.modules.auth.schemas import UserRegister, UserLogin
from app.dependencies import create_access_token, create_refresh_token

# Utiliser Argon2 au lieu de bcrypt (plus moderne, plus sécurisé, pas de limite de 72 bytes)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


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
        # Générer le username automatiquement à partir de l'email
        username = user_data.email.split("@")[0]

        # Vérifier si le username existe déjà et ajouter un suffixe si nécessaire
        result = await db.execute(
            select(Utilisateur).where(Utilisateur.username == username)
        )
        if result.scalar_one_or_none():
            # Ajouter un suffixe numérique si le username existe
            import random
            username = f"{username}_{random.randint(1000, 9999)}"

        # Vérifier si l'email ou le numéro de téléphone existe déjà
        result = await db.execute(
            select(Utilisateur).where(
                (Utilisateur.email == user_data.email) |
                (Utilisateur.numero_telephone == user_data.numero_telephone)
            )
        )
        existing_user = result.scalar_one_or_none()

        if existing_user:
            if existing_user.email == user_data.email:
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
            username=username,
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
        """Authentifie un utilisateur par email **ou** username.

        Le frontend ne demande désormais que l'email à l'utilisateur final, mais
        cet ancien identifiant doit continuer à fonctionner pour les comptes
        existants ou pour l'admin (qui peut aussi venir par /auth/admin/login).
        """
        identifier = login_data.username
        query = select(Utilisateur).where(
            (Utilisateur.email == identifier) | (Utilisateur.username == identifier)
        )
        result = await db.execute(query)
        user = result.scalar_one_or_none()

        if not user:
            return None

        if not self.verify_password(login_data.password, user.hashed_password):
            return None

        return user

    async def authenticate_admin(
        self,
        db: AsyncSession,
        email: str,
        password: str,
        company_code: str,
    ) -> Optional[Utilisateur]:
        """Authentifie un admin compagnie via email + mot de passe + code compagnie.

        Le code compagnie doit correspondre à ``CompagnieBateau.code_admin`` de
        la compagnie à laquelle l'utilisateur est rattaché.
        """
        from app.models.compagnie import CompagnieBateau
        from app.models.utilisateur import RoleUtilisateur

        result = await db.execute(select(Utilisateur).where(Utilisateur.email == email))
        user = result.scalar_one_or_none()
        if not user:
            return None

        role_value = getattr(user.role, "value", user.role) if getattr(user, "role", None) is not None else None
        is_admin = user.is_superuser or role_value in ("admin_compagnie", "super_admin")
        if not is_admin:
            return None

        if not self.verify_password(password, user.hashed_password):
            return None

        if user.compagnie_id is None:
            return None

        result_c = await db.execute(
            select(CompagnieBateau).where(CompagnieBateau.id == user.compagnie_id)
        )
        compagnie = result_c.scalar_one_or_none()
        if not compagnie or not compagnie.code_admin:
            return None
        if compagnie.code_admin.strip() != company_code.strip():
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
