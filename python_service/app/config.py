"""
Configuration module for the FastAPI data processing service.
Loads environment variables and provides configuration settings.
"""

from pydantic_settings import BaseSettings
from typing import List
import os
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # MongoDB Configuration
    mongodb_uri: str = "mongodb://localhost:27017/ai_consultant"
    
    # Service Configuration
    port: int = 8001
    debug: bool = True
    
    # Node.js Backend URL
    node_backend_url: str = "http://localhost:5000"
    
    # CORS Configuration
    cors_origins: str = "http://localhost:5173,http://localhost:5000,http://localhost:8001"
    
    # OpenRouter AI Configuration
    openrouter_api_key: str = ""
    openrouter_model: str = "google/gemini-2.0-flash-001"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Uses lru_cache to ensure settings are only loaded once.
    """
    return Settings()


# Export settings instance for convenience
settings = get_settings()
