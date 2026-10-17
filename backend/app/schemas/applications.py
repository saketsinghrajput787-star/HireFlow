from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field

ApplicationStage = Literal["applied", "screening", "interview", "offer", "hired", "rejected"]


class ActivityLogItem(BaseModel):
    id: str
    event_type: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str


class InterviewDetail(BaseModel):
    id: str
    application_id: str
    scheduled_at: str
    timezone: str
    interview_format: str
    status: str
    meeting_link: Optional[str] = None
    feedback: Optional[str] = None
    created_at: str


class ApplicationSummary(BaseModel):
    id: str
    job_id: str
    job_title: str
    company: str
    location: str
    work_mode: str
    employment_type: str
    stage: ApplicationStage
    applied_at: str
    stage_changed_at: str
    next_action_at: Optional[str] = None
    has_scheduled_interview: bool = False


class ApplicationDetailResponse(BaseModel):
    id: str
    job_id: str
    student_id: str
    job_title: str
    company: str
    location: str
    work_mode: str
    employment_type: str
    job_description: str
    required_skills: List[str] = Field(default_factory=list)
    stage: ApplicationStage
    applied_at: str
    stage_changed_at: str
    next_action_at: Optional[str] = None
    created_at: str
    interviews: List[InterviewDetail] = Field(default_factory=list)
    activity_logs: List[ActivityLogItem] = Field(default_factory=list)


class ApplyJobRequest(BaseModel):
    notes: Optional[str] = Field(None, max_length=500, description="Optional note to the hiring team")


class ApplyJobResponse(BaseModel):
    application_id: str
    job_id: str
    stage: str
    applied_at: str
    message: str
