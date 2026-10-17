from fastapi import APIRouter, Depends
from app.api.deps import get_current_user, require_recruiter
from app.schemas.auth import UserProfileResponse

router = APIRouter(prefix="/api", tags=["Authentication & Profile"])


@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Get Authenticated User Profile",
    description="Validates the Supabase access token and returns authoritative profile and role from the database."
)
async def get_my_profile(
    current_user: UserProfileResponse = Depends(get_current_user)
) -> UserProfileResponse:
    """
    Returns verified user profile and authoritative role.
    """
    return current_user


@router.get(
    "/recruiter-check",
    response_model=UserProfileResponse,
    summary="Verify Recruiter Authorization",
    description="Requires an authorized recruiter or admin role; returns 403 Forbidden for students."
)
async def check_recruiter_access(
    current_user: UserProfileResponse = Depends(require_recruiter)
) -> UserProfileResponse:
    """
    Protected route used to verify recruiter authorization on the backend.
    """
    return current_user
