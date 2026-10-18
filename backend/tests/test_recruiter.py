import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_auth_service
from app.api.routes.recruiter import get_recruiter_service
from app.services.supabase_auth import SupabaseAuthService
from app.schemas.auth import UserProfileResponse
from app.schemas.recruiter import (
    RecruiterJobResponse,
    RecruiterJobListResponse,
    RecruiterApplicantSummary,
    RecruiterApplicantListResponse,
    RecruiterApplicantDetailResponse,
    CandidateProfileBrief,
    RecruiterInterviewItem,
    RecruiterInterviewListResponse,
    RecruiterDashboardStatsResponse,
)

client = TestClient(app)

RECRUITER_ID = "bd36b5f4-ed11-4919-8d3d-af9938103832"
STUDENT_ID = "574ceec7-b427-4069-a2d8-29cf8847e753"


class MockAuthService(SupabaseAuthService):
    def __init__(self, role: str = "recruiter", user_id: str = RECRUITER_ID):
        super().__init__()
        self.role = role
        self.user_id = user_id

    async def verify_token_and_get_user(self, token: str):
        if token == "invalid-token":
            raise Exception("Invalid token")
        return {"id": self.user_id, "email": "recruiter@example.com"}

    async def get_authoritative_profile(self, user_id: str, email: str) -> UserProfileResponse:
        return UserProfileResponse(
            id=self.user_id,
            email=email,
            full_name="Enterprise Recruiter",
            role=self.role,
            created_at="2026-10-18T00:00:00Z"
        )


class MockRecruiterService:
    def __init__(self):
        self.jobs = [
            RecruiterJobResponse(
                id="job-111",
                recruiter_id=RECRUITER_ID,
                title="Staff Backend Engineer",
                company="TechCorp Enterprise",
                description="Lead distributed systems architecture.",
                required_skills=["Python", "FastAPI", "PostgreSQL", "Docker"],
                location="San Francisco, CA",
                work_mode="hybrid",
                employment_type="full_time",
                experience_level="senior_level",
                status="published",
                deadline="2026-12-31T23:59:59Z",
                salary_range="$160,000 - $195,000",
                created_at="2026-10-18T10:00:00Z",
                updated_at=None,
                application_count=2
            )
        ]
        self.applicants = [
            RecruiterApplicantSummary(
                id="app-111",
                job_id="job-111",
                job_title="Staff Backend Engineer",
                job_company="TechCorp Enterprise",
                student_id=STUDENT_ID,
                student_name="Alice Student",
                student_email="alice@university.edu",
                stage="applied",
                applied_at="2026-10-18T10:30:00Z",
                stage_changed_at="2026-10-18T10:30:00Z",
                interviews_count=0
            )
        ]
        self.interviews = [
            RecruiterInterviewItem(
                id="int-111",
                application_id="app-111",
                job_id="job-111",
                job_title="Staff Backend Engineer",
                job_company="TechCorp Enterprise",
                student_id=STUDENT_ID,
                student_name="Alice Student",
                student_email="alice@university.edu",
                scheduled_at="2026-10-25T14:00:00Z",
                timezone="UTC",
                interview_format="video",
                status="scheduled",
                meeting_link="https://meet.hireflow.internal/room-101",
                feedback=None,
                created_at="2026-10-18T11:00:00Z",
                updated_at=None
            )
        ]

    async def get_recruiter_dashboard_stats(self, recruiter_id: str):
        user_jobs = [j for j in self.jobs if j.recruiter_id == recruiter_id]
        user_job_ids = {j.id for j in user_jobs}
        user_apps = [a for a in self.applicants if a.job_id in user_job_ids]
        user_ints = [i for i in self.interviews if i.job_id in user_job_ids]
        active = sum(1 for j in user_jobs if j.status == "published")
        pending = sum(1 for a in user_apps if a.stage in ("applied", "screening"))
        return RecruiterDashboardStatsResponse(
            total_jobs=len(user_jobs),
            active_jobs=active,
            total_applicants=len(user_apps),
            pending_reviews=pending,
            scheduled_interviews=len(user_ints),
            recent_applications=user_apps[:5],
            upcoming_interviews=user_ints[:5]
        )

    async def get_recruiter_jobs(self, recruiter_id: str, status_filter=None):
        filtered = [j for j in self.jobs if j.recruiter_id == recruiter_id]
        if status_filter:
            filtered = [j for j in filtered if j.status == status_filter]
        return RecruiterJobListResponse(items=filtered, total=len(filtered))

    async def get_job_by_id(self, recruiter_id: str, job_id: str):
        for j in self.jobs:
            if j.id == job_id and j.recruiter_id == recruiter_id:
                return j
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Job posting not found")

    async def create_job(self, recruiter_id: str, data):
        new_job = RecruiterJobResponse(
            id="job-new",
            recruiter_id=recruiter_id,
            title=data.title,
            company=data.company,
            description=data.description,
            required_skills=data.required_skills,
            location=data.location,
            work_mode=data.work_mode,
            employment_type=data.employment_type,
            experience_level=data.experience_level,
            status=data.status,
            deadline=data.deadline.isoformat() if data.deadline else None,
            salary_range=data.salary_range,
            created_at="2026-10-18T12:00:00Z",
            updated_at=None,
            application_count=0
        )
        self.jobs.append(new_job)
        return new_job

    async def update_job(self, recruiter_id: str, job_id: str, data):
        j = await self.get_job_by_id(recruiter_id, job_id)
        return j

    async def delete_job(self, recruiter_id: str, job_id: str):
        await self.get_job_by_id(recruiter_id, job_id)
        return {"message": "Job posting successfully archived.", "job_id": job_id}

    async def get_recruiter_applications(self, recruiter_id: str, job_id=None, stage=None, search=None, sort_by=None):
        user_jobs = [j for j in self.jobs if j.recruiter_id == recruiter_id]
        user_job_ids = {j.id for j in user_jobs}
        filtered = [a for a in self.applicants if a.job_id in user_job_ids]
        if job_id:
            filtered = [a for a in filtered if a.job_id == job_id]
        if stage:
            filtered = [a for a in filtered if a.stage == stage]
        return RecruiterApplicantListResponse(items=filtered, total=len(filtered))

    async def get_application_detail(self, recruiter_id: str, application_id: str):
        from fastapi import HTTPException
        app = next((a for a in self.applicants if a.id == application_id), None)
        if not app:
            raise HTTPException(status_code=404, detail="Application not found.")
        job = next((j for j in self.jobs if j.id == app.job_id), None)
        if not job or job.recruiter_id != recruiter_id:
            raise HTTPException(status_code=403, detail="Access denied: You do not manage this job posting.")

        return RecruiterApplicantDetailResponse(
            id=application_id,
            job_id=app.job_id,
            job_title=app.job_title,
            job_company=app.job_company,
            job_description="Lead distributed systems architecture.",
            student_id=app.student_id,
            student_name=app.student_name,
            student_email=app.student_email,
            stage=app.stage,
            applied_at=app.applied_at,
            stage_changed_at=app.stage_changed_at,
            candidate_profile=CandidateProfileBrief(
                headline="Senior Computer Science Student & Backend Engineer",
                skills=["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"],
                education=[{
                    "institution": "University of Engineering",
                    "degree": "B.S.",
                    "field_of_study": "Computer Science",
                    "start_year": 2022,
                    "end_year": 2026,
                    "grade": "3.9 GPA"
                }],
                experience=[{
                    "title": "Backend Engineering Intern",
                    "company": "CloudTech Systems",
                    "location": "San Francisco, CA",
                    "start_date": "2025-06",
                    "end_date": "2025-09",
                    "current": False,
                    "description": "Architected async FastAPI endpoints with PostgreSQL."
                }],
                graduation_year=2026,
                preferred_role="Backend Engineer",
                preferred_location="San Francisco / Remote",
                resume_path=f"{app.student_id}/resume.pdf",
                resume_url=f"https://storage.hireflow.internal/{app.student_id}/resume.pdf?signed=1",
                resume_updated_at="2026-10-18T10:00:00Z",
                phone="555-0199"
            ),
            interviews=[],
            activity_logs=[]
        )

    async def get_application_resume_url(self, recruiter_id: str, application_id: str):
        from fastapi import HTTPException
        app = next((a for a in self.applicants if a.id == application_id), None)
        if not app:
            raise HTTPException(status_code=404, detail="Application not found")
        job = next((j for j in self.jobs if j.id == app.job_id), None)
        if not job or job.recruiter_id != recruiter_id:
            raise HTTPException(status_code=403, detail="Access denied: You do not manage this job posting.")
        return {
            "application_id": application_id,
            "student_id": app.student_id,
            "resume_path": f"{app.student_id}/resume.pdf",
            "resume_url": f"https://storage.hireflow.internal/{app.student_id}/resume.pdf?signed=1",
            "filename": "resume.pdf"
        }

    async def update_application_stage(self, recruiter_id: str, application_id: str, new_stage: str, notes=None):
        await self.get_application_detail(recruiter_id, application_id)
        return {"message": f"Application stage successfully updated to {new_stage}.", "stage": new_stage}

    async def get_recruiter_interviews(self, recruiter_id: str, status_filter=None):
        user_jobs = [j for j in self.jobs if j.recruiter_id == recruiter_id]
        user_job_ids = {j.id for j in user_jobs}
        filtered = [i for i in self.interviews if i.job_id in user_job_ids]
        if status_filter:
            filtered = [i for i in filtered if i.status == status_filter]
        return RecruiterInterviewListResponse(items=filtered, total=len(filtered))

    async def schedule_interview(self, recruiter_id: str, data):
        item = RecruiterInterviewItem(
            id="int-new",
            application_id=data.application_id,
            job_id="job-111",
            job_title="Staff Backend Engineer",
            job_company="TechCorp Enterprise",
            student_id=STUDENT_ID,
            student_name="Alice Student",
            student_email="",
            scheduled_at=data.scheduled_at.isoformat(),
            timezone=data.timezone,
            interview_format=data.interview_format,
            status="scheduled",
            meeting_link=data.meeting_link,
            feedback=data.feedback,
            created_at="2026-10-18T12:00:00Z"
        )
        self.interviews.append(item)
        return item

    async def update_interview(self, recruiter_id: str, interview_id: str, data):
        return {"message": "Interview round updated successfully.", "id": interview_id}


@pytest.fixture(autouse=True)
def setup_overrides():
    mock_auth = MockAuthService(role="recruiter", user_id=RECRUITER_ID)
    mock_service = MockRecruiterService()
    app.dependency_overrides[get_auth_service] = lambda: mock_auth
    app.dependency_overrides[get_recruiter_service] = lambda: mock_service
    yield
    app.dependency_overrides.clear()


def test_recruiter_dashboard_metrics():
    response = client.get("/api/recruiter/dashboard", headers={"Authorization": "Bearer recruiter-token"})
    assert response.status_code == 200
    data = response.json()
    assert data["total_jobs"] >= 1
    assert data["active_jobs"] >= 1
    assert data["total_applicants"] >= 1


def test_recruiter_list_jobs():
    response = client.get("/api/recruiter/jobs", headers={"Authorization": "Bearer recruiter-token"})
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) >= 1
    assert data["items"][0]["recruiter_id"] == RECRUITER_ID


def test_recruiter_create_job():
    payload = {
        "title": "Cloud Architect",
        "company": "TechCorp Enterprise",
        "description": "Design secure, resilient multi-cloud architectures.",
        "required_skills": ["AWS", "Kubernetes", "Terraform"],
        "location": "Remote",
        "work_mode": "remote",
        "employment_type": "full_time",
        "experience_level": "senior_level",
        "salary_range": "$175,000 - $210,000"
    }
    response = client.post("/api/recruiter/jobs", json=payload, headers={"Authorization": "Bearer recruiter-token"})
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Cloud Architect"
    assert data["recruiter_id"] == RECRUITER_ID


def test_recruiter_list_applicants():
    response = client.get("/api/recruiter/applications", headers={"Authorization": "Bearer recruiter-token"})
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) >= 1
    assert data["items"][0]["student_name"] == "Alice Student"


def test_recruiter_update_applicant_stage():
    response = client.patch(
        "/api/recruiter/applications/app-111/stage",
        json={"stage": "screening", "notes": "Strong background in Python."},
        headers={"Authorization": "Bearer recruiter-token"}
    )
    assert response.status_code == 200
    assert response.json()["stage"] == "screening"


def test_recruiter_schedule_interview():
    payload = {
        "application_id": "app-111",
        "scheduled_at": "2026-10-30T15:00:00Z",
        "timezone": "UTC",
        "interview_format": "video",
        "meeting_link": "https://meet.hireflow.internal/room-102",
        "advance_stage": True
    }
    response = client.post("/api/recruiter/interviews", json=payload, headers={"Authorization": "Bearer recruiter-token"})
    assert response.status_code == 201
    data = response.json()
    assert data["interview_format"] == "video"
    assert data["status"] == "scheduled"


def test_student_rejected_from_recruiter_portal():
    # Override auth to student role
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(role="student", user_id=STUDENT_ID)
    response = client.get("/api/recruiter/dashboard", headers={"Authorization": "Bearer student-token"})
    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]


def test_unauthenticated_rejected_from_recruiter_portal():
    app.dependency_overrides.clear()
    response = client.get("/api/recruiter/dashboard")
    assert response.status_code == 401


def test_recruiter_get_candidate_detail_complete_profile():
    """Verify recruiter can retrieve complete candidate profile including skills, education, experience, and resume URL."""
    response = client.get(
        "/api/recruiter/applications/app-111",
        headers={"Authorization": "Bearer recruiter-token"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["student_name"] == "Alice Student"
    assert data["student_email"] == "alice@university.edu"
    assert data["job_title"] == "Staff Backend Engineer"

    # Profile verification
    profile = data["candidate_profile"]
    assert profile is not None
    assert profile["headline"] == "Senior Computer Science Student & Backend Engineer"
    assert "FastAPI" in profile["skills"]
    assert len(profile["skills"]) == 5

    # Education verification
    assert len(profile["education"]) == 1
    edu = profile["education"][0]
    assert edu["institution"] == "University of Engineering"
    assert edu["degree"] == "B.S."
    assert edu["field_of_study"] == "Computer Science"
    assert edu["grade"] == "3.9 GPA"

    # Experience verification
    assert len(profile["experience"]) == 1
    exp = profile["experience"][0]
    assert exp["title"] == "Backend Engineering Intern"
    assert exp["company"] == "CloudTech Systems"
    assert "FastAPI" in exp["description"]

    # Resume & Contact verification
    assert profile["resume_path"] == f"{STUDENT_ID}/resume.pdf"
    assert "storage.hireflow.internal" in profile["resume_url"]
    assert profile["phone"] == "555-0199"
    assert profile["preferred_role"] == "Backend Engineer"


def test_recruiter_get_candidate_resume_url():
    """Verify recruiter can generate a secure signed resume download URL."""
    response = client.get(
        "/api/recruiter/applications/app-111/resume-url",
        headers={"Authorization": "Bearer recruiter-token"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "resume_url" in data
    assert "storage.hireflow.internal" in data["resume_url"]
    assert data["filename"] == "resume.pdf"


def test_student_application_appears_on_owning_recruiter_dashboard():
    """Verify that a submitted student application appears on the owning recruiter's dashboard with correct counts and pipeline items."""
    response = client.get("/api/recruiter/dashboard", headers={"Authorization": "Bearer recruiter-token"})
    assert response.status_code == 200
    data = response.json()
    assert data["total_applicants"] == 1
    assert data["pending_reviews"] == 1
    assert len(data["recent_applications"]) == 1
    recent = data["recent_applications"][0]
    assert recent["student_name"] == "Alice Student"
    assert recent["job_title"] == "Staff Backend Engineer"
    assert recent["stage"] == "applied"

    # Also verify recruiter applicant pipeline
    app_res = client.get("/api/recruiter/applications", headers={"Authorization": "Bearer recruiter-token"})
    assert app_res.status_code == 200
    app_data = app_res.json()
    assert app_data["total"] == 1
    assert app_data["items"][0]["id"] == "app-111"


def test_another_recruiter_cannot_see_or_access_applications_for_jobs_they_do_not_own():
    """Verify that another recruiter sees 0 applicants on their dashboard and is forbidden from accessing applications for jobs they do not manage."""
    other_recruiter_id = "recruiter-other-999"
    app.dependency_overrides[get_auth_service] = lambda: MockAuthService(
        role="recruiter", user_id=other_recruiter_id
    )

    # 1. Other recruiter dashboard must show 0 applicants
    dash_res = client.get("/api/recruiter/dashboard", headers={"Authorization": "Bearer other-recruiter-token"})
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["total_jobs"] == 0
    assert dash_data["active_jobs"] == 0
    assert dash_data["total_applicants"] == 0
    assert dash_data["pending_reviews"] == 0
    assert len(dash_data["recent_applications"]) == 0

    # 2. Other recruiter applicant pipeline must be empty
    apps_res = client.get("/api/recruiter/applications", headers={"Authorization": "Bearer other-recruiter-token"})
    assert apps_res.status_code == 200
    assert apps_res.json()["total"] == 0
    assert len(apps_res.json()["items"]) == 0

    # 3. Other recruiter cannot access candidate detail
    detail_res = client.get("/api/recruiter/applications/app-111", headers={"Authorization": "Bearer other-recruiter-token"})
    assert detail_res.status_code == 403
    assert "Access denied" in detail_res.json()["detail"]

    # 4. Other recruiter cannot generate resume URL
    resume_res = client.get("/api/recruiter/applications/app-111/resume-url", headers={"Authorization": "Bearer other-recruiter-token"})
    assert resume_res.status_code == 403
    assert "Access denied" in resume_res.json()["detail"]

    # 5. Other recruiter cannot update stage
    stage_res = client.patch(
        "/api/recruiter/applications/app-111/stage",
        json={"stage": "screening"},
        headers={"Authorization": "Bearer other-recruiter-token"}
    )
    assert stage_res.status_code == 403
    assert "Access denied" in stage_res.json()["detail"]


@pytest.mark.asyncio
async def test_real_recruiter_service_isolation_logic():
    """Test the real RecruiterService logic to ensure jobs and applications for other recruiters are strictly isolated."""
    import httpx
    from app.services.recruiter_service import RecruiterService

    owning_recruiter = "recruiter-A"
    other_recruiter = "recruiter-B"
    mock_job_id = "job-A-1"
    mock_app_id = "app-A-1"
    mock_student_id = "student-1"

    # Simulate Supabase REST responses
    async def handler(request: httpx.Request):
        url_str = str(request.url)
        if "/rest/v1/jobs" in url_str:
            if f"recruiter_id=eq.{owning_recruiter}" in url_str:
                return httpx.Response(200, json=[{
                    "id": mock_job_id,
                    "recruiter_id": owning_recruiter,
                    "title": "Software Engineer",
                    "company": "Acme Corp",
                    "status": "published",
                    "description": "Develop software.",
                    "required_skills": ["Python", "React"],
                    "location": "Remote",
                    "work_mode": "remote",
                    "employment_type": "full_time",
                    "experience_level": "entry_level",
                    "created_at": "2026-10-18T10:00:00Z"
                }])
            elif f"recruiter_id=eq.{other_recruiter}" in url_str:
                return httpx.Response(200, json=[])
        elif "/rest/v1/applications" in url_str:
            if mock_job_id in url_str or mock_app_id in url_str:
                return httpx.Response(200, json=[{
                    "id": mock_app_id,
                    "job_id": mock_job_id,
                    "student_id": mock_student_id,
                    "stage": "applied",
                    "applied_at": "2026-10-18T11:00:00Z",
                    "stage_changed_at": "2026-10-18T11:00:00Z"
                }])
            return httpx.Response(200, json=[])
        elif "/rest/v1/profiles" in url_str:
            return httpx.Response(200, json=[{"id": mock_student_id, "full_name": "Test Student"}])
        elif "/rest/v1/candidate_profiles" in url_str:
            return httpx.Response(200, json=[])
        elif "/rest/v1/interviews" in url_str:
            return httpx.Response(200, json=[])
        elif "/auth/v1/admin/users" in url_str:
            return httpx.Response(200, json={"email": "student@example.com"})
        return httpx.Response(200, json=[])

    mock_transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=mock_transport) as mock_client:
        service = RecruiterService(client=mock_client)

        # 1. Owning recruiter queries applications
        owning_apps = await service.get_recruiter_applications(owning_recruiter)
        assert owning_apps.total == 1
        assert owning_apps.items[0].id == mock_app_id
        assert owning_apps.items[0].student_name == "Test Student"

        # 2. Other recruiter queries applications -> empty
        other_apps = await service.get_recruiter_applications(other_recruiter)
        assert other_apps.total == 0
        assert len(other_apps.items) == 0

        # 3. Owning recruiter dashboard stats reflect the application
        owning_stats = await service.get_recruiter_dashboard_stats(owning_recruiter)
        assert owning_stats.total_jobs == 1
        assert owning_stats.active_jobs == 1
        assert owning_stats.total_applicants == 1
        assert owning_stats.pending_reviews == 1
        assert len(owning_stats.recent_applications) == 1

        # 4. Other recruiter dashboard stats show 0
        other_stats = await service.get_recruiter_dashboard_stats(other_recruiter)
        assert other_stats.total_jobs == 0
        assert other_stats.active_jobs == 0
        assert other_stats.total_applicants == 0
        assert other_stats.pending_reviews == 0

        # 5. Owning recruiter can view application detail
        detail = await service.get_application_detail(owning_recruiter, mock_app_id)
        assert detail.id == mock_app_id
        assert detail.job_id == mock_job_id

        # 6. Other recruiter is forbidden from viewing the application detail
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            await service.get_application_detail(other_recruiter, mock_app_id)
        assert exc_info.value.status_code == 403
        assert "Access denied" in exc_info.value.detail
