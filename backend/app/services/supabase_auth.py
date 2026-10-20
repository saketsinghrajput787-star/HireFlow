from typing import Optional, Dict, Any
import urllib.parse
import httpx
from fastapi import status
from app.core.config import settings
from app.core.security import logger, AuthError
from app.schemas.auth import UserProfileResponse, UserRole, DemoRecruiterLoginResponse


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

    async def authenticate_demo_recruiter(self) -> DemoRecruiterLoginResponse:
        """
        Securely provisions and authenticates the evaluator demo recruiter session.
        Uses server-side configured credentials or admin link generation, verifies that the
        user exists and possesses the authoritative 'recruiter' role, and returns an authenticated session.
        """
        if not settings.DEMO_LOGIN_ENABLED:
            raise AuthError("Demo recruiter login is currently disabled.", status.HTTP_403_FORBIDDEN)

        if not settings.is_configured:
            raise AuthError("Authentication service is currently unconfigured.", status.HTTP_503_SERVICE_UNAVAILABLE)

        demo_email = settings.DEMO_RECRUITER_EMAIL
        demo_password = settings.DEMO_RECRUITER_PASSWORD

        client = await self._get_client()
        access_token: Optional[str] = None
        refresh_token: Optional[str] = None
        user_data: Optional[Dict[str, Any]] = None
        expires_in: int = 3600

        # Method 1: Password authentication if demo password is configured
        if demo_password:
            token_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/token?grant_type=password"
            headers = {
                "apikey": settings.SUPABASE_PUBLISHABLE_KEY,
                "Content-Type": "application/json",
            }
            try:
                resp = await client.post(
                    token_url,
                    headers=headers,
                    json={"email": demo_email, "password": demo_password}
                )
                if resp.status_code == 200:
                    payload = resp.json()
                    access_token = payload.get("access_token")
                    refresh_token = payload.get("refresh_token")
                    expires_in = payload.get("expires_in", 3600)
                    user_data = payload.get("user")
            except Exception as e:
                logger.warning("Demo password login attempt error: %s", str(e))

        # Method 2: Fallback to Supabase Admin link generation if password login did not succeed
        if not access_token or not refresh_token:
            admin_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/admin/generate_link"
            service_key = settings.SUPABASE_SERVICE_ROLE_KEY
            admin_headers = {
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
                "Content-Type": "application/json",
            }
            try:
                resp = await client.post(
                    admin_url,
                    headers=admin_headers,
                    json={"type": "magiclink", "email": demo_email}
                )
                if resp.status_code == 200:
                    link_data = resp.json()
                    action_link = link_data.get("action_link")
                    if action_link:
                        link_resp = await client.get(action_link, follow_redirects=False)
                        loc = link_resp.headers.get("location", "")
                        parsed = urllib.parse.urlparse(loc)
                        fragment = urllib.parse.parse_qs(parsed.fragment)
                        if fragment.get("access_token") and fragment.get("refresh_token"):
                            access_token = fragment["access_token"][0]
                            refresh_token = fragment["refresh_token"][0]
                            if fragment.get("expires_in"):
                                try:
                                    expires_in = int(fragment["expires_in"][0])
                                except ValueError:
                                    expires_in = 3600
            except Exception as e:
                logger.error("Demo admin link generation failed: %s", str(e))

        if not access_token or not refresh_token:
            raise AuthError(
                "Unable to establish demo recruiter session. Please verify server configuration.",
                status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # 3. Verify access token and resolve user profile
        if not user_data:
            user_data = await self.verify_token_and_get_user(access_token)

        user_id = user_data.get("id")
        user_email = user_data.get("email") or demo_email

        # 4. Strictly verify authoritative database role
        profile = await self.get_authoritative_profile(user_id, user_email)

        # 5. DEFENSE-IN-DEPTH: Reject if account is not a recruiter
        if profile.role != "recruiter":
            logger.error("Security violation: Demo account %s has unauthorized role %s", demo_email, profile.role)
            raise AuthError(
                f"Security violation: Configured demo account does not possess the recruiter role (role: {profile.role}).",
                status.HTTP_403_FORBIDDEN
            )

        return DemoRecruiterLoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=expires_in,
            user=user_data,
            profile=profile
        )


# Default singleton instance
supabase_auth_service = SupabaseAuthService()
