from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.schemas.applications import ApplicationSummary, InterviewDetail


class NotificationItem(BaseModel):
    id: str
    recipient_id: str
    notification_type: str
    title: str
    message: str
    related_application_id: Optional[str] = None
    read_at: Optional[str] = None
    created_at: str


class StudentDashboardStats(BaseModel):
    profile_completion_percentage: int
    total_applications: int
    applications_by_stage: Dict[str, int] = Field(default_factory=dict)
    upcoming_interviews_count: int
    recent_applications: List[ApplicationSummary] = Field(default_factory=list)
    upcoming_interviews: List[InterviewDetail] = Field(default_factory=list)
    unread_notifications_count: int = 0
