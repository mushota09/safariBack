from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt

from app.database import get_db
from app.dependencies import get_current_user, get_current_user_allow_inactive
from app.config import settings
from app.modules.auth.schemas import (
    UserRegister,
    UserLogin,
    AdminLogin,
    Token,
    TokenRefresh,
    UserResponse,
    PasswordChange,
    CompleteProfile
)
from app.modules.auth.service import auth_service
from app.modules.auth.google_auth import google_auth_service
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


@router.post("/admin/login", response_model=Token)
async def admin_login(
    login_data: AdminLogin,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Connexion admin / backoffice — email + mot de passe + code compagnie."""
    user = await auth_service.authenticate_admin(
        db,
        login_data.email,
        login_data.password,
        login_data.company_code,
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )

    return auth_service.create_tokens(user.id)


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
        user_id_str: str = payload.get("sub")
        token_type: str = payload.get("type")

        if user_id_str is None or token_type != "refresh":
            raise credentials_exception

        user_id = int(user_id_str)  # Convert string to int
    except (JWTError, ValueError):
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


@router.get("/google/login")
async def google_login():
    """Redirige vers la page de connexion Google"""
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={settings.GOOGLE_REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=openid%20email%20profile&"
        f"access_type=offline"
    )
    return {"auth_url": google_auth_url}


@router.get("/google/callback")
async def google_callback(
    db: Annotated[AsyncSession, Depends(get_db)],
    code: str = Query(...)
):
    """Callback Google OAuth"""
    # Échanger le code contre un token
    token_data = await google_auth_service.exchange_code_for_token(code)
    access_token = token_data.get("access_token")

    # Récupérer les infos utilisateur
    user_info = await google_auth_service.get_user_info(access_token)

    # Authentifier ou créer l'utilisateur
    user = await google_auth_service.authenticate_or_create_user(db, user_info)

    # Créer les tokens JWT
    tokens = auth_service.create_tokens(user.id)

    # Vérifier si le profil est complet (numéro de téléphone None = profil incomplet)
    profile_complete = user.numero_telephone is not None

    # Rediriger vers le frontend avec les tokens
    if profile_complete:
        # Profil complet - redirection normale
        frontend_url = (
            f"http://localhost:3000/auth/callback?"
            f"access_token={tokens['access_token']}&"
            f"refresh_token={tokens['refresh_token']}"
        )
    else:
        # Profil incomplet - redirection vers page de complétion
        frontend_url = (
            f"http://localhost:3000/complete-profile?"
            f"access_token={tokens['access_token']}&"
            f"refresh_token={tokens['refresh_token']}"
        )

    return RedirectResponse(url=frontend_url)



@router.post("/complete-profile", response_model=UserResponse)
async def complete_profile(
    profile_data: CompleteProfile,
    current_user: Annotated[Utilisateur, Depends(get_current_user_allow_inactive)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Compléter le profil après inscription Google OAuth"""
    print(f"🔍 Complete profile called for user: {current_user.id} - {current_user.email}")
    print(f"📞 Phone: {profile_data.numero_telephone}, DOB: {profile_data.date_naissance}")

    # Vérifier que le numéro de téléphone n'est pas déjà utilisé
    from sqlalchemy import select
    result = await db.execute(
        select(Utilisateur).where(
            Utilisateur.numero_telephone == profile_data.numero_telephone,
            Utilisateur.id != current_user.id
        )
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )

    # Mettre à jour le profil
    current_user.numero_telephone = profile_data.numero_telephone
    current_user.date_naissance = profile_data.date_naissance
    current_user.is_active = True  # Activer le compte

    await db.commit()
    await db.refresh(current_user)

    print(f"✅ Profile completed successfully for user: {current_user.id}")
    return current_user
