from typing import Optional, List
from pydantic import BaseModel, Field
from app.schemas.matching import JobMatchScore


class JobResponse(BaseModel):
    id: str
    recruiter_id: str
    title: str
    company: str
    description: str
    required_skills: List[str] = Field(default_factory=list)
    location: str
    work_mode: str
    employment_type: str
    experience_level: str
    status: str
    deadline: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    has_applied: bool = False
    application_id: Optional[str] = None
    application_stage: Optional[str] = None
    match: Optional[JobMatchScore] = None


class JobListResponse(BaseModel):
    items: List[JobResponse]
    total: int
    page: int
    limit: int
    has_more: bool
