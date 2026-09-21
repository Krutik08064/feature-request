from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import hashlib
import secrets
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings

# Password hashing setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hashes a password with bcrypt."""
    return pwd_context.hash(password)

def hash_refresh_token(token: str) -> str:
    """Creates a secure SHA-256 hash of a refresh token to store in the database."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def verify_refresh_token_hash(token: str, stored_hash: Optional[str]) -> bool:
    """Verifies a refresh token matches the stored token hash."""
    if not stored_hash:
        return False
    return secrets.compare_digest(hash_refresh_token(token), stored_hash)

def create_access_token(user_id: str, role: str, expires_delta: Optional[timedelta] = None) -> str:
    """Generates a short-lived access JWT (15 minutes)."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode: Dict[str, Any] = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "iat": now,
        "exp": expire,
    }
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """Generates a long-lived refresh JWT (7 days) with a unique JTI."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    jti = secrets.token_hex(16)
    to_encode: Dict[str, Any] = {
        "sub": str(user_id),
        "jti": jti,
        "type": "refresh",
        "iat": now,
        "exp": expire,
    }
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def decode_token(token: str, expected_type: str = "access") -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        token_type = payload.get("type")
        if token_type != expected_type:
            return None
        return payload
    except JWTError:
        return None

def generate_verification_code() -> str:
    """Generates a 6-digit verification OTP."""
    return f"{secrets.randbelow(900000) + 100000}"

def generate_reset_token() -> str:
    """Generates a secure 32-byte hex token for password reset."""
    return secrets.token_urlsafe(32)
