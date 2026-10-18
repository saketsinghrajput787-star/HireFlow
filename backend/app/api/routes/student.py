from typing import List
from fastapi import APIRouter, Depends, status
from app.api.deps import require_student, get_current_user
from app.schemas.auth import UserProfileResponse
from app.schemas.student import (
    CandidateProfileResponse,
    CandidateProfileUpdate,
    ResumeMetadataUpdate,
)
from app.schemas.applications import ApplicationSummary, ApplicationDetailResponse, InterviewDetail
from app.schemas.student_dashboard import StudentDashboardStats, NotificationItem
from app.schemas.resume_intelligence import (
    ResumeAnalysisResponse,
    JobSpecificResumeAnalysisRequest,
    JobSpecificResumeAnalysisResponse,
)
from app.services.student_service import student_service, StudentService
from app.services.resume_intelligence_service import (
    resume_intelligence_service,
    ResumeIntelligenceService,
)

router = APIRouter(prefix="/api/student", tags=["Student Portal"])


def get_student_service() -> StudentService:
    return student_service


def get_resume_intelligence_service() -> ResumeIntelligenceService:
    return resume_intelligence_service


@router.get(
    "/profile",
    response_model=CandidateProfileResponse,
    summary="Get Student Profile",
    description="Retrieves the authenticated student's profile, education, skills, and resume metadata."
)
async def get_profile(
    current_user: UserProfileResponse = Depends(require_student),
    service: StudentService = Depends(get_student_service),
) -> CandidateProfileResponse:
    return await service.get_candidate_profile(current_user.id, current_user.email)


@router.patch(
    "/profile",
    response_model=CandidateProfileResponse,
    summary="Update Student Profile",
    description="Updates permitted candidate profile fields (skills, education, experience, location, preferences)."
)
async def update_profile(
    profile_data: CandidateProfileUpdate,
    current_user: UserProfileResponse = Depends(require_student),
    service: StudentService = Depends(get_student_service),
) -> CandidateProfileResponse:
    return await service.update_candidate_profile(current_user.id, current_user.email, profile_data)


@router.post(
    "/resume/metadata",
    response_model=CandidateProfileResponse,
    summary="Record Uploaded Resume Path",
    description="Links the uploaded PDF resume object in the private 'resumes' bucket to the candidate profile."
)
async def update_resume(
    data: ResumeMetadataUpdate,
    current_user: UserProfileResponse = Depends(require_student),
    service: StudentService = Depends(get_student_service),
) -> CandidateProfileResponse:
    return await service.update_resume_metadata(current_user.id, current_user.email, data.resume_path)


@router.delete(
    "/resume",
    response_model=CandidateProfileResponse,
    summary="Remove Resume Record",
    description="Clears the candidate profile resume object path."
)
async def remove_resume(
    current_user: UserProfileResponse = Depends(require_student),
    service: StudentService = Depends(get_student_service),
) -> CandidateProfileResponse:
    return await service.delete_resume_metadata(current_user.id, current_user.email)


@router.get(
    "/resume/analysis",
    response_model=ResumeAnalysisResponse,
    summary="Analyze Uploaded Resume",
    description="Extracts and analyzes entities from the authenticated student's uploaded PDF resume."
)
async def analyze_my_resume(
    current_user: UserProfileResponse = Depends(require_student),
    service: ResumeIntelligenceService = Depends(get_resume_intelligence_service),
) -> ResumeAnalysisResponse:
    return await service.analyze_student_resume(current_user.id, current_user.email)


@router.post(
    "/resume/analyze-job",
    response_model=JobSpecificResumeAnalysisResponse,
    summary="Analyze Resume Against Specific Job",
    description="Evaluates student resume text alignment against a specific published job opening."
)
async def analyze_resume_for_job(
    payload: JobSpecificResumeAnalysisRequest,
    current_user: UserProfileResponse = Depends(require_student),
    service: ResumeIntelligenceService = Depends(get_resume_intelligence_service),
) -> JobSpecificResumeAnalysisResponse:
    return await service.analyze_resume_against_job(current_user.id, payload.job_id)


@router.get(
    "/applications",
    response_model=List[ApplicationSummary],
    summary="Get Student Applications",
    description="Retrieves all job applications submitted by the authenticated student."
)
async def get_applications(
    current_user: UserProfileResponse = Depends(require_student),
    service: StudentService = Depends(get_student_service),
) -> List[ApplicationSummary]:
    return await service.get_student_applications(current_user.id)


@router.get(
    "/applications/{application_id}",
    response_model=ApplicationDetailResponse,
    summary="Get Application Detail",
    description="Retrieves application detail, scheduled interviews, and status change activity log."
)
async def get_application_detail(
    application_id: str,
    current_user: UserProfileResponse = Depends(require_student),
    service: StudentService = Depends(get_student_service),
) -> ApplicationDetailResponse:
    return await service.get_student_application_detail(application_id, current_user.id)


@router.get(
    "/interviews",
    response_model=List[InterviewDetail],
    summary="Get Student Interviews",
    description="Retrieves all scheduled or completed interviews for the student."
)
async def get_interviews(
    current_user: UserProfileResponse = Depends(require_student),
    service: StudentService = Depends(get_student_service),
) -> List[InterviewDetail]:
    return await service.get_student_interviews(current_user.id)


@router.get(
    "/notifications",
    response_model=List[NotificationItem],
    summary="Get Student Notifications",
    description="Lists notifications for the authenticated student."
)
async def get_notifications(
    current_user: UserProfileResponse = Depends(require_student),
    service: StudentService = Depends(get_student_service),
) -> List[NotificationItem]:
    return await service.get_student_notifications(current_user.id)


@router.patch(
    "/notifications/{notification_id}/read",
    status_code=status.HTTP_200_OK,
    summary="Mark Notification as Read"
)
async def mark_read(
    notification_id: str,
    current_user: UserProfileResponse = Depends(require_student),
    service: StudentService = Depends(get_student_service),
):
    success = await service.mark_notification_read(notification_id, current_user.id)
    return {"success": success}


@router.post(
    "/notifications/read-all",
    status_code=status.HTTP_200_OK,
    summary="Mark All Notifications as Read"
)
async def mark_all_read(
    current_user: UserProfileResponse = Depends(require_student),
    service: StudentService = Depends(get_student_service),
):
    success = await service.mark_all_notifications_read(current_user.id)
    return {"success": success, "message": "All notifications marked as read."}


@router.get(
    "/dashboard-stats",
    response_model=StudentDashboardStats,
    summary="Get Student Dashboard Stats",
    description="Calculates profile completeness %, counts applications by stage, and retrieves upcoming events."
)
async def get_dashboard_stats(
    current_user: UserProfileResponse = Depends(require_student),
    service: StudentService = Depends(get_student_service),
) -> StudentDashboardStats:
    return await service.get_dashboard_stats(current_user.id, current_user.email)
