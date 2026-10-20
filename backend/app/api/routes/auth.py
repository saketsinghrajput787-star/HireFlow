import time
from collections import defaultdict
from typing import Dict, List
from fastapi import APIRouter, Depends, Request, HTTPException, status
from app.api.deps import get_current_user, require_recruiter, require_student, get_auth_service
from app.core.config import settings
from app.schemas.auth import UserProfileResponse, DemoRecruiterLoginResponse
from app.services.supabase_auth import SupabaseAuthService

router = APIRouter(prefix="/api", tags=["Authentication & Profile"])

# In-memory sliding window rate limiter for demo login requests per IP
_demo_login_attempts: Dict[str, List[float]] = defaultdict(list)


def check_demo_login_rate_limit(client_ip: str, limit: int = 15, window_seconds: int = 60) -> None:
    now = time.time()
    cutoff = now - window_seconds
    _demo_login_attempts[client_ip] = [t for t in _demo_login_attempts[client_ip] if t > cutoff]
    if len(_demo_login_attempts[client_ip]) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many demo login attempts. Please wait a moment before trying again."
        )
    _demo_login_attempts[client_ip].append(now)


@router.post(
    "/auth/demo-recruiter-login",
    response_model=DemoRecruiterLoginResponse,
    summary="One-Click Evaluator Demo Recruiter Login",
    description="Authenticates the evaluator into the pre-provisioned demo recruiter workspace using server-side credentials and rate limiting."
)
async def demo_recruiter_login(
    request: Request,
    auth_service: SupabaseAuthService = Depends(get_auth_service)
) -> DemoRecruiterLoginResponse:
    """
    Evaluator demo recruiter login endpoint.
    - Strictly authenticates the designated demo recruiter account (never arbitrary accounts).
    - Rate limited to prevent abuse.
    - Validates that the returned account possesses the authoritative 'recruiter' role.
    """
    client_ip = request.client.host if request.client else "unknown"
    check_demo_login_rate_limit(client_ip, limit=settings.DEMO_LOGIN_RATE_LIMIT_PER_MINUTE)
    return await auth_service.authenticate_demo_recruiter()



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


@router.get(
    "/student-check",
    response_model=UserProfileResponse,
    summary="Verify Student Authorization",
    description="Requires an authorized student or admin role; returns 403 Forbidden for recruiters."
)
async def check_student_access(
    current_user: UserProfileResponse = Depends(require_student)
) -> UserProfileResponse:
    """
    Protected route used to verify student authorization on the backend.
    """
    return current_user

