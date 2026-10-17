from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from app.api.deps import require_student, get_optional_current_user
from app.schemas.auth import UserProfileResponse
from app.schemas.jobs import JobListResponse, JobResponse
from app.schemas.applications import ApplyJobRequest, ApplyJobResponse
from app.services.student_service import student_service, StudentService

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


def get_student_service() -> StudentService:
    return student_service


@router.get(
    "",
    response_model=JobListResponse,
    summary="List Published Jobs",
    description="Lists published job openings with search, multi-field filtering, and candidate application status."
)
async def list_jobs(
    search: Optional[str] = Query(None, description="Search by title, company, or skills"),
    location: Optional[str] = Query(None, description="Filter by location"),
    work_mode: Optional[str] = Query(None, description="remote, hybrid, or onsite"),
    employment_type: Optional[str] = Query(None, description="full_time, part_time, contract, or internship"),
    experience_level: Optional[str] = Query(None, description="entry_level, mid_level, senior_level, or internship"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: Optional[UserProfileResponse] = Depends(get_optional_current_user),
    service: StudentService = Depends(get_student_service),
) -> JobListResponse:
    student_id = current_user.id if current_user and current_user.role == "student" else None
    return await service.get_published_jobs(
        student_id=student_id,
        search=search,
        location=location,
        work_mode=work_mode,
        employment_type=employment_type,
        experience_level=experience_level,
        page=page,
        limit=limit,
    )


@router.get(
    "/{job_id}",
    response_model=JobResponse,
    summary="Get Job Details",
    description="Retrieves complete job posting description and required skills."
)
async def get_job(
    job_id: str,
    current_user: Optional[UserProfileResponse] = Depends(get_optional_current_user),
    service: StudentService = Depends(get_student_service),
) -> JobResponse:
    student_id = current_user.id if current_user and current_user.role == "student" else None
    return await service.get_job_detail(job_id=job_id, student_id=student_id)


@router.post(
    "/{job_id}/apply",
    response_model=ApplyJobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Apply for Job",
    description="Submits an application for the specified job. Enforces uniqueness on (job_id, student_id) and deadline checks."
)
async def apply_to_job(
    job_id: str,
    apply_req: Optional[ApplyJobRequest] = None,
    current_user: UserProfileResponse = Depends(require_student),
    service: StudentService = Depends(get_student_service),
) -> ApplyJobResponse:
    notes = apply_req.notes if apply_req else None
    return await service.apply_to_job(job_id=job_id, student_id=current_user.id, notes=notes)
