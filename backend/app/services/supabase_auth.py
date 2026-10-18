from typing import Optional, Dict, Any
import httpx
from fastapi import status
from app.core.config import settings
from app.core.security import logger, AuthError
from app.schemas.auth import UserProfileResponse, UserRole


class SupabaseAuthService:
    """
    Service responsible for secure token verification and authoritative
    role retrieval from Supabase.
    """

    def __init__(self, client: Optional[httpx.AsyncClient] = None):
        self._client = client

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=10.0)

    async def verify_token_and_get_user(self, token: str) -> Dict[str, Any]:
        """
        Securely verifies the Supabase access token against Supabase Auth API.
        Never merely decodes a JWT without cryptographic verification.
        """
        if not token or not token.strip():
            raise AuthError("Authentication token is missing.", status.HTTP_401_UNAUTHORIZED)

        if not settings.is_configured:
            logger.warning("Supabase credentials not fully configured; rejecting token verification.")
            raise AuthError("Authentication service is currently unconfigured.", status.HTTP_503_SERVICE_UNAVAILABLE)

        auth_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user"
        headers = {
            "Authorization": f"Bearer {token}",
            "apikey": settings.SUPABASE_PUBLISHABLE_KEY,
        }

        try:
            client = await self._get_client()
            response = await client.get(auth_url, headers=headers)

            if response.status_code != 200:
                logger.warning("Supabase token verification failed with status: %d", response.status_code)
                raise AuthError("Invalid or expired authentication token.", status.HTTP_401_UNAUTHORIZED)

            user_data = response.json()
            if not user_data or "id" not in user_data:
                raise AuthError("Invalid user payload returned by authentication provider.", status.HTTP_401_UNAUTHORIZED)

            return user_data

        except httpx.RequestError as exc:
            logger.error("Network error while connecting to Supabase Auth: %s", str(exc))
            raise AuthError("Unable to reach authentication service. Please try again later.", status.HTTP_503_SERVICE_UNAVAILABLE)

    async def get_authoritative_profile(self, user_id: str, email: str) -> UserProfileResponse:
        """
        Retrieves the user's authoritative role and profile from public.profiles table
        using the backend service key to guarantee tamper-proof role resolution.
        """
        rest_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/profiles"
        params = {
            "id": f"eq.{user_id}",
            "select": "id,full_name,role,created_at"
        }

        # Prefer SERVICE_ROLE_KEY to reliably read authoritative profile; fallback to PUBLISHABLE_KEY if unconfigured
        service_key = settings.SUPABASE_SERVICE_ROLE_KEY if "placeholder" not in settings.SUPABASE_SERVICE_ROLE_KEY else settings.SUPABASE_PUBLISHABLE_KEY

        headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json"
        }

        try:
            client = await self._get_client()
            response = await client.get(rest_url, params=params, headers=headers)

            if response.status_code == 200:
                rows = response.json()
                if rows and len(rows) > 0:
                    profile_data = rows[0]
                    role_val: UserRole = profile_data.get("role", "student")
                    if role_val not in ("student", "recruiter", "admin"):
                        role_val = "student"

                    return UserProfileResponse(
                        id=profile_data["id"],
                        email=email,
                        full_name=profile_data.get("full_name") or email.split("@")[0],
                        role=role_val,
                        created_at=profile_data.get("created_at")
                    )
                else:
                    logger.error("No profile record found in public.profiles for authenticated user %s", user_id)
                    raise AuthError(
                        "User profile record not found in database. Please contact the administrator to initialize your profile.",
                        status.HTTP_404_NOT_FOUND
                    )
            elif response.status_code == 404:
                raise AuthError(
                    "User profile record not found in database. Please contact the administrator.",
                    status.HTTP_404_NOT_FOUND
                )
            else:
                logger.error("Failed to query profile: status=%d text=%s", response.status_code, response.text)
                raise AuthError(
                    "Database error while retrieving user profile.",
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except httpx.RequestError as exc:
            logger.error("Error querying authoritative profile for user %s: %s", user_id, str(exc))
            raise AuthError(
                "Unable to reach database service to retrieve user profile.",
                status.HTTP_503_SERVICE_UNAVAILABLE
            )


# Default singleton instance
supabase_auth_service = SupabaseAuthService()
