import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_auth_service
from app.services.supabase_auth import SupabaseAuthService
from app.schemas.auth import UserProfileResponse, DemoRecruiterLoginResponse
from app.core.config import settings
from app.core.security import AuthError

client = TestClient(app)


class MockAuthService(SupabaseAuthService):
    """
    Mock authentication service simulating Supabase Auth API
    and database role resolution for isolated deterministic unit tests.
    """

    def __init__(self, mock_role: str = "student", fail_verification: bool = False, missing_profile: bool = False):
        super().__init__()
        self.mock_role = mock_role
        self.fail_verification = fail_verification
        self.missing_profile = missing_profile

    async def verify_token_and_get_user(self, token: str):
        if self.fail_verification or token == "invalid-token" or token == "expired-token":
            raise AuthError("Invalid or expired authentication token.", 401)
        return {
            "id": "11111111-2222-3333-4444-555555555555",
            "email": "testuser@example.com"
        }

    async def get_authoritative_profile(self, user_id: str, email: str) -> UserProfileResponse:
        if self.missing_profile:
            raise AuthError("User profile record not found in database. Please contact the administrator to initialize your profile.", 404)
        return UserProfileResponse(
            id=user_id,
            email=email,
            full_name="Test User",
            role=self.mock_role,
            created_at="2026-10-17T00:00:00Z"
        )

    async def authenticate_demo_recruiter(self) -> DemoRecruiterLoginResponse:
        if not settings.DEMO_LOGIN_ENABLED:
            raise AuthError("Demo recruiter login is currently disabled.", 403)
        if self.mock_role != "recruiter":
            raise AuthError(f"Security violation: Configured demo account does not possess the recruiter role (role: {self.mock_role}).", 403)
        return DemoRecruiterLoginResponse(
            access_token="mock-demo-recruiter-access-jwt",
            refresh_token="mock-demo-recruiter-refresh-jwt",
            token_type="bearer",
            expires_in=3600,
            user={"id": "d1d8b2c7-c192-4224-a0b5-fb40dd9fde94", "email": "saket77@gmail.com"},
            profile=UserProfileResponse(
                id="d1d8b2c7-c192-4224-a0b5-fb40dd9fde94",
                email="saket77@gmail.com",
                full_name="Saket Recruiter",
                role="recruiter",
                created_at="2026-10-18T00:00:00Z"
            )
        )



def test_api_me_missing_token():
    """
    GET /api/me without an Authorization header must be rejected with 401 Unauthorized.
    """
    response = client.get("/api/me")
    assert response.status_code == 401
    assert "detail" in response.json()


def test_api_me_invalid_token():
    """
    GET /api/me with an invalid token must be rejected with 401 Unauthorized.
    """
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(fail_verification=True)
    try:
        response = client.get("/api/me", headers={"Authorization": "Bearer invalid-token"})
        assert response.status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_api_me_student_success():
    """
    GET /api/me with a valid student token resolves authoritative role 'student'.
    """
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(mock_role="student")
    try:
        response = client.get("/api/me", headers={"Authorization": "Bearer valid-student-token"})
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "testuser@example.com"
        assert data["role"] == "student"
        assert data["full_name"] == "Test User"
    finally:
        app.dependency_overrides.clear()


def test_api_me_recruiter_success():
    """
    GET /api/me with a valid recruiter token resolves authoritative role 'recruiter'.
    """
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(mock_role="recruiter")
    try:
        response = client.get("/api/me", headers={"Authorization": "Bearer valid-recruiter-token"})
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "recruiter"
    finally:
        app.dependency_overrides.clear()


def test_recruiter_check_rejected_for_student():
    """
    A student attempting to access recruiter-protected endpoints must receive 403 Forbidden.
    Frontend guards are not trusted as the security boundary.
    """
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(mock_role="student")
    try:
        response = client.get("/api/recruiter-check", headers={"Authorization": "Bearer student-token"})
        assert response.status_code == 403
        data = response.json()
        assert "Access denied" in data["detail"]
    finally:
        app.dependency_overrides.clear()


def test_recruiter_check_allowed_for_recruiter():
    """
    An authorized recruiter accessing recruiter-protected endpoints receives 200 OK.
    """
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(mock_role="recruiter")
    try:
        response = client.get("/api/recruiter-check", headers={"Authorization": "Bearer recruiter-token"})
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "recruiter"
    finally:
        app.dependency_overrides.clear()


def test_api_me_missing_profile():
    """
    An authenticated user whose profile record is missing from public.profiles receives 404 Not Found.
    This ensures missing profiles are handled explicitly rather than treated as invalid credentials.
    """
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(missing_profile=True)
    try:
        response = client.get("/api/me", headers={"Authorization": "Bearer valid-token"})
        assert response.status_code == 404
        data = response.json()
        assert "profile record not found" in data["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_recruiter_check_missing_profile():
    """
    A user whose profile record is missing attempting recruiter verification receives 404 Not Found.
    """
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(missing_profile=True)
    try:
        response = client.get("/api/recruiter-check", headers={"Authorization": "Bearer valid-token"})
        assert response.status_code == 404
        data = response.json()
        assert "profile record not found" in data["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_recruiter_check_unauthenticated():
    """
    An unauthenticated request to /api/recruiter-check must be rejected with 401 Unauthorized.
    """
    response = client.get("/api/recruiter-check")
    assert response.status_code == 401
    assert "detail" in response.json()


def test_expired_token_handling():
    """
    An expired access token must be rejected with 401 Unauthorized and clear token expiry message.
    """
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(fail_verification=True)
    try:
        response = client.get("/api/me", headers={"Authorization": "Bearer expired-token"})
        assert response.status_code == 401
        data = response.json()
        assert "expired" in data["detail"].lower() or "invalid" in data["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_student_check_allowed_for_student():
    """
    A student accessing student-check endpoint receives 200 OK.
    """
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(mock_role="student")
    try:
        response = client.get("/api/student-check", headers={"Authorization": "Bearer student-token"})
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "student"
    finally:
        app.dependency_overrides.clear()


def test_student_check_rejected_for_recruiter():
    """
    A recruiter accessing student-check endpoint receives 403 Forbidden.
    """
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(mock_role="recruiter")
    try:
        response = client.get("/api/student-check", headers={"Authorization": "Bearer recruiter-token"})
        assert response.status_code == 403
        data = response.json()
        assert "Access denied" in data["detail"]
    finally:
        app.dependency_overrides.clear()


def test_student_check_unauthenticated():
    """
    An unauthenticated request to /api/student-check must be rejected with 401 Unauthorized.
    """
    response = client.get("/api/student-check")
    assert response.status_code == 401
    assert "detail" in response.json()


def test_admin_allowed_for_both_checks():
    """
    An admin user is authorized for both recruiter-check and student-check endpoints.
    """
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(mock_role="admin")
    try:
        rec_res = client.get("/api/recruiter-check", headers={"Authorization": "Bearer admin-token"})
        assert rec_res.status_code == 200
        assert rec_res.json()["role"] == "admin"

        stu_res = client.get("/api/student-check", headers={"Authorization": "Bearer admin-token"})
        assert stu_res.status_code == 200
        assert stu_res.json()["role"] == "admin"
    finally:
        app.dependency_overrides.clear()


def test_recruiter_endpoints_rejected_for_student():
    """
    Endpoints under /api/recruiter/* must strictly reject users with student role with 403 Forbidden.
    """
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(mock_role="student")
    try:
        response = client.get("/api/recruiter/jobs", headers={"Authorization": "Bearer student-token"})
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_student_endpoints_rejected_for_recruiter():
    """
    Endpoints under /api/student/* must strictly reject users with recruiter role with 403 Forbidden.
    """
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(mock_role="recruiter")
    try:
        response = client.get("/api/student/profile", headers={"Authorization": "Bearer recruiter-token"})
        assert response.status_code == 403
        assert "Access denied" in response.json()["detail"]

        response_stats = client.get("/api/student/dashboard-stats", headers={"Authorization": "Bearer recruiter-token"})
        assert response_stats.status_code == 403

        response_apps = client.get("/api/student/applications", headers={"Authorization": "Bearer recruiter-token"})
        assert response_apps.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_recruiter_endpoints_rejected_for_student():
    """
    Endpoints under /api/recruiter/* must strictly reject users with student role with 403 Forbidden.
    """
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(mock_role="student")
    try:
        response_jobs = client.get("/api/recruiter/jobs", headers={"Authorization": "Bearer student-token"})
        assert response_jobs.status_code == 403
        assert "Access denied" in response_jobs.json()["detail"]

        response_stats = client.get("/api/recruiter/dashboard", headers={"Authorization": "Bearer student-token"})
        assert response_stats.status_code == 403

        response_applicants = client.get("/api/recruiter/applications", headers={"Authorization": "Bearer student-token"})
        assert response_applicants.status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_demo_recruiter_login_success():
    """
    POST /api/auth/demo-recruiter-login returns 200 OK with session tokens
    and verified recruiter profile.
    """
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(mock_role="recruiter")
    try:
        response = client.post("/api/auth/demo-recruiter-login")
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["profile"]["role"] == "recruiter"
        assert data["profile"]["email"] == "saket77@gmail.com"
        assert data["user"]["id"] == "d1d8b2c7-c192-4224-a0b5-fb40dd9fde94"
    finally:
        app.dependency_overrides.clear()


def test_demo_recruiter_login_rejected_for_non_recruiter_role():
    """
    POST /api/auth/demo-recruiter-login strictly rejects any account
    whose authoritative role is not 'recruiter' with 403 Forbidden.
    """
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(mock_role="student")
    try:
        response = client.post("/api/auth/demo-recruiter-login")
        assert response.status_code == 403
        data = response.json()
        assert "Security violation" in data["detail"] or "Access denied" in data["detail"]
    finally:
        app.dependency_overrides.clear()


def test_demo_recruiter_login_rate_limiting():
    """
    POST /api/auth/demo-recruiter-login triggers HTTP 429 Too Many Requests
    when rate limit threshold is exceeded within the sliding window.
    """
    from app.api.routes.auth import _demo_login_attempts
    _demo_login_attempts.clear()

    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(mock_role="recruiter")
    try:
        limit = settings.DEMO_LOGIN_RATE_LIMIT_PER_MINUTE
        # Exhaust the limit
        for _ in range(limit):
            resp = client.post("/api/auth/demo-recruiter-login")
            assert resp.status_code == 200

        # Next call exceeds rate limit
        blocked_resp = client.post("/api/auth/demo-recruiter-login")
        assert blocked_resp.status_code == 429
        assert "Too many demo login attempts" in blocked_resp.json()["detail"]
    finally:
        _demo_login_attempts.clear()
        app.dependency_overrides.clear()


def test_demo_recruiter_login_disabled():
    """
    POST /api/auth/demo-recruiter-login returns 403 Forbidden when DEMO_LOGIN_ENABLED is False.
    """
    original_enabled = settings.DEMO_LOGIN_ENABLED
    try:
        settings.DEMO_LOGIN_ENABLED = False
        app.dependency_overrides[get_auth_service] = lambda: MockAuthService(mock_role="recruiter")
        response = client.post("/api/auth/demo-recruiter-login")
        assert response.status_code == 403
        assert "disabled" in response.json()["detail"]
    finally:
        settings.DEMO_LOGIN_ENABLED = original_enabled
        app.dependency_overrides.clear()





