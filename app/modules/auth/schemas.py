from pydantic import BaseModel, EmailStr, Field
from datetime import date
from typing import Optional


class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    numero_telephone: str = Field(..., min_length=8, max_length=20)
    password: str = Field(..., min_length=6)
    nom_complet: Optional[str] = None
    date_naissance: Optional[date] = None
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
    numero_telephone: str
    nom_complet: Optional[str]
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
