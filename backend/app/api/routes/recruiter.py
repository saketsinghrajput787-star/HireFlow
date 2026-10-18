from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from app.api.deps import require_recruiter
from app.schemas.auth import UserProfileResponse
from app.schemas.recruiter import (
    RecruiterJobCreate,
    RecruiterJobUpdate,
    RecruiterJobResponse,
    RecruiterJobListResponse,
    RecruiterApplicantListResponse,
    RecruiterApplicantDetailResponse,
    UpdateApplicationStageRequest,
    CreateInterviewRequest,
    UpdateInterviewRequest,
    RecruiterInterviewItem,
    RecruiterInterviewListResponse,
    RecruiterDashboardStatsResponse,
)
from app.services.recruiter_service import recruiter_service, RecruiterService

router = APIRouter(prefix="/api/recruiter", tags=["Recruiter Portal"])


def get_recruiter_service() -> RecruiterService:
    return recruiter_service


# =============================================================================
# Dashboard Overview
# =============================================================================

@router.get(
    "/dashboard",
    response_model=RecruiterDashboardStatsResponse,
    summary="Get Recruiter Dashboard Metrics",
    description="Returns aggregate statistics, recent applications, and upcoming interviews for the authenticated recruiter."
)
async def get_dashboard(
    current_user: UserProfileResponse = Depends(require_recruiter),
    service: RecruiterService = Depends(get_recruiter_service)
) -> RecruiterDashboardStatsResponse:
    return await service.get_recruiter_dashboard_stats(recruiter_id=current_user.id)


# =============================================================================
# Job Postings Management
# =============================================================================

@router.get(
    "/jobs",
    response_model=RecruiterJobListResponse,
    summary="List Recruiter Jobs",
    description="Lists all jobs created by the authenticated recruiter with status and application counts."
)
async def list_recruiter_jobs(
    status: Optional[str] = Query(None, description="Filter by job status: draft, published, closed, archived"),
    current_user: UserProfileResponse = Depends(require_recruiter),
    service: RecruiterService = Depends(get_recruiter_service)
) -> RecruiterJobListResponse:
    return await service.get_recruiter_jobs(recruiter_id=current_user.id, status_filter=status)


@router.post(
    "/jobs",
    response_model=RecruiterJobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Job Posting",
    description="Creates a new job posting. The recruiter ID is assigned strictly from the verified session."
)
async def create_job(
    job_in: RecruiterJobCreate,
    current_user: UserProfileResponse = Depends(require_recruiter),
    service: RecruiterService = Depends(get_recruiter_service)
) -> RecruiterJobResponse:
    return await service.create_job(recruiter_id=current_user.id, data=job_in)


@router.get(
    "/jobs/{job_id}",
    response_model=RecruiterJobResponse,
    summary="Get Recruiter Job Details",
    description="Retrieves a specific job posting. Access is denied if the job was created by another recruiter."
)
async def get_job_detail(
    job_id: str,
    current_user: UserProfileResponse = Depends(require_recruiter),
    service: RecruiterService = Depends(get_recruiter_service)
) -> RecruiterJobResponse:
    return await service.get_job_by_id(recruiter_id=current_user.id, job_id=job_id)


@router.put(
    "/jobs/{job_id}",
    response_model=RecruiterJobResponse,
    summary="Update Job Posting",
    description="Updates an existing job posting. Enforces recruiter ownership on the backend."
)
async def update_job(
    job_id: str,
    job_in: RecruiterJobUpdate,
    current_user: UserProfileResponse = Depends(require_recruiter),
    service: RecruiterService = Depends(get_recruiter_service)
) -> RecruiterJobResponse:
    return await service.update_job(recruiter_id=current_user.id, job_id=job_id, data=job_in)


@router.delete(
    "/jobs/{job_id}",
    summary="Archive or Delete Job Posting",
    description="Safely archives a job posting owned by the authenticated recruiter."
)
async def delete_job(
    job_id: str,
    current_user: UserProfileResponse = Depends(require_recruiter),
    service: RecruiterService = Depends(get_recruiter_service)
) -> Dict[str, str]:
    return await service.delete_job(recruiter_id=current_user.id, job_id=job_id)


# =============================================================================
# Applicant Pipeline
# =============================================================================

@router.get(
    "/applications",
    response_model=RecruiterApplicantListResponse,
    summary="List Applicants for Recruiter Jobs",
    description="Lists all candidate applications submitted to jobs managed by the authenticated recruiter."
)
async def list_applicants(
    job_id: Optional[str] = Query(None, description="Filter by specific job ID"),
    stage: Optional[str] = Query(None, description="Filter by pipeline stage (applied, screening, interview, offer, hired, rejected)"),
    search: Optional[str] = Query(None, description="Search candidate name, job title, skills"),
    sort_by: Optional[str] = Query(None, description="Sort candidates: match_desc, match_asc, applied_desc, applied_asc"),
    current_user: UserProfileResponse = Depends(require_recruiter),
    service: RecruiterService = Depends(get_recruiter_service)
) -> RecruiterApplicantListResponse:
    return await service.get_recruiter_applications(
        recruiter_id=current_user.id,
        job_id=job_id,
        stage=stage,
        search=search,
        sort_by=sort_by
    )


@router.get(
    "/applications/{application_id}",
    response_model=RecruiterApplicantDetailResponse,
    summary="Get Applicant Profile & Application Details",
    description="Returns candidate profile, skills, education, experience, interviews, and activity history. Enforces job ownership."
)
async def get_applicant_detail(
    application_id: str,
    current_user: UserProfileResponse = Depends(require_recruiter),
    service: RecruiterService = Depends(get_recruiter_service)
) -> RecruiterApplicantDetailResponse:
    return await service.get_application_detail(
        recruiter_id=current_user.id,
        application_id=application_id
    )


@router.get(
    "/applications/{application_id}/resume-url",
    summary="Get Candidate Signed Resume URL",
    description="Generates a temporary signed URL to view or download a candidate's resume. Enforces recruiter job ownership."
)
async def get_candidate_resume_url(
    application_id: str,
    current_user: UserProfileResponse = Depends(require_recruiter),
    service: RecruiterService = Depends(get_recruiter_service)
) -> Dict[str, Any]:
    return await service.get_application_resume_url(
        recruiter_id=current_user.id,
        application_id=application_id
    )


@router.patch(
    "/applications/{application_id}/stage",
    summary="Update Applicant Pipeline Stage",
    description="Transitions an application to a new stage (e.g. screening, interview, offer, hired, rejected). Enforces recruiter ownership."
)
async def update_applicant_stage(
    application_id: str,
    stage_in: UpdateApplicationStageRequest,
    current_user: UserProfileResponse = Depends(require_recruiter),
    service: RecruiterService = Depends(get_recruiter_service)
) -> Dict[str, Any]:
    return await service.update_application_stage(
        recruiter_id=current_user.id,
        application_id=application_id,
        new_stage=stage_in.stage,
        notes=stage_in.notes
    )


# =============================================================================
# Interview Coordination
# =============================================================================

@router.get(
    "/interviews",
    response_model=RecruiterInterviewListResponse,
    summary="List Recruiter Interviews",
    description="Lists all interviews scheduled for candidate applications on jobs managed by the recruiter."
)
async def list_interviews(
    status: Optional[str] = Query(None, description="Filter by status: scheduled, completed, cancelled, rescheduled"),
    current_user: UserProfileResponse = Depends(require_recruiter),
    service: RecruiterService = Depends(get_recruiter_service)
) -> RecruiterInterviewListResponse:
    return await service.get_recruiter_interviews(
        recruiter_id=current_user.id,
        status_filter=status
    )


@router.post(
    "/interviews",
    response_model=RecruiterInterviewItem,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule Interview Round",
    description="Schedules an interview for a candidate. Automatically advances stage to interview and sends student notification."
)
async def schedule_interview(
    interview_in: CreateInterviewRequest,
    current_user: UserProfileResponse = Depends(require_recruiter),
    service: RecruiterService = Depends(get_recruiter_service)
) -> RecruiterInterviewItem:
    return await service.schedule_interview(
        recruiter_id=current_user.id,
        data=interview_in
    )


@router.put(
    "/interviews/{interview_id}",
    summary="Update / Reschedule Interview",
    description="Updates interview schedule, meeting link, status, or records interview feedback. Enforces recruiter ownership."
)
async def update_interview(
    interview_id: str,
    interview_in: UpdateInterviewRequest,
    current_user: UserProfileResponse = Depends(require_recruiter),
    service: RecruiterService = Depends(get_recruiter_service)
) -> Dict[str, Any]:
    return await service.update_interview(
        recruiter_id=current_user.id,
        interview_id=interview_id,
        data=interview_in
    )


# =============================================================================
# Follow-Up Intelligence & Reminder Lifecycle (Phase 4C)
# =============================================================================

from app.schemas.follow_up import RecruiterFollowUpCenterResponse, ProcessRemindersResult
from app.services.follow_up_service import follow_up_service, FollowUpService


def get_follow_up_service() -> FollowUpService:
    return follow_up_service


@router.get(
    "/follow-ups",
    response_model=RecruiterFollowUpCenterResponse,
    summary="Recruiter Follow-up Center",
    description="Aggregates unreviewed applications, stale pipeline candidates, upcoming interviews, and pending evaluations."
)
async def get_follow_ups(
    current_user: UserProfileResponse = Depends(require_recruiter),
    service: FollowUpService = Depends(get_follow_up_service)
) -> RecruiterFollowUpCenterResponse:
    return await service.get_recruiter_follow_ups(recruiter_id=current_user.id)


@router.post(
    "/follow-ups/process-reminders",
    response_model=ProcessRemindersResult,
    summary="Process Automated Interview Reminders",
    description="Idempotently scans scheduled interviews within 48h and delivers in-app reminder notifications to candidates."
)
async def process_interview_reminders(
    current_user: UserProfileResponse = Depends(require_recruiter),
    service: FollowUpService = Depends(get_follow_up_service)
) -> ProcessRemindersResult:
    return await service.process_upcoming_interview_reminders(recruiter_id=current_user.id)

