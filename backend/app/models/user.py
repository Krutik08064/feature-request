from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"

class UserSignupRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)

class UserVerifyEmailRequest(BaseModel):
    email: EmailStr
    token: str

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    token: str
    new_password: str = Field(..., min_length=6, max_length=128)

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    avatar_url: Optional[str] = None
    role: UserRole
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserInDB(BaseModel):
    id: Optional[str] = None
    name: str
    email: str
    password_hash: str
    avatar_url: Optional[str] = None
    role: UserRole = UserRole.USER
    is_verified: bool = False
    verification_token: Optional[str] = None
    reset_token: Optional[str] = None
    reset_token_expires_at: Optional[datetime] = None
    refresh_token_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
