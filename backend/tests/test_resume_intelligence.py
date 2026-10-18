import io
import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from app.main import app
from app.api.deps import get_auth_service
from app.api.routes.student import get_resume_intelligence_service
from app.services.supabase_auth import SupabaseAuthService
from app.services.resume_intelligence_service import ResumeIntelligenceService
from app.schemas.auth import UserProfileResponse
from app.schemas.resume_intelligence import (
    ResumeAnalysisResponse,
    JobSpecificResumeAnalysisResponse,
)

client = TestClient(app)


def generate_sample_pdf_bytes(content_text: str = "") -> bytes:
    """Helper to generate a valid PDF in memory with optional text stream."""
    writer = PdfWriter()
    writer.add_blank_page(width=612, height=792)
    stream = io.BytesIO()
    writer.write(stream)
    pdf_bytes = stream.getvalue()

    if content_text:
        # Inject standard text stream into the PDF object stream
        text_stream = f"BT /F1 12 Tf 72 712 Td ({content_text}) Tj ET".encode("latin-1", "replace")
        stream_len = len(text_stream)
        raw_stream = (
            b"\n4 0 obj\n<< /Length " + str(stream_len).encode("ascii") + b" >>\nstream\n"
            + text_stream + b"\nendstream\nendobj\n"
        )
        pdf_bytes = pdf_bytes.replace(b"endobj\nxref", raw_stream + b"xref")
    return pdf_bytes


# =============================================================================
# 1. Unit Tests: Resume Intelligence Extraction & Parsing
# =============================================================================

def test_extract_text_from_valid_pdf():
    service = ResumeIntelligenceService()
    sample_text = (
        "Alex Developer\n"
        "alex@example.com | (555) 123-4567 | github.com/alexdev\n"
        "Professional Summary: Dedicated Backend Engineer with 3+ years experience.\n"
        "Technical Skills: Python, FastAPI, Docker, PostgreSQL, React, AWS.\n"
        "Experience: Software Engineer at Acme Corp (2022 - Present). Built scalable microservices.\n"
        "Education: Bachelor of Science in Computer Science, Tech University, 2024.\n"
        "Projects: E-commerce API built with FastAPI and Redis.\n"
        "Certifications: AWS Certified Solutions Architect."
    )
    # Test entity parsing logic
    parsed = service.parse_resume_content(sample_text)

    assert "Python" in parsed["detected_skills"]
    assert "FastAPI" in parsed["detected_skills"]
    assert "Docker" in parsed["detected_skills"]
    assert "PostgreSQL" in parsed["detected_skills"]
    assert len(parsed["detected_education"]) >= 1
    assert parsed["detected_education"][0].field_of_study == "Computer Science"
    assert parsed["sections_detected"].has_skills is True
    assert parsed["sections_detected"].has_experience is True
    assert parsed["sections_detected"].has_education is True
    assert parsed["sections_detected"].has_projects is True
    assert parsed["sections_detected"].has_certifications is True
    assert len(parsed["strengths"]) > 0


def test_scanned_or_empty_pdf_detection():
    service = ResumeIntelligenceService()
    # Blank PDF with no text layer
    blank_pdf = generate_sample_pdf_bytes("")
    clean_text, page_count, is_readable, is_scanned, notice = service.extract_text_from_pdf(blank_pdf)

    assert is_scanned is True
    assert is_readable is False
    assert notice is not None
    assert "scanned" in notice.lower() or "image-only" in notice.lower()


def test_corrupted_pdf_handling():
    service = ResumeIntelligenceService()
    corrupt_bytes = b"NOT_A_VALID_PDF_STREAM"
    clean_text, page_count, is_readable, is_scanned, notice = service.extract_text_from_pdf(corrupt_bytes)

    assert is_readable is False
    assert notice is not None
    assert "not a valid pdf" in notice.lower()


def test_profile_discrepancy_detection():
    service = ResumeIntelligenceService()
    parsed_resume = {
        "detected_skills": ["Python", "FastAPI"],
        "detected_education": [],
    }
    candidate_profile = {
        "skills": ["Python", "React", "Docker", "Kubernetes"],
        "graduation_year": 2025,
    }

    discrepancies = service.detect_profile_discrepancies(parsed_resume, candidate_profile)

    assert len(discrepancies) >= 1
    skill_discrepancy = next(d for d in discrepancies if d.category == "skills")
    assert "React" in skill_discrepancy.description or "Docker" in skill_discrepancy.description
    assert skill_discrepancy.recommendation is not None


# =============================================================================
# 2. Integration Tests: API Endpoints & Security Boundaries
# =============================================================================

class MockAuthStudentService(SupabaseAuthService):
    async def verify_token_and_get_user(self, token: str):
        if token == "invalid-token":
            from app.core.security import AuthError
            raise AuthError("Invalid token", 401)
        return {"id": "student-123", "email": "student@university.edu"}

    async def get_authoritative_profile(self, user_id: str, email: str) -> UserProfileResponse:
        return UserProfileResponse(
            id=user_id,
            email=email,
            full_name="Alex Student",
            role="student",
        )


class MockAuthRecruiterService(SupabaseAuthService):
    async def verify_token_and_get_user(self, token: str):
        return {"id": "recruiter-123", "email": "recruiter@corp.com"}

    async def get_authoritative_profile(self, user_id: str, email: str) -> UserProfileResponse:
        return UserProfileResponse(
            id=user_id,
            email=email,
            full_name="Recruiter User",
            role="recruiter",
        )


def test_student_resume_analysis_endpoint():
    app.dependency_overrides[get_auth_service] = lambda: MockAuthStudentService()

    class TestResumeIntelligenceService(ResumeIntelligenceService):
        async def analyze_student_resume(self, student_id: str, email: str) -> ResumeAnalysisResponse:
            return ResumeAnalysisResponse(
                resume_path=f"{student_id}/resume.pdf",
                filename="resume.pdf",
                file_size_bytes=102400,
                page_count=1,
                word_count=350,
                is_readable=True,
                is_scanned_or_empty=False,
                detected_skills=["Python", "FastAPI", "React", "PostgreSQL"],
                detected_education=[],
                detected_experience=[],
                detected_projects=[],
                detected_certifications=[],
                strengths=["Technical skill breadth: 4 industry technologies detected."],
                areas_for_improvement=["Add quantifiable impact metrics to your experience bullets."],
                profile_discrepancies=[],
            )

    app.dependency_overrides[get_resume_intelligence_service] = lambda: TestResumeIntelligenceService()

    try:
        response = client.get(
            "/api/student/resume/analysis",
            headers={"Authorization": "Bearer student-token"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_readable"] is True
        assert "Python" in data["detected_skills"]
        assert data["word_count"] == 350
        assert len(data["strengths"]) == 1
    finally:
        app.dependency_overrides.clear()


def test_job_specific_resume_analysis_endpoint():
    app.dependency_overrides[get_auth_service] = lambda: MockAuthStudentService()

    class TestResumeIntelligenceService(ResumeIntelligenceService):
        async def analyze_resume_against_job(self, student_id: str, job_id: str) -> JobSpecificResumeAnalysisResponse:
            return JobSpecificResumeAnalysisResponse(
                job_id=job_id,
                job_title="Staff Backend Engineer",
                job_company="CloudTech Systems",
                resume_path=f"{student_id}/resume.pdf",
                filename="resume.pdf",
                is_readable=True,
                is_scanned_or_empty=False,
                job_required_skills=["Python", "FastAPI", "Docker", "Kubernetes"],
                skills_found_in_resume=["Python", "FastAPI"],
                skills_not_detected_in_resume=["Docker", "Kubernetes"],
                relevant_experience_evidence=["Role title match: 'Backend Developer'"],
                relevant_education_evidence=["Recorded academic background: B.S. in Computer Science."],
                tailoring_suggestions=[
                    "Highlight required technologies: 'Docker, Kubernetes' are required by CloudTech Systems but were not detected in your resume."
                ],
                resume_improvements=["Include projects demonstrating hands-on experience with Docker."],
                profile_vs_resume_notes=[
                    "You have 'Docker' listed on your HireFlow profile, but it is not mentioned in your resume text."
                ],
                profile_match_score=85,
            )

    app.dependency_overrides[get_resume_intelligence_service] = lambda: TestResumeIntelligenceService()

    try:
        response = client.post(
            "/api/student/resume/analyze-job",
            json={"job_id": "job-test-456"},
            headers={"Authorization": "Bearer student-token"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["job_title"] == "Staff Backend Engineer"
        assert "Python" in data["skills_found_in_resume"]
        assert "Docker" in data["skills_not_detected_in_resume"]
        assert data["profile_match_score"] == 85
        assert len(data["tailoring_suggestions"]) >= 1
    finally:
        app.dependency_overrides.clear()


def test_recruiter_blocked_from_student_resume_analysis():
    # Enforce role boundary: recruiters cannot access student resume analysis endpoint
    app.dependency_overrides[get_auth_service] = lambda: MockAuthRecruiterService()

    try:
        response = client.get(
            "/api/student/resume/analysis",
            headers={"Authorization": "Bearer recruiter-token"}
        )
        assert response.status_code == 403
        assert "access denied" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()
