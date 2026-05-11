from pydantic import BaseModel, EmailStr, Field
from datetime import date
from typing import Optional


class UserRegister(BaseModel):
    email: EmailStr
    nom_complet: str = Field(..., min_length=2, max_length=200)
    numero_telephone: str = Field(..., min_length=10, max_length=20)
    password: str = Field(..., min_length=6)
    date_naissance: date
    langue_preferee: str = "fr"


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    numero_telephone: Optional[str]
    nom_complet: Optional[str]
    photo_profil: Optional[str]
    date_naissance: Optional[date]
    langue_preferee: str
    is_active: bool
    is_superuser: bool
    notification_email: bool
    notification_sms: bool

    class Config:
        from_attributes = True


class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)


class CompleteProfile(BaseModel):
    numero_telephone: str = Field(..., min_length=8, max_length=20)
    date_naissance: date

