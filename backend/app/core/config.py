import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """
    HireFlow Backend Application Settings.
    Reads values from environment variables or .env file.
    """
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "HireFlow ATS Backend"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="development", description="Environment: development, test, production")

    # Supabase Settings
    SUPABASE_URL: str = Field(default="https://placeholder.supabase.co", description="Supabase project URL")
    SUPABASE_PUBLISHABLE_KEY: str = Field(default="placeholder-publishable-key", description="Supabase anon/publishable key")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="placeholder-service-key", description="Supabase service role secret key (backend only)")

    # CORS configuration: comma-separated list of allowed origins
    CORS_ORIGINS: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:3000,http://127.0.0.1:3000",
        description="Allowed CORS origins"
    )

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip().rstrip('/') for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_configured(self) -> bool:
        """Checks if real Supabase credentials have been configured."""
        return (
            bool(self.SUPABASE_URL) and
            "placeholder" not in self.SUPABASE_URL and
            bool(self.SUPABASE_PUBLISHABLE_KEY) and
            "placeholder" not in self.SUPABASE_PUBLISHABLE_KEY
        )


settings = Settings()
