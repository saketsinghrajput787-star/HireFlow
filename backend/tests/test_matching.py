import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.matching import JobMatchScore
from app.services.matching_service import calculate_job_match, normalize_skill, skills_overlap
from app.api.deps import get_auth_service
from app.api.routes.jobs import get_student_service as get_job_student_service
from app.api.routes.recruiter import get_recruiter_service
from app.services.supabase_auth import SupabaseAuthService
from app.services.student_service import StudentService
from app.services.recruiter_service import RecruiterService
from app.schemas.auth import UserProfileResponse
from app.schemas.jobs import JobResponse, JobListResponse
from app.schemas.recruiter import (
    RecruiterApplicantSummary,
    RecruiterApplicantListResponse,
    RecruiterApplicantDetailResponse,
    CandidateProfileBrief,
)

client = TestClient(app)


# =============================================================================
# 1. Unit Tests: Normalization and Skill Overlap
# =============================================================================

def test_normalize_skill_aliases():
    assert normalize_skill("React.js") == "react"
    assert normalize_skill("reactjs") == "react"
    assert normalize_skill("TypeScript") == "typescript"
    assert normalize_skill("TS") == "typescript"
    assert normalize_skill("PostgreSQL") == "postgresql"
    assert normalize_skill("postgres") == "postgresql"
    assert normalize_skill("FastAPI") == "fastapi"
    assert normalize_skill("Fast API") == "fastapi"
    assert normalize_skill("k8s") == "kubernetes"
    assert normalize_skill("Amazon Web Services") == "aws"
    assert normalize_skill("Tailwind CSS") == "tailwindcss"


def test_skills_overlap_detection():
    candidate_skills = ["React.js", "Python", "FastAPI", "Postgres", "Docker"]
    assert skills_overlap("React", candidate_skills) is True
    assert skills_overlap("python", candidate_skills) is True
    assert skills_overlap("postgresql", candidate_skills) is True
    assert skills_overlap("fastapi", candidate_skills) is True
    assert skills_overlap("docker", candidate_skills) is True
    assert skills_overlap("Kubernetes", candidate_skills) is False
    assert skills_overlap("Ruby on Rails", candidate_skills) is False


# =============================================================================
# 2. Unit Tests: Matching Algorithm Scenarios
# =============================================================================

def test_strong_match_scenario():
    job = {
        "title": "Senior Backend Engineer",
        "required_skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
        "location": "San Francisco, CA",
        "work_mode": "remote",
        "experience_level": "senior_level",
        "description": "Looking for a seasoned backend engineer with Bachelor's degree in Computer Science."
    }
    candidate = {
        "skills": ["python", "fastapi", "postgresql", "docker", "aws"],
        "preferred_role": "Backend Engineer",
        "headline": "Experienced Senior Backend Engineer",
        "preferred_location": "Remote",
        "experience": [
            {"title": "Senior Backend Developer", "company": "Alpha Tech", "current": True},
            {"title": "Software Engineer", "company": "Beta Cloud", "current": False},
            {"title": "Junior Engineer", "company": "Gamma Labs", "current": False},
        ],
        "education": [
            {"institution": "Tech State University", "degree": "B.S.", "field_of_study": "Computer Science"}
        ]
    }

    result: JobMatchScore = calculate_job_match(job, candidate)

    assert result.score >= 85
    assert len(result.matched_skills) == 4
    assert len(result.missing_skills) == 0
    assert result.is_partial_profile is False
    assert any("Matches 4 of 4" in reason or "Complete skill alignment" in reason for reason in result.match_reasons)
    assert any("Decision support only" in reason for reason in result.match_reasons)


def test_partial_match_scenario():
    job = {
        "title": "Full Stack Developer",
        "required_skills": ["React", "TypeScript", "Node.js", "GraphQL"],
        "location": "New York, NY",
        "work_mode": "hybrid",
        "experience_level": "mid_level",
        "description": "Build high performance web applications."
    }
    candidate = {
        "skills": ["React", "JavaScript"],
        "preferred_role": "Frontend Developer",
        "headline": "Frontend specialist",
        "preferred_location": "New York, NY",
        "experience": [
            {"title": "Junior Web Developer", "company": "Acme", "current": False}
        ],
        "education": [
            {"institution": "City College", "degree": "Associate Degree", "field_of_study": "Information Systems"}
        ]
    }

    result: JobMatchScore = calculate_job_match(job, candidate)

    assert 45 <= result.score <= 75
    assert "React" in result.matched_skills
    assert "GraphQL" in result.missing_skills
    assert result.is_partial_profile is False
    assert any("Missing" in reason for reason in result.match_reasons)


def test_weak_or_zero_skill_match_scenario():
    job = {
        "title": "iOS Mobile Developer",
        "required_skills": ["Swift", "SwiftUI", "Objective-C", "Xcode"],
        "location": "Seattle, WA",
        "work_mode": "onsite",
        "experience_level": "senior_level",
        "description": "Develop native iOS mobile apps."
    }
    candidate = {
        "skills": ["Python", "Django", "SQL"],
        "preferred_role": "Backend Data Engineer",
        "headline": "Data Pipeline Builder",
        "preferred_location": "Miami, FL",
        "experience": [
            {"title": "Data Analyst", "company": "DataCorp", "current": False}
        ],
        "education": []
    }

    result: JobMatchScore = calculate_job_match(job, candidate)

    assert result.score < 50
    assert len(result.matched_skills) == 0
    assert len(result.missing_skills) == 4
    assert result.is_partial_profile is False


def test_incomplete_profile_scenario():
    job = {
        "title": "Software Engineer",
        "required_skills": ["Python", "FastAPI"],
        "location": "Austin, TX",
        "work_mode": "hybrid",
        "experience_level": "entry_level",
        "description": "Entry level software development."
    }

    # Profile with no skills, no experience, no education
    empty_candidate = {
        "skills": [],
        "experience": [],
        "education": [],
        "preferred_role": "",
        "preferred_location": "",
    }

    result: JobMatchScore = calculate_job_match(job, empty_candidate)

    # Incomplete profiles should produce an honest, neutral baseline (not 0 or 100)
    assert 35 <= result.score <= 45
    assert result.is_partial_profile is True
    assert any("incomplete" in reason.lower() for reason in result.match_reasons)
    assert any("Decision support only" in reason for reason in result.match_reasons)


def test_job_without_optional_requirements():
    job = {
        "title": "General Technology Intern",
        "required_skills": [],  # Open skills requirement
        "location": "Remote",
        "work_mode": "remote",
        "experience_level": "internship",
        "description": "We welcome students from all technical backgrounds to learn and contribute."
    }
    candidate = {
        "skills": ["Python", "Git"],
        "preferred_role": "Software Engineer Intern",
        "headline": "CS Student looking for internships",
        "preferred_location": "Remote",
        "experience": [],
        "education": [
            {"institution": "Tech University", "degree": "B.S.", "field_of_study": "Computer Science"}
        ]
    }

    result: JobMatchScore = calculate_job_match(job, candidate)

    assert result.score >= 70
    assert len(result.missing_skills) == 0
    assert any("open/flexible" in reason.lower() for reason in result.match_reasons)


def test_missing_profile_none_handling():
    job = {
        "title": "Frontend Engineer",
        "required_skills": ["React", "CSS"],
        "location": "Remote",
        "work_mode": "remote",
    }
    result = calculate_job_match(job, None)
    assert result.is_partial_profile is True
    assert result.score == 40
    assert len(result.missing_skills) == 2


# =============================================================================
# 3. Integration Tests: API Endpoints with Matching
# =============================================================================

class MockAuthStudentService(SupabaseAuthService):
    async def verify_token_and_get_user(self, token: str):
        return {"id": "student-test-id", "email": "student@test.edu"}

    async def get_authoritative_profile(self, user_id: str, email: str) -> UserProfileResponse:
        return UserProfileResponse(
            id=user_id,
            email=email,
            full_name="Alex Student",
            role="student",
        )


class MockAuthRecruiterService(SupabaseAuthService):
    async def verify_token_and_get_user(self, token: str):
        return {"id": "recruiter-test-id", "email": "recruiter@test.com"}

    async def get_authoritative_profile(self, user_id: str, email: str) -> UserProfileResponse:
        return UserProfileResponse(
            id=user_id,
            email=email,
            full_name="Sarah Recruiter",
            role="recruiter",
        )


def test_student_job_listing_with_match():
    # Override auth to provide a student user
    app.dependency_overrides[get_auth_service] = lambda: MockAuthStudentService()

    class TestJobService(StudentService):
        async def get_published_jobs(self, student_id=None, **kwargs):
            match_score = None
            if student_id:
                match_score = JobMatchScore(
                    score=88,
                    matched_skills=["React", "TypeScript"],
                    missing_skills=[],
                    match_reasons=["Matches 2 of 2 required skills."],
                    is_partial_profile=False
                )
            return JobListResponse(
                items=[
                    JobResponse(
                        id="job-match-1",
                        recruiter_id="recruiter-test-id",
                        title="Frontend Engineer",
                        company="Velo Labs",
                        description="React & TypeScript apps",
                        required_skills=["React", "TypeScript"],
                        location="Remote",
                        work_mode="remote",
                        employment_type="full_time",
                        experience_level="entry_level",
                        status="published",
                        created_at="2026-10-18T00:00:00Z",
                        match=match_score,
                    )
                ],
                total=1,
                page=1,
                limit=20,
                has_more=False
            )

    app.dependency_overrides[get_job_student_service] = lambda: TestJobService()

    try:
        response = client.get("/api/jobs", headers={"Authorization": "Bearer student-token"})
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        job_item = data["items"][0]
        assert "match" in job_item
        assert job_item["match"] is not None
        assert job_item["match"]["score"] == 88
        assert job_item["match"]["matched_skills"] == ["React", "TypeScript"]
    finally:
        app.dependency_overrides.clear()


def test_recruiter_applications_sorting_and_match():
    app.dependency_overrides[get_auth_service] = lambda: MockAuthRecruiterService()

    class TestRecruiterService(RecruiterService):
        async def get_recruiter_applications(self, recruiter_id, job_id=None, stage=None, search=None, sort_by=None):
            applicants = [
                RecruiterApplicantSummary(
                    id="app-1",
                    job_id="job-1",
                    job_title="Backend Developer",
                    job_company="DataCorp",
                    student_id="student-1",
                    student_name="Candidate Weak",
                    student_email="weak@test.edu",
                    stage="applied",
                    applied_at="2026-10-18T10:00:00Z",
                    stage_changed_at="2026-10-18T10:00:00Z",
                    match=JobMatchScore(
                        score=45,
                        matched_skills=["Python"],
                        missing_skills=["Docker", "Kubernetes"],
                        match_reasons=["Matches 1 of 3 required skills."],
                        is_partial_profile=False
                    )
                ),
                RecruiterApplicantSummary(
                    id="app-2",
                    job_id="job-1",
                    job_title="Backend Developer",
                    job_company="DataCorp",
                    student_id="student-2",
                    student_name="Candidate Strong",
                    student_email="strong@test.edu",
                    stage="applied",
                    applied_at="2026-10-18T09:00:00Z",
                    stage_changed_at="2026-10-18T09:00:00Z",
                    match=JobMatchScore(
                        score=95,
                        matched_skills=["Python", "Docker", "Kubernetes"],
                        missing_skills=[],
                        match_reasons=["Matches 3 of 3 required skills."],
                        is_partial_profile=False
                    )
                )
            ]
            if sort_by == "match_desc":
                applicants.sort(key=lambda r: r.match.score if r.match else 0, reverse=True)
            elif sort_by == "match_asc":
                applicants.sort(key=lambda r: r.match.score if r.match else 0)
            return RecruiterApplicantListResponse(items=applicants, total=len(applicants))

    app.dependency_overrides[get_recruiter_service] = lambda: TestRecruiterService()

    try:
        # Test without sort
        res = client.get("/api/recruiter/applications", headers={"Authorization": "Bearer recruiter-token"})
        assert res.status_code == 200
        items = res.json()["items"]
        assert len(items) == 2
        assert items[0]["match"]["score"] == 45
        assert items[1]["match"]["score"] == 95

        # Test sort by match descending
        res_sorted = client.get("/api/recruiter/applications?sort_by=match_desc", headers={"Authorization": "Bearer recruiter-token"})
        assert res_sorted.status_code == 200
        items_sorted = res_sorted.json()["items"]
        assert items_sorted[0]["match"]["score"] == 95
        assert items_sorted[1]["match"]["score"] == 45
    finally:
        app.dependency_overrides.clear()
