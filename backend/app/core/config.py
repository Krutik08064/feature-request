from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
import os

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    
    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "combot_db"
    
    # JWT & Auth
    JWT_SECRET_KEY: str = "combot_development_secret_key_change_in_production_32chars!"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Cookies
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"  # 'lax', 'strict', or 'none' (required for cross-domain)
    COOKIE_DOMAIN: Optional[str] = None
    
    # Dev tokens
    ENABLE_DEV_TOKENS: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return ["http://localhost:5173"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_cookie_secure(self) -> bool:
        if self.ENVIRONMENT == "production":
            return True
        return self.COOKIE_SECURE

settings = Settings()
