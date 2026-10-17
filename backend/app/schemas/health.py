from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="ok", description="Health status")
    service: str = Field(default="hireflow-backend", description="Service name")
    version: str = Field(default="1.0.0", description="Application version")
    database_configured: bool = Field(default=False, description="Whether Supabase credentials are configured")
