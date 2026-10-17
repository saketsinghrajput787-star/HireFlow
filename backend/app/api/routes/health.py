from fastapi import APIRouter
from app.schemas.health import HealthResponse
from app.core.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, summary="Service Health Check")
async def health_check():
    """
    Returns application health status and metadata without exposing sensitive credentials.
    """
    return HealthResponse(
        status="ok",
        service="hireflow-backend",
        version=settings.APP_VERSION,
        database_configured=settings.is_configured
    )
