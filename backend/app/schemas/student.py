from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field


class EducationItem(BaseModel):
    institution: str = Field(..., description="College, university, or institution name")
    degree: str = Field(..., description="Degree or program (e.g. B.S., B.Tech, M.S.)")
    field_of_study: str = Field(..., description="Major or area of specialization (e.g. Computer Science)")
    start_year: Optional[int] = Field(None, description="Start year")
    end_year: Optional[int] = Field(None, description="Expected or actual graduation year")
    grade: Optional[str] = Field(None, description="GPA or grade percentage")


class ExperienceItem(BaseModel):
    title: str = Field(..., description="Job or internship title")
    company: str = Field(..., description="Company or organization name")
    location: Optional[str] = Field(None, description="Job location or Remote")
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM or YYYY)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM or Present)")
    current: bool = Field(default=False, description="Whether this is the current position")
    description: Optional[str] = Field(None, description="Role summary or achievements")


class CandidateProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    headline: Optional[str] = Field(None, max_length=150)
    phone: Optional[str] = Field(None, max_length=30)
    preferred_role: Optional[str] = Field(None, max_length=100)
    preferred_location: Optional[str] = Field(None, max_length=100)
    graduation_year: Optional[int] = Field(None, ge=1990, le=2040)
    skills: Optional[List[str]] = Field(default=None)
    education: Optional[List[EducationItem]] = Field(default=None)
    experience: Optional[List[ExperienceItem]] = Field(default=None)


class ResumeMetadataUpdate(BaseModel):
    resume_path: str = Field(..., description="Object path in private 'resumes' bucket: {student_id}/{filename}.pdf")
    filename: Optional[str] = Field(None, description="Original filename")


class CandidateProfileResponse(BaseModel):
    id: str
    student_id: str
    full_name: str
    email: str
    headline: Optional[str] = None
    phone: Optional[str] = None
    preferred_role: Optional[str] = None
    preferred_location: Optional[str] = None
    graduation_year: Optional[int] = None
    skills: List[str] = Field(default_factory=list)
    education: List[EducationItem] = Field(default_factory=list)
    experience: List[ExperienceItem] = Field(default_factory=list)
    resume_path: Optional[str] = None
    resume_updated_at: Optional[str] = None
    completion_percentage: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


def calculate_profile_completion(
    full_name: Optional[str],
    headline: Optional[str],
    preferred_role: Optional[str],
    preferred_location: Optional[str],
    phone: Optional[str],
    graduation_year: Optional[int],
    skills: Optional[List[str]],
    education: Optional[List[Any]],
    resume_path: Optional[str],
) -> int:
    """Calculates profile completion percentage based on actual persisted data."""
    score = 0
    if full_name and full_name.strip():
        score += 15
    if headline and headline.strip():
        score += 15
    if preferred_role and preferred_role.strip():
        score += 10
    if preferred_location and preferred_location.strip():
        score += 10
    if phone and phone.strip():
        score += 10
    if graduation_year:
        score += 10
    if skills and len(skills) > 0:
        score += 15
    if resume_path and resume_path.strip():
        score += 15
    return min(score, 100)
