from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class DetectedEducation(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    year: Optional[str] = None
    raw_text: Optional[str] = None


class DetectedExperience(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    duration: Optional[str] = None
    summary: Optional[str] = None


class DetectedProject(BaseModel):
    title: Optional[str] = None
    technologies: List[str] = Field(default_factory=list)
    description: Optional[str] = None


class SectionPresence(BaseModel):
    has_contact_info: bool = False
    has_summary: bool = False
    has_skills: bool = False
    has_experience: bool = False
    has_education: bool = False
    has_projects: bool = False
    has_certifications: bool = False


class ProfileDiscrepancy(BaseModel):
    category: str = Field(..., description="'skills', 'education', 'experience', or 'general'")
    description: str
    profile_value: Optional[str] = None
    resume_value: Optional[str] = None
    recommendation: str


class ResumeAnalysisResponse(BaseModel):
    resume_path: str
    filename: str
    file_size_bytes: int
    page_count: int
    word_count: int
    is_readable: bool = True
    is_scanned_or_empty: bool = False
    limitation_notice: Optional[str] = None

    # Extracted Resume Entities
    detected_skills: List[str] = Field(default_factory=list)
    detected_education: List[DetectedEducation] = Field(default_factory=list)
    detected_experience: List[DetectedExperience] = Field(default_factory=list)
    detected_projects: List[DetectedProject] = Field(default_factory=list)
    detected_certifications: List[str] = Field(default_factory=list)
    professional_summary: Optional[str] = None
    sections_detected: SectionPresence = Field(default_factory=SectionPresence)

    # Document Evaluation & Profile Sync
    strengths: List[str] = Field(default_factory=list)
    areas_for_improvement: List[str] = Field(default_factory=list)
    profile_discrepancies: List[ProfileDiscrepancy] = Field(default_factory=list)
    disclaimer: str = (
        "Decision support only: Resume analysis evaluates document text patterns and does not substitute human review. "
        "Discrepancies highlight opportunities to align your profile and resume."
    )


class JobSpecificResumeAnalysisRequest(BaseModel):
    job_id: str = Field(..., description="ID of the published job to analyze resume against")


class JobSpecificResumeAnalysisResponse(BaseModel):
    job_id: str
    job_title: str
    job_company: str
    resume_path: str
    filename: str
    is_readable: bool = True
    is_scanned_or_empty: bool = False
    limitation_notice: Optional[str] = None

    # Skill Comparison
    job_required_skills: List[str] = Field(default_factory=list)
    skills_found_in_resume: List[str] = Field(default_factory=list)
    skills_not_detected_in_resume: List[str] = Field(default_factory=list)

    # Evidence Detected
    relevant_experience_evidence: List[str] = Field(default_factory=list)
    relevant_education_evidence: List[str] = Field(default_factory=list)

    # Concrete Tailoring Actions
    tailoring_suggestions: List[str] = Field(default_factory=list)
    resume_improvements: List[str] = Field(default_factory=list)
    profile_vs_resume_notes: List[str] = Field(default_factory=list)

    # Phase 4A Profile Match Reference (unaltered)
    profile_match_score: Optional[int] = None
    disclaimer: str = (
        "Decision support only: Absence of a keyword in the resume does not mean you lack that qualification. "
        "Review tailoring suggestions to ensure your document accurately reflects your background."
    )
