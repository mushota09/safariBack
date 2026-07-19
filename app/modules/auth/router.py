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
    CompleteProfile,
    ForgotPasswordRequest,
    VerifyOTPRequest,
    ResetPasswordRequest
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
    print(f"🔵 Google callback received with code: {code[:20]}...")

    # Échanger le code contre un token
    token_data = await google_auth_service.exchange_code_for_token(code)
    access_token = token_data.get("access_token")
    print(f"🔑 Got Google access token: {access_token[:20] if access_token else 'NONE'}...")

    # Récupérer les infos utilisateur
    user_info = await google_auth_service.get_user_info(access_token)
    print(f"👤 User info from Google: {user_info.get('email')}, {user_info.get('name')}")

    # Authentifier ou créer l'utilisateur
    user = await google_auth_service.authenticate_or_create_user(db, user_info)
    print(f"✅ User authenticated/created: ID={user.id}, email={user.email}, phone={user.numero_telephone}")

    # Créer les tokens JWT
    tokens = auth_service.create_tokens(user.id)
    print(f"🎫 JWT tokens created:")
    print(f"   Access: {tokens['access_token'][:30]}...")
    print(f"   Refresh: {tokens['refresh_token'][:30]}...")

    # Vérifier si le profil est complet (numéro de téléphone None = profil incomplet)
    profile_complete = user.numero_telephone is not None
    print(f"📋 Profile complete: {profile_complete}")

    # Rediriger vers le frontend avec les tokens
    if profile_complete:
        # Profil complet - redirection normale
        frontend_url = (
            f"http://localhost:3000/auth/callback?"
            f"access_token={tokens['access_token']}&"
            f"refresh_token={tokens['refresh_token']}"
        )
        print(f"➡️  Redirecting to: {frontend_url[:100]}...")
    else:
        # Profil incomplet - redirection vers page de complétion
        frontend_url = (
            f"http://localhost:3000/complete-profile?"
            f"access_token={tokens['access_token']}&"
            f"refresh_token={tokens['refresh_token']}"
        )
        print(f"➡️  Redirecting to: {frontend_url[:100]}...")

    return RedirectResponse(url=frontend_url)



@router.post("/complete-profile", response_model=UserResponse)
async def complete_profile(
    profile_data: CompleteProfile,
    current_user: Annotated[Utilisateur, Depends(get_current_user_allow_inactive)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Compléter le profil après inscription Google OAuth"""
    user = await auth_service.complete_profile(db, current_user, profile_data)
    return user


@router.post("/forgot-password")
async def forgot_password(
    request_data: ForgotPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Demander la réinitialisation du mot de passe - envoie un OTP par email"""
    await auth_service.request_password_reset(db, request_data.email)
    return {"message": "If this email exists, an OTP has been sent"}


@router.post("/verify-otp")
async def verify_otp(
    request_data: VerifyOTPRequest
):
    """Vérifier l'OTP pour la réinitialisation de mot de passe"""
    await auth_service.verify_otp(request_data.email, request_data.otp)
    return {"message": "OTP verified successfully"}


@router.post("/reset-password")
async def reset_password(
    request_data: ResetPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """Réinitialiser le mot de passe avec l'OTP vérifié"""
    await auth_service.reset_password(
        db,
        request_data.email,
        request_data.otp,
        request_data.new_password
    )
    return {"message": "Password reset successfully"}
