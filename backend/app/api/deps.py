from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from app.core.security import security_bearer, AuthError
from app.schemas.auth import UserProfileResponse, UserRole
from app.services.supabase_auth import supabase_auth_service, SupabaseAuthService


def get_auth_service() -> SupabaseAuthService:
    """Dependency provider for SupabaseAuthService, allowing mock override in tests."""
    return supabase_auth_service


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    auth_service: SupabaseAuthService = Depends(get_auth_service)
) -> UserProfileResponse:
    """
    Extracts Bearer token from Authorization header, validates token with Supabase Auth,
    and returns the verified user's authoritative database profile and role.
    """
    if credentials is None or not credentials.credentials:
        raise AuthError("Authentication credentials were not provided.", status.HTTP_401_UNAUTHORIZED)

    token = credentials.credentials
    user_payload = await auth_service.verify_token_and_get_user(token)

    user_id = user_payload.get("id")
    email = user_payload.get("email") or ""

    profile = await auth_service.get_authoritative_profile(user_id, email)
    return profile


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    auth_service: SupabaseAuthService = Depends(get_auth_service)
) -> Optional[UserProfileResponse]:
    """
    Extracts Bearer token if present; returns None if not provided or invalid.
    Allows endpoints like job browsing to work for unauthenticated visitors or students.
    """
    if credentials is None or not credentials.credentials:
        return None
    try:
        token = credentials.credentials
        user_payload = await auth_service.verify_token_and_get_user(token)
        user_id = user_payload.get("id")
        email = user_payload.get("email") or ""
        return await auth_service.get_authoritative_profile(user_id, email)
    except Exception:
        return None


def require_role(allowed_roles: List[UserRole]):
    """
    Role-based access control dependency factory.
    Enforces that the authenticated user possesses an authorized role.
    """
    async def role_checker(current_user: UserProfileResponse = Depends(get_current_user)) -> UserProfileResponse:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: this endpoint requires one of the following roles: {', '.join(allowed_roles)}."
            )
        return current_user

    return role_checker


# Convenient role dependencies
require_student = require_role(["student", "admin"])
require_recruiter = require_role(["recruiter", "admin"])
require_admin = require_role(["admin"])
