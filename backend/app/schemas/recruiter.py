from typing import Optional, List, Dict, Any, Literal
import datetime
from pydantic import BaseModel, Field

JobStatus = Literal["draft", "published", "closed", "archived"]
WorkMode = Literal["remote", "hybrid", "onsite"]
EmploymentType = Literal["full_time", "part_time", "contract", "internship"]
ApplicationStage = Literal["applied", "screening", "interview", "offer", "hired", "rejected"]
InterviewFormat = Literal["video", "in_person", "phone"]
InterviewStatus = Literal["scheduled", "completed", "cancelled", "rescheduled"]


class RecruiterJobCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=150)
    company: str = Field(..., min_length=2, max_length=150)
    description: str = Field(..., min_length=10)
    required_skills: List[str] = Field(default_factory=list)
    location: str = Field(..., min_length=2, max_length=150)
    work_mode: WorkMode = "remote"
    employment_type: EmploymentType = "full_time"
    experience_level: str = "entry_level"
    status: JobStatus = "published"
    deadline: Optional[datetime.datetime] = None
    salary_range: Optional[str] = Field(None, max_length=100)


class RecruiterJobUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=2, max_length=150)
    company: Optional[str] = Field(None, min_length=2, max_length=150)
    description: Optional[str] = Field(None, min_length=10)
    required_skills: Optional[List[str]] = None
    location: Optional[str] = Field(None, min_length=2, max_length=150)
    work_mode: Optional[WorkMode] = None
    employment_type: Optional[EmploymentType] = None
    experience_level: Optional[str] = None
    status: Optional[JobStatus] = None
    deadline: Optional[datetime.datetime] = None
    salary_range: Optional[str] = Field(None, max_length=100)


class RecruiterJobResponse(BaseModel):
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
    salary_range: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    application_count: int = 0


class RecruiterJobListResponse(BaseModel):
    items: List[RecruiterJobResponse]
    total: int


class CandidateProfileBrief(BaseModel):
    headline: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    education: List[Dict[str, Any]] = Field(default_factory=list)
    experience: List[Dict[str, Any]] = Field(default_factory=list)
    graduation_year: Optional[int] = None
    preferred_role: Optional[str] = None
    preferred_location: Optional[str] = None
    resume_path: Optional[str] = None
    resume_url: Optional[str] = None
    resume_updated_at: Optional[str] = None
    phone: Optional[str] = None


from app.schemas.matching import JobMatchScore


class RecruiterApplicantSummary(BaseModel):
    id: str
    job_id: str
    job_title: str
    job_company: str
    student_id: str
    student_name: str
    student_email: str
    stage: ApplicationStage
    applied_at: str
    stage_changed_at: str
    next_action_at: Optional[str] = None
    candidate_profile: Optional[CandidateProfileBrief] = None
    interviews_count: int = 0
    match: Optional[JobMatchScore] = None


class RecruiterApplicantListResponse(BaseModel):
    items: List[RecruiterApplicantSummary]
    total: int


class RecruiterApplicantDetailResponse(BaseModel):
    id: str
    job_id: str
    job_title: str
    job_company: str
    job_description: str
    student_id: str
    student_name: str
    student_email: str
    stage: ApplicationStage
    applied_at: str
    stage_changed_at: str
    next_action_at: Optional[str] = None
    candidate_profile: Optional[CandidateProfileBrief] = None
    interviews: List[Dict[str, Any]] = Field(default_factory=list)
    activity_logs: List[Dict[str, Any]] = Field(default_factory=list)
    match: Optional[JobMatchScore] = None


class UpdateApplicationStageRequest(BaseModel):
    stage: ApplicationStage
    notes: Optional[str] = Field(None, max_length=500)


class CreateInterviewRequest(BaseModel):
    application_id: str
    scheduled_at: datetime.datetime
    timezone: str = "UTC"
    interview_format: InterviewFormat = "video"
    meeting_link: Optional[str] = None
    feedback: Optional[str] = None
    advance_stage: bool = True


class UpdateInterviewRequest(BaseModel):
    scheduled_at: Optional[datetime.datetime] = None
    timezone: Optional[str] = None
    interview_format: Optional[InterviewFormat] = None
    status: Optional[InterviewStatus] = None
    meeting_link: Optional[str] = None
    feedback: Optional[str] = None


class RecruiterInterviewItem(BaseModel):
    id: str
    application_id: str
    job_id: str
    job_title: str
    job_company: str
    student_id: str
    student_name: str
    student_email: str
    scheduled_at: str
    timezone: str
    interview_format: str
    status: str
    meeting_link: Optional[str] = None
    feedback: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None


class RecruiterInterviewListResponse(BaseModel):
    items: List[RecruiterInterviewItem]
    total: int


from app.schemas.follow_up import FollowUpItem


class RecruiterDashboardStatsResponse(BaseModel):
    total_jobs: int
    active_jobs: int
    total_applicants: int
    pending_reviews: int
    scheduled_interviews: int
    recent_applications: List[RecruiterApplicantSummary]
    upcoming_interviews: List[RecruiterInterviewItem]
    interviews_awaiting_feedback: int = 0
    stale_applications_count: int = 0
    stage_distribution: Dict[str, int] = Field(default_factory=dict)
    top_follow_ups: List[FollowUpItem] = Field(default_factory=list)
