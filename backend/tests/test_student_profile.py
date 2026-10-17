import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_auth_service
from app.api.routes.student import get_student_service
from app.services.supabase_auth import SupabaseAuthService
from app.services.student_service import StudentService
from app.schemas.auth import UserProfileResponse
from app.schemas.student import (
    CandidateProfileResponse,
    CandidateProfileUpdate,
    EducationItem,
    calculate_profile_completion,
)

client = TestClient(app)


class MockAuthService(SupabaseAuthService):
    def __init__(self, role: str = "student", user_id: str = "11111111-2222-3333-4444-555555555555"):
        super().__init__()
        self.role = role
        self.user_id = user_id

    async def verify_token_and_get_user(self, token: str):
        if token == "invalid-token":
            from app.core.security import AuthError
            raise AuthError("Invalid token", 401)
        return {"id": self.user_id, "email": "student@example.com"}

    async def get_authoritative_profile(self, user_id: str, email: str) -> UserProfileResponse:
        return UserProfileResponse(
            id=user_id,
            email=email,
            full_name="Jane Doe",
            role=self.role,
        )


class MockStudentService(StudentService):
    def __init__(self):
        super().__init__()
        self.profile = CandidateProfileResponse(
            id="cand-123",
            student_id="11111111-2222-3333-4444-555555555555",
            full_name="Jane Doe",
            email="student@example.com",
            headline="Aspiring Full Stack Engineer",
            phone="+1234567890",
            preferred_role="Frontend Engineer",
            preferred_location="San Francisco, CA",
            graduation_year=2026,
            skills=["React", "TypeScript", "Python"],
            education=[
                EducationItem(
                    institution="State University",
                    degree="B.S.",
                    field_of_study="Computer Science",
                    start_year=2022,
                    end_year=2026,
                )
            ],
            experience=[],
            resume_path="11111111-2222-3333-4444-555555555555/resume.pdf",
            completion_percentage=90,
        )

    async def get_candidate_profile(self, student_id: str, email: str) -> CandidateProfileResponse:
        return self.profile

    async def update_candidate_profile(self, student_id: str, email: str, update_data: CandidateProfileUpdate) -> CandidateProfileResponse:
        if update_data.headline is not None:
            self.profile.headline = update_data.headline
        if update_data.skills is not None:
            self.profile.skills = update_data.skills
        if update_data.phone is not None:
            self.profile.phone = update_data.phone
        return self.profile

    async def update_resume_metadata(self, student_id: str, email: str, resume_path: str) -> CandidateProfileResponse:
        self.profile.resume_path = resume_path
        return self.profile

    async def delete_resume_metadata(self, student_id: str, email: str) -> CandidateProfileResponse:
        self.profile.resume_path = None
        return self.profile


def test_get_student_profile_success():
    """Test retrieving candidate profile for an authenticated student."""
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(role="student")
    app.dependency_overrides[get_student_service] = lambda: MockStudentService()
    try:
        response = client.get(
            "/api/student/profile",
            headers={"Authorization": "Bearer valid-student-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["student_id"] == "11111111-2222-3333-4444-555555555555"
        assert data["headline"] == "Aspiring Full Stack Engineer"
        assert "React" in data["skills"]
        assert data["completion_percentage"] == 90
    finally:
        app.dependency_overrides.clear()


def test_update_student_profile_success():
    """Test updating candidate profile with new headline and skills."""
    mock_service = MockStudentService()
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(role="student")
    app.dependency_overrides[get_student_service] = lambda: mock_service
    try:
        payload = {
            "headline": "Lead Full Stack Architect",
            "skills": ["React", "FastAPI", "PostgreSQL"],
            "phone": "+9876543210",
        }
        response = client.patch(
            "/api/student/profile",
            json=payload,
            headers={"Authorization": "Bearer valid-student-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["headline"] == "Lead Full Stack Architect"
        assert "FastAPI" in data["skills"]
        assert data["phone"] == "+9876543210"
    finally:
        app.dependency_overrides.clear()


def test_resume_metadata_lifecycle():
    """Test updating and deleting resume metadata for candidate profile."""
    mock_service = MockStudentService()
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(role="student")
    app.dependency_overrides[get_student_service] = lambda: mock_service
    try:
        # 1. Update resume metadata
        res = client.post(
            "/api/student/resume/metadata",
            json={"resume_path": "11111111-2222-3333-4444-555555555555/updated_resume.pdf"},
            headers={"Authorization": "Bearer valid-student-token"},
        )
        assert res.status_code == 200
        assert res.json()["resume_path"] == "11111111-2222-3333-4444-555555555555/updated_resume.pdf"

        # 2. Delete resume metadata
        del_res = client.delete(
            "/api/student/resume",
            headers={"Authorization": "Bearer valid-student-token"},
        )
        assert del_res.status_code == 200
        assert del_res.json()["resume_path"] is None
    finally:
        app.dependency_overrides.clear()


def test_profile_completion_calculation():
    """Test the dynamic profile completeness scoring function."""
    assert calculate_profile_completion(
        full_name="Jane",
        headline="Student",
        preferred_role="Engineer",
        preferred_location="SF",
        phone="+12345",
        graduation_year=2026,
        skills=["Python"],
        education=[{"institution": "Uni"}],
        resume_path="resumes/path.pdf",
    ) == 100

    # Minimal profile
    assert calculate_profile_completion(
        full_name="Jane",
        headline="",
        preferred_role="",
        preferred_location="",
        phone="",
        graduation_year=None,
        skills=[],
        education=[],
        resume_path="",
    ) == 15
