import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_auth_service
from app.api.routes.jobs import get_student_service as get_job_student_service
from app.api.routes.student import get_student_service
from app.services.supabase_auth import SupabaseAuthService
from app.services.student_service import StudentService
from app.schemas.auth import UserProfileResponse
from app.schemas.jobs import JobResponse, JobListResponse
from app.schemas.applications import (
    ApplicationSummary,
    ApplicationDetailResponse,
    ApplyJobResponse,
)

client = TestClient(app)


class MockAuthService(SupabaseAuthService):
    def __init__(self, role: str = "student", user_id: str = "student-1"):
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


class MockJobService(StudentService):
    def __init__(self):
        super().__init__()
        self.submitted_applications = {}
        self.jobs = [
            JobResponse(
                id="job-101",
                recruiter_id="recruiter-1",
                title="Frontend Developer",
                company="Acme Corp",
                description="Build modern web UIs",
                required_skills=["React", "TypeScript"],
                location="Remote",
                work_mode="remote",
                employment_type="full_time",
                experience_level="entry_level",
                status="published",
                deadline="2027-01-01T00:00:00Z",
                created_at="2026-10-17T00:00:00Z",
            ),
            JobResponse(
                id="job-102",
                recruiter_id="recruiter-1",
                title="Backend Engineer",
                company="Beta Systems",
                description="Develop Python APIs",
                required_skills=["Python", "FastAPI"],
                location="New York, NY",
                work_mode="hybrid",
                employment_type="full_time",
                experience_level="mid_level",
                status="published",
                deadline="2027-01-01T00:00:00Z",
                created_at="2026-10-17T00:00:00Z",
            ),
        ]

    async def get_published_jobs(self, student_id=None, search=None, location=None, work_mode=None, employment_type=None, experience_level=None, page=1, limit=20):
        filtered = self.jobs
        if work_mode:
            filtered = [j for j in filtered if j.work_mode == work_mode]
        if search:
            filtered = [j for j in filtered if search.lower() in j.title.lower()]
        return JobListResponse(
            items=filtered,
            total=len(filtered),
            page=page,
            limit=limit,
            has_more=False,
        )

    async def get_job_detail(self, job_id: str, student_id=None):
        for j in self.jobs:
            if j.id == job_id:
                return j
        raise HTTPException(status_code=404, detail="Job opening not found.")

    async def apply_to_job(self, job_id: str, student_id: str, notes=None):
        if job_id == "job-expired":
            raise HTTPException(status_code=400, detail="The application deadline for this position has passed.")
        if job_id == "job-closed":
            raise HTTPException(status_code=400, detail="This job is not accepting applications.")

        key = (job_id, student_id)
        if key in self.submitted_applications:
            raise HTTPException(status_code=409, detail="You have already submitted an application for this position.")

        app_id = f"app-{job_id}-{student_id}"
        self.submitted_applications[key] = {
            "id": app_id,
            "job_id": job_id,
            "student_id": student_id,
            "stage": "applied",
            "applied_at": "2026-10-17T00:00:00Z",
        }
        return ApplyJobResponse(
            application_id=app_id,
            job_id=job_id,
            stage="applied",
            applied_at="2026-10-17T00:00:00Z",
            message="Your application was submitted successfully!",
        )

    async def get_student_applications(self, student_id: str):
        return [
            ApplicationSummary(
                id=a["id"],
                job_id=a["job_id"],
                job_title="Frontend Developer",
                company="Acme Corp",
                location="Remote",
                work_mode="remote",
                employment_type="full_time",
                stage=a["stage"],
                applied_at=a["applied_at"],
                stage_changed_at=a["applied_at"],
            )
            for a in self.submitted_applications.values()
            if a["student_id"] == student_id
        ]

    async def get_student_interviews(self, student_id: str):
        from app.schemas.applications import InterviewDetail
        return [
            InterviewDetail(
                id="interview-1",
                application_id="app-1",
                scheduled_at="2026-11-01T10:00:00Z",
                interview_format="video",
                meeting_link="https://meet.google.com/abc-def-ghi",
                timezone="UTC",
                status="scheduled",
                created_at="2026-10-17T00:00:00Z",
            )
        ]

    async def get_student_notifications(self, student_id: str):
        from app.schemas.student_dashboard import NotificationItem
        return [
            NotificationItem(
                id="notif-1",
                recipient_id=student_id,
                title="Application Status Updated",
                message="Your application moved to interview stage.",
                notification_type="status_change",
                read_at=None,
                created_at="2026-10-17T00:00:00Z",
            )
        ]

    async def mark_notification_read(self, notification_id: str, student_id: str):
        return True


def test_list_published_jobs():
    """Test listing jobs with optional filter query parameters."""
    mock_service = MockJobService()
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService()
    app.dependency_overrides[get_job_student_service] = lambda: mock_service
    try:
        response = client.get("/api/jobs?work_mode=remote")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["title"] == "Frontend Developer"
    finally:
        app.dependency_overrides.clear()


def test_get_job_detail_success_and_not_found():
    """Test retrieving job detail and handling 404 for nonexistent job."""
    mock_service = MockJobService()
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService()
    app.dependency_overrides[get_job_student_service] = lambda: mock_service
    try:
        # Existing job
        res = client.get("/api/jobs/job-101")
        assert res.status_code == 200
        assert res.json()["company"] == "Acme Corp"

        # Nonexistent job
        res_404 = client.get("/api/jobs/nonexistent-id")
        assert res_404.status_code == 404
    finally:
        app.dependency_overrides.clear()


def test_apply_to_job_and_prevent_duplicate():
    """
    Test student applying to an open job and verify that subsequent application
    attempts are rejected with HTTP 409 Conflict.
    """
    mock_service = MockJobService()
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(user_id="student-1")
    app.dependency_overrides[get_job_student_service] = lambda: mock_service
    app.dependency_overrides[get_student_service] = lambda: mock_service
    try:
        # 1. First application attempt -> 201 Created
        apply_res = client.post(
            "/api/jobs/job-101/apply",
            json={"notes": "Looking forward to this role!"},
            headers={"Authorization": "Bearer valid-student-token"},
        )
        assert apply_res.status_code == 201
        assert apply_res.json()["stage"] == "applied"
        assert "application_id" in apply_res.json()

        # 2. Duplicate application attempt -> 409 Conflict
        dup_res = client.post(
            "/api/jobs/job-101/apply",
            headers={"Authorization": "Bearer valid-student-token"},
        )
        assert dup_res.status_code == 409
        assert "already submitted" in dup_res.json()["detail"].lower()

        # 3. Verify application appears in student application list
        list_res = client.get(
            "/api/student/applications",
            headers={"Authorization": "Bearer valid-student-token"},
        )
        assert list_res.status_code == 200
        apps = list_res.json()
        assert len(apps) == 1
        assert apps[0]["job_id"] == "job-101"

    finally:
        app.dependency_overrides.clear()


def test_student_isolation():
    """Verify that student A cannot see applications belonging to student B."""
    mock_service = MockJobService()
    # Student A applies
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(user_id="student-A")
    app.dependency_overrides[get_job_student_service] = lambda: mock_service
    app.dependency_overrides[get_student_service] = lambda: mock_service

    client.post("/api/jobs/job-101/apply", headers={"Authorization": "Bearer token-A"})

    # Now authenticate as Student B
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(user_id="student-B")
    try:
        res = client.get(
            "/api/student/applications",
            headers={"Authorization": "Bearer token-B"},
        )
        assert res.status_code == 200
        # Student B has 0 applications
        assert len(res.json()) == 0
    finally:
        app.dependency_overrides.clear()


def test_apply_expired_job_rejected():
    """Verify applying to an expired job is rejected with HTTP 400 Bad Request."""
    mock_service = MockJobService()
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(user_id="student-1")
    app.dependency_overrides[get_job_student_service] = lambda: mock_service
    try:
        res = client.post(
            "/api/jobs/job-expired/apply",
            headers={"Authorization": "Bearer valid-student-token"},
        )
        assert res.status_code == 400
        assert "deadline" in res.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_apply_recruiter_rejected():
    """Verify recruiters cannot submit job applications as candidates."""
    mock_service = MockJobService()
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(role="recruiter", user_id="recruiter-1")
    app.dependency_overrides[get_job_student_service] = lambda: mock_service
    try:
        res = client.post(
            "/api/jobs/job-101/apply",
            headers={"Authorization": "Bearer recruiter-token"},
        )
        assert res.status_code == 403
        assert "student" in res.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_student_notifications_and_read():
    """Verify student notifications retrieval and mark-as-read endpoint."""
    mock_service = MockJobService()
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(user_id="student-1")
    app.dependency_overrides[get_student_service] = lambda: mock_service
    try:
        # Get notifications
        res = client.get(
            "/api/student/notifications",
            headers={"Authorization": "Bearer student-token"},
        )
        assert res.status_code == 200
        notifs = res.json()
        assert len(notifs) == 1
        assert notifs[0]["title"] == "Application Status Updated"

        # Mark as read
        patch_res = client.patch(
            f"/api/student/notifications/{notifs[0]['id']}/read",
            headers={"Authorization": "Bearer student-token"},
        )
        assert patch_res.status_code == 200
        assert patch_res.json()["success"] is True
    finally:
        app.dependency_overrides.clear()


def test_student_interviews_list():
    """Verify student interviews schedule endpoint returns valid format and data."""
    mock_service = MockJobService()
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(user_id="student-1")
    app.dependency_overrides[get_student_service] = lambda: mock_service
    try:
        res = client.get(
            "/api/student/interviews",
            headers={"Authorization": "Bearer student-token"},
        )
        assert res.status_code == 200
        interviews = res.json()
        assert len(interviews) == 1
        assert interviews[0]["meeting_link"] == "https://meet.google.com/abc-def-ghi"
    finally:
        app.dependency_overrides.clear()

