from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field
import datetime


class FollowUpItem(BaseModel):
    id: str
    category: Literal[
        "new_application",
        "stale_application",
        "upcoming_interview",
        "interview_feedback_pending",
        "candidate_action_required",
        "low_applicant_job"
    ]
    severity: Literal["high", "medium", "low"]
    title: str
    reason: str
    suggested_action: str
    candidate_id: Optional[str] = None
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    job_id: Optional[str] = None
    job_title: Optional[str] = None
    job_company: Optional[str] = None
    application_id: Optional[str] = None
    application_stage: Optional[str] = None
    interview_id: Optional[str] = None
    timestamp: str
    days_elapsed: Optional[int] = None
    target_link: str


class RecruiterFollowUpCenterResponse(BaseModel):
    items: List[FollowUpItem] = Field(default_factory=list)
    total_count: int = 0
    high_priority_count: int = 0
    pending_reviews_count: int = 0
    stale_applications_count: int = 0
    upcoming_interviews_count: int = 0
    pending_feedback_count: int = 0
    low_applicant_jobs_count: int = 0
    generated_at: str


class ProcessRemindersResult(BaseModel):
    reminders_sent: int = 0
    interviews_processed: int = 0
    errors: List[str] = Field(default_factory=list)
    message: str
