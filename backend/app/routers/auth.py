from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from bson import ObjectId
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from app.core.config import settings
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_refresh_token,
    verify_refresh_token_hash,
    generate_verification_code,
    generate_reset_token,
)
from app.db.mongodb import get_database
from app.models.user import (
    UserRole,
    UserSignupRequest,
    UserVerifyEmailRequest,
    UserLoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    UserResponse,
    UserInDB,
)

logger = logging.getLogger("app.auth")
router = APIRouter(prefix="/api/auth", tags=["auth"])

# In-memory store for recent dev tokens to enable dev previewing and automated tests
dev_tokens_store: Dict[str, Dict[str, Any]] = {}

def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Sets short-lived access and long-lived refresh tokens in httpOnly cookies."""
    cookie_kwargs: Dict[str, Any] = {
        "httponly": True,
        "secure": settings.is_cookie_secure,
        "samesite": settings.COOKIE_SAMESITE,
        "path": "/",
    }
    if settings.COOKIE_DOMAIN:
        cookie_kwargs["domain"] = settings.COOKIE_DOMAIN

    # Access token (15 mins)
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **cookie_kwargs
    )
    # Refresh token (7 days)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        **cookie_kwargs
    )

def clear_auth_cookies(response: Response) -> None:
    """Deletes access and refresh token cookies."""
    cookie_kwargs: Dict[str, Any] = {
        "path": "/",
        "samesite": settings.COOKIE_SAMESITE,
    }
    if settings.COOKIE_DOMAIN:
        cookie_kwargs["domain"] = settings.COOKIE_DOMAIN
        
    response.delete_cookie(key="access_token", **cookie_kwargs)
    response.delete_cookie(key="refresh_token", **cookie_kwargs)

async def get_current_user_optional(request: Request) -> Optional[UserInDB]:
    """Extracts and verifies the current user from the access_token cookie without raising 401."""
    access_token = request.cookies.get("access_token")
    if not access_token:
        return None
    
    payload = decode_token(access_token, expected_type="access")
    if not payload:
        return None
    
    user_id = payload.get("sub")
    if not user_id:
        return None
    
    db = get_database()
    try:
        user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user_doc:
            return None
        return UserInDB(
            id=str(user_doc["_id"]),
            name=user_doc["name"],
            email=user_doc["email"],
            password_hash=user_doc["password_hash"],
            avatar_url=user_doc.get("avatar_url"),
            role=UserRole(user_doc.get("role", "user")),
            is_verified=user_doc.get("is_verified", False),
            verification_token=user_doc.get("verification_token"),
            reset_token=user_doc.get("reset_token"),
            reset_token_expires_at=user_doc.get("reset_token_expires_at"),
            refresh_token_hash=user_doc.get("refresh_token_hash"),
            created_at=user_doc.get("created_at", datetime.utcnow())
        )
    except Exception:
        return None

async def get_current_user(request: Request) -> UserInDB:
    """Dependency that requires an authenticated user via httpOnly access_token cookie."""
    user = await get_current_user_optional(request)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

async def require_admin(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """Dependency that enforces admin role on protected routes."""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required.",
        )
    return current_user

@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(body: UserSignupRequest):
    """Signs up a new user with simulated email verification."""
    db = get_database()
    normalized_email = body.email.lower().strip()
    
    existing_user = await db.users.find_one({"email": normalized_email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )
    
    otp = generate_verification_code()
    password_hash = get_password_hash(body.password)
    
    user_doc = {
        "name": body.name.strip(),
        "email": normalized_email,
        "password_hash": password_hash,
        "avatar_url": f"https://api.dicebear.com/7.x/initials/svg?seed={body.name.strip()}",
        "role": "user",
        "is_verified": False,
        "verification_token": otp,
        "refresh_token_hash": None,
        "created_at": datetime.utcnow(),
    }
    
    result = await db.users.insert_one(user_doc)
    
    # Store token in dev store & log to console
    dev_tokens_store[normalized_email] = {
        "type": "verification",
        "token": otp,
        "email": normalized_email,
        "timestamp": datetime.utcnow().isoformat()
    }
    logger.info(f"============================================================")
    logger.info(f"[SIMULATED EMAIL] Verification OTP for {normalized_email}: {otp}")
    logger.info(f"============================================================")
    print(f"\n>>> [SIMULATED EMAIL] Verification OTP for {normalized_email}: {otp} <<<\n", flush=True)

    return {
        "message": "Signup successful. Please verify your email with the OTP code.",
        "email": normalized_email,
        "is_verified": False
    }

@router.post("/verify-email")
async def verify_email(body: UserVerifyEmailRequest):
    """Verifies a user's email using the simulated OTP code."""
    db = get_database()
    normalized_email = body.email.lower().strip()
    
    user = await db.users.find_one({"email": normalized_email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    
    if user.get("is_verified", False):
        return {"message": "Email is already verified. You can now log in."}
    
    if user.get("verification_token") != body.token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please check and try again.",
        )
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"is_verified": True, "verification_token": None}}
    )
    
    if normalized_email in dev_tokens_store:
        dev_tokens_store.pop(normalized_email, None)

    return {"message": "Email verified successfully. You may now log in."}

@router.post("/login")
async def login(body: UserLoginRequest, response: Response):
    """Authenticates user and sets access and refresh token httpOnly cookies."""
    db = get_database()
    normalized_email = body.email.lower().strip()
    
    user = await db.users.find_one({"email": normalized_email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    
    if not user.get("is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in.",
        )
    
    user_id = str(user["_id"])
    role = user.get("role", "user")
    
    access_token = create_access_token(user_id=user_id, role=role)
    refresh_token = create_refresh_token(user_id=user_id)
    
    # Store hashed refresh token on user for invalidation / rotation
    refresh_hash = hash_refresh_token(refresh_token)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"refresh_token_hash": refresh_hash}}
    )
    
    set_auth_cookies(response, access_token, refresh_token)
    
    return {
        "message": "Login successful.",
        "user": {
            "id": user_id,
            "name": user["name"],
            "email": user["email"],
            "role": role,
            "avatar_url": user.get("avatar_url"),
            "is_verified": user.get("is_verified", False)
        }
    }

@router.post("/refresh")
async def refresh_tokens(request: Request, response: Response):
    """Rotates refresh token: invalidates old token hash and issues fresh token pair."""
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing.",
        )
    
    payload = decode_token(refresh_token, expected_type="refresh")
    if not payload:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token.",
        )
    
    user_id = payload.get("sub")
    if not user_id:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
        )
    
    db = get_database()
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = None

    if not user:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists.",
        )
    
    # Verify the incoming refresh token matches the hash stored in database
    stored_hash = user.get("refresh_token_hash")
    if not verify_refresh_token_hash(refresh_token, stored_hash):
        # Possible token reuse/replay attack - revoke stored hash
        await db.users.update_one({"_id": user["_id"]}, {"$set": {"refresh_token_hash": None}})
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token rotation failed. Session revoked.",
        )
    
    # Issue new token pair (ROTATION)
    role = user.get("role", "user")
    new_access_token = create_access_token(user_id=user_id, role=role)
    new_refresh_token = create_refresh_token(user_id=user_id)
    new_refresh_hash = hash_refresh_token(new_refresh_token)
    
    # Invalidate old refresh token by saving the new hash
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"refresh_token_hash": new_refresh_hash}}
    )
    
    set_auth_cookies(response, new_access_token, new_refresh_token)
    return {"message": "Tokens refreshed successfully."}

@router.post("/logout")
async def logout(request: Request, response: Response):
    """Logs out user, revoking server-side refresh token hash and clearing cookies."""
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        payload = decode_token(refresh_token, expected_type="refresh")
        if payload and payload.get("sub"):
            try:
                db = get_database()
                await db.users.update_one(
                    {"_id": ObjectId(payload["sub"])},
                    {"$set": {"refresh_token_hash": None}}
                )
            except Exception:
                pass
    
    clear_auth_cookies(response)
    return {"message": "Logged out successfully."}

@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest):
    """Generates a single-use time-limited password reset token (simulated email)."""
    db = get_database()
    normalized_email = body.email.lower().strip()
    
    user = await db.users.find_one({"email": normalized_email})
    if not user:
        # Prevent email enumeration: return success message even if email is not found
        return {"message": "If an account with that email exists, password reset instructions have been sent."}
    
    token = generate_reset_token()
    expires_at = datetime.utcnow() + timedelta(hours=1)
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"reset_token": token, "reset_token_expires_at": expires_at}}
    )
    
    dev_tokens_store[normalized_email] = {
        "type": "reset",
        "token": token,
        "email": normalized_email,
        "expires_at": expires_at.isoformat()
    }
    
    logger.info(f"============================================================")
    logger.info(f"[SIMULATED EMAIL] Password reset token for {normalized_email}: {token}")
    logger.info(f"============================================================")
    print(f"\n>>> [SIMULATED EMAIL] Password reset token for {normalized_email}: {token} <<<\n", flush=True)

    return {"message": "If an account with that email exists, password reset instructions have been sent."}

@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, response: Response):
    """Resets password using a single-use token and invalidates active refresh tokens."""
    db = get_database()
    normalized_email = body.email.lower().strip()
    
    user = await db.users.find_one({"email": normalized_email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )
    
    stored_token = user.get("reset_token")
    expires_at = user.get("reset_token_expires_at")
    
    if not stored_token or stored_token != body.token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )
    
    if not expires_at or datetime.utcnow() > expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reset token has expired. Please request a new one.",
        )
    
    new_hash = get_password_hash(body.new_password)
    
    # Invalidate reset token and revoke all sessions
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password_hash": new_hash,
                "reset_token": None,
                "reset_token_expires_at": None,
                "refresh_token_hash": None,
            }
        }
    )
    
    if normalized_email in dev_tokens_store:
        dev_tokens_store.pop(normalized_email, None)
        
    clear_auth_cookies(response)
    return {"message": "Password reset successfully. You can now log in with your new password."}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserInDB = Depends(get_current_user)):
    """Returns profile of currently logged-in user."""
    return UserResponse(
        id=current_user.id or "",
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        avatar_url=current_user.avatar_url,
        is_verified=current_user.is_verified,
        created_at=current_user.created_at,
    )

@router.get("/dev-tokens")
async def get_dev_tokens(email: Optional[str] = None):
    """Dev-only endpoint to retrieve simulated OTP or reset tokens for automated testing."""
    if not settings.ENABLE_DEV_TOKENS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found.")
    
    if email:
        token_info = dev_tokens_store.get(email.lower().strip())
        if not token_info:
            return {"token": None, "message": "No active token found for this email."}
        return token_info
    
    return dev_tokens_store
