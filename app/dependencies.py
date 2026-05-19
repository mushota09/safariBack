from typing import Annotated
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.utilisateur import Utilisateur

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Utilisateur:
    """Récupère l'utilisateur actuel à partir du token JWT"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        user_id = int(user_id_str)  # Convert string to int
    except (JWTError, ValueError):
        raise credentials_exception

    result = await db.execute(select(Utilisateur).where(Utilisateur.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    return user


async def get_current_user_allow_inactive(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> Utilisateur:
    """Récupère l'utilisateur actuel même s'il est inactif (pour complétion de profil)"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        print(f"🔑 Decoding token: {token[:20]}...")
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        print(f"👤 User ID from token (string): {user_id_str}")
        if user_id_str is None:
            print("❌ User ID is None")
            raise credentials_exception
        user_id = int(user_id_str)  # Convert string to int
        print(f"👤 User ID converted to int: {user_id}")
    except JWTError as e:
        print(f"❌ JWT Error: {e}")
        raise credentials_exception
    except ValueError as e:
        print(f"❌ ValueError converting user_id: {e}")
        raise credentials_exception

    result = await db.execute(select(Utilisateur).where(Utilisateur.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        print(f"❌ User not found in database: {user_id}")
        raise credentials_exception

    print(f"✅ User found: {user.email}, is_active: {user.is_active}")
    return user


async def get_current_active_user(
    current_user: Annotated[Utilisateur, Depends(get_current_user)]
) -> Utilisateur:
    """Vérifie que l'utilisateur est actif"""
    if not current_user.actif:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_superuser(
    current_user: Annotated[Utilisateur, Depends(get_current_user)]
) -> Utilisateur:
    """Vérifie que l'utilisateur est un superutilisateur"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


async def get_admin_user(
    current_user: Annotated[Utilisateur, Depends(get_current_user)]
) -> Utilisateur:
    """Autorise admin compagnie ou super admin (auth centralisée du backoffice)."""
    role_value = getattr(current_user, "role", None)
    is_admin = (
        current_user.is_superuser
        or (role_value is not None and getattr(role_value, "value", role_value) in ("admin_compagnie", "super_admin"))
    )
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def get_tenant_company_id(
    current_user: Annotated[Utilisateur, Depends(get_admin_user)]
) -> int:
    """Retourne le ``compagnie_id`` du tenant administré.

    Centralisation du contrôle multi-tenant: toute ressource gérée côté admin
    doit être filtrée par cet identifiant.
    """
    if current_user.compagnie_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin user not associated with any company",
        )
    return current_user.compagnie_id


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """Crée un token JWT d'accès"""
    to_encode = data.copy()
    # Convert sub to string if it's an integer (JWT spec requires string)
    if "sub" in to_encode and isinstance(to_encode["sub"], int):
        to_encode["sub"] = str(to_encode["sub"])

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Crée un token JWT de rafraîchissement"""
    to_encode = data.copy()
    # Convert sub to string if it's an integer (JWT spec requires string)
    if "sub" in to_encode and isinstance(to_encode["sub"], int):
        to_encode["sub"] = str(to_encode["sub"])

    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


async def verify_api_key(
    x_api_key: Annotated[str | None, Header()] = None,
    authorization: Annotated[str | None, Header()] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> bool:
    """Vérifie l'autorisation pour les endpoints d'embarquement.

    Acceptable :
    - clé API (header ``X-API-Key``) — pour les terminaux internes (kiosques) ;
    - **OU** un JWT valide d'un utilisateur authentifié (admin compagnie,
      super admin, ou agent embarquement). C'est cette voie qui est utilisée
      depuis le frontend agent (mobile).
    """
    valid_api_keys = ["admin_api_key_changez_moi"]
    if x_api_key and x_api_key in valid_api_keys:
        return True

    # Fallback : JWT
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id_str = payload.get("sub")
            if not user_id_str:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
            user_id = int(user_id_str)
        except (JWTError, ValueError):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

        if db is None:
            # En théorie inatteignable car FastAPI injecte toujours db
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="DB unavailable")
        result = await db.execute(select(Utilisateur).where(Utilisateur.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive or unknown user")
        return True

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Authentication required (API key or Bearer token)",
    )
