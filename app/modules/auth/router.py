from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt

from app.database import get_db
from app.dependencies import get_current_user
from app.config import settings
from app.modules.auth.schemas import (
    UserRegister,
    UserLogin,
    Token,
    TokenRefresh,
    UserResponse,
    PasswordChange
)
from app.modules.auth.service import auth_service
from app.models.utilisateur import Utilisateur

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegister,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Enregistrer un nouvel utilisateur"""
    user = await auth_service.register(db, user_data)
    return user


@router.post("/login", response_model=Token)
async def login(
    login_data: UserLogin,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Connexion d'un utilisateur"""
    user = await auth_service.authenticate(db, login_data)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    tokens = auth_service.create_tokens(user.id)
    return tokens


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: TokenRefresh,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Rafraîchir le token d'accès"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token_data.refresh_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id: int = payload.get("sub")
        token_type: str = payload.get("type")

        if user_id is None or token_type != "refresh":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Créer de nouveaux tokens
    tokens = auth_service.create_tokens(user_id)
    return tokens


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Annotated[Utilisateur, Depends(get_current_user)]
):
    """Obtenir les informations de l'utilisateur connecté"""
    return current_user


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: Annotated[Utilisateur, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Changer le mot de passe de l'utilisateur"""
    await auth_service.change_password(
        db,
        current_user,
        password_data.old_password,
        password_data.new_password
    )

    return {"message": "Password changed successfully"}
