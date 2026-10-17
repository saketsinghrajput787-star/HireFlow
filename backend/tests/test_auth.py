import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_auth_service
from app.services.supabase_auth import SupabaseAuthService
from app.schemas.auth import UserProfileResponse
from app.core.security import AuthError

client = TestClient(app)


class MockAuthService(SupabaseAuthService):
    """
    Mock authentication service simulating Supabase Auth API
    and database role resolution for isolated deterministic unit tests.
    """

    def __init__(self, mock_role: str = "student", fail_verification: bool = False):
        super().__init__()
        self.mock_role = mock_role
        self.fail_verification = fail_verification

    async def verify_token_and_get_user(self, token: str):
        if self.fail_verification or token == "invalid-token":
            raise AuthError("Invalid or expired authentication token.", 401)
        return {
            "id": "11111111-2222-3333-4444-555555555555",
            "email": "testuser@example.com"
        }

    async def get_authoritative_profile(self, user_id: str, email: str) -> UserProfileResponse:
        return UserProfileResponse(
            id=user_id,
            email=email,
            full_name="Test User",
            role=self.mock_role,
            created_at="2026-10-17T00:00:00Z"
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
