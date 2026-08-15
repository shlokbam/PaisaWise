import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "PaisaWise"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "postgresql://localhost/paisawise"
    
    # Security
    SECRET_KEY: str = "supersecretkeyforpaisawisedevelopment"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week for development ease
    
    # AI Config
    AI_PROVIDER: str = "groq"  # groq or mistral
    AI_MODEL: str = "mixtral-8x7b-32768"  # default groq model, or configurable
    GROQ_API_KEY: Optional[str] = None
    MISTRAL_API_KEY: Optional[str] = None
    
    # Confidence Thresholds
    CONFIDENCE_AUTO_APPROVE: float = 0.90
    CONFIDENCE_LOW_FRICTION: float = 0.70

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
