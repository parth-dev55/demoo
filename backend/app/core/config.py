import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    PROJECT_NAME: str = "AgriGPT API"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")

    # Supabase credentials
    SUPABASE_URL: str = Field(default="", env="SUPABASE_URL")
    SUPABASE_KEY: str = Field(default="", env="SUPABASE_KEY")
    SUPABASE_STORAGE_BUCKET: str = Field(default="disease-scans", env="SUPABASE_STORAGE_BUCKET")

    # External APIs
    GEMINI_API_KEY: str = Field(default="", env="GEMINI_API_KEY")
    WEATHER_API_KEY: str = Field(default="", env="WEATHER_API_KEY")

    # CORS settings
    FRONTEND_URL: str = Field(default="http://localhost:5173", env="FRONTEND_URL")
    PORT: int = Field(default=8000, env="PORT")

    @property
    def cors_origins(self) -> List[str]:
        origins = [
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ]
        if self.FRONTEND_URL and self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL)
        return origins

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
