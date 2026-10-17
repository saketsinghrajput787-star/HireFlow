from typing import Optional, List, Dict, Any
import datetime
import httpx
from fastapi import HTTPException, status
from app.core.config import settings
from app.core.security import logger
from app.schemas.student import (
    CandidateProfileResponse,
    CandidateProfileUpdate,
    EducationItem,
    ExperienceItem,
    calculate_profile_completion,
)
from app.schemas.jobs import JobResponse, JobListResponse
from app.schemas.applications import (
    ApplicationSummary,
    ApplicationDetailResponse,
    InterviewDetail,
    ActivityLogItem,
    ApplyJobResponse,
)
from app.schemas.student_dashboard import StudentDashboardStats, NotificationItem


class StudentService:
    """
    Handles all business logic and PostgreSQL data persistence for the Student Portal.
    Uses verified student_id derived strictly from the authenticated JWT.
    """

    def __init__(self, client: Optional[httpx.AsyncClient] = None):
        self._client = client

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is not None:
            return self._client
        return httpx.AsyncClient(timeout=10.0)

    def _get_headers(self) -> Dict[str, str]:
        key = settings.SUPABASE_SERVICE_ROLE_KEY if "placeholder" not in settings.SUPABASE_SERVICE_ROLE_KEY else settings.SUPABASE_PUBLISHABLE_KEY
        return {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Prefer": "return=representation",
        }

    # =========================================================================
    # 1. Profile Management
    # =========================================================================

    async def get_candidate_profile(self, student_id: str, email: str) -> CandidateProfileResponse:
        """Fetch candidate profile from public.candidate_profiles & profiles."""
        base_url = settings.SUPABASE_URL.rstrip('/')
        client = await self._get_client()

        # 1. Fetch user full_name from public.profiles
        name = email.split('@')[0]
        try:
            profile_res = await client.get(
                f"{base_url}/rest/v1/profiles?id=eq.{student_id}&select=full_name",
                headers=self._get_headers(),
            )
            if profile_res.status_code == 200 and profile_res.json():
                name = profile_res.json()[0].get("full_name") or name
        except Exception as e:
            logger.warning("Failed to fetch profile name for %s: %s", student_id, str(e))

        # 2. Fetch candidate profile
        try:
            cand_res = await client.get(
                f"{base_url}/rest/v1/candidate_profiles?student_id=eq.{student_id}",
                headers=self._get_headers(),
            )
            if cand_res.status_code == 200 and cand_res.json():
                row = cand_res.json()[0]
                education_raw = row.get("education") or []
                experience_raw = row.get("experience") or []
                skills_raw = row.get("skills") or []

                completion = calculate_profile_completion(
                    full_name=name,
                    headline=row.get("headline"),
                    preferred_role=row.get("preferred_role"),
                    preferred_location=row.get("preferred_location"),
                    phone=row.get("phone"),
                    graduation_year=row.get("graduation_year"),
                    skills=skills_raw,
                    education=education_raw,
                    resume_path=row.get("resume_path"),
                )

                return CandidateProfileResponse(
                    id=row.get("id", student_id),
                    student_id=student_id,
                    full_name=name,
                    email=email,
                    headline=row.get("headline"),
                    phone=row.get("phone"),
                    preferred_role=row.get("preferred_role"),
                    preferred_location=row.get("preferred_location"),
                    graduation_year=row.get("graduation_year"),
                    skills=skills_raw,
                    education=[EducationItem(**item) for item in education_raw if isinstance(item, dict)],
                    experience=[ExperienceItem(**item) for item in experience_raw if isinstance(item, dict)],
                    resume_path=row.get("resume_path"),
                    resume_updated_at=row.get("resume_updated_at"),
                    completion_percentage=completion,
                    created_at=row.get("created_at"),
                    updated_at=row.get("updated_at"),
                )
        except Exception as e:
            logger.error("Error retrieving candidate profile for %s: %s", student_id, str(e))

        # Default empty profile if not yet created in DB
        return CandidateProfileResponse(
            id=student_id,
            student_id=student_id,
            full_name=name,
            email=email,
            completion_percentage=15 if name else 0,
        )

    async def update_candidate_profile(
        self, student_id: str, email: str, update_data: CandidateProfileUpdate
    ) -> CandidateProfileResponse:
        """Update candidate profile and name."""
        base_url = settings.SUPABASE_URL.rstrip('/')
        client = await self._get_client()

        # Update full_name in public.profiles if provided
        if update_data.full_name and update_data.full_name.strip():
            try:
                await client.patch(
                    f"{base_url}/rest/v1/profiles?id=eq.{student_id}",
                    headers=self._get_headers(),
                    json={"full_name": update_data.full_name.strip()},
                )
            except Exception as e:
                logger.warning("Failed to update full_name in profiles: %s", str(e))

        # Normalize skills: lowercase, stripped, deduplicated
        normalized_skills = None
        if update_data.skills is not None:
            seen = set()
            normalized_skills = []
            for s in update_data.skills:
                cleaned = s.strip()
                if cleaned and cleaned.lower() not in seen:
                    seen.add(cleaned.lower())
                    normalized_skills.append(cleaned)

        # Build payload for candidate_profiles
        patch_payload: Dict[str, Any] = {}
        if update_data.headline is not None:
            patch_payload["headline"] = update_data.headline.strip() if update_data.headline else None
        if update_data.phone is not None:
            patch_payload["phone"] = update_data.phone.strip() if update_data.phone else None
        if update_data.preferred_role is not None:
            patch_payload["preferred_role"] = update_data.preferred_role.strip() if update_data.preferred_role else None
        if update_data.preferred_location is not None:
            patch_payload["preferred_location"] = update_data.preferred_location.strip() if update_data.preferred_location else None
        if update_data.graduation_year is not None:
            patch_payload["graduation_year"] = update_data.graduation_year
        if normalized_skills is not None:
            patch_payload["skills"] = normalized_skills
        if update_data.education is not None:
            patch_payload["education"] = [item.model_dump() for item in update_data.education]
        if update_data.experience is not None:
            patch_payload["experience"] = [item.model_dump() for item in update_data.experience]

        patch_payload["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()

        try:
            # Upsert candidate profile
            upsert_headers = self._get_headers()
            upsert_headers["Prefer"] = "resolution=merge-duplicates,return=representation"
            upsert_payload = {**patch_payload, "student_id": student_id}

            res = await client.post(
                f"{base_url}/rest/v1/candidate_profiles",
                headers=upsert_headers,
                json=upsert_payload,
            )
            if res.status_code not in (200, 201):
                # Try patch if insert conflict
                await client.patch(
                    f"{base_url}/rest/v1/candidate_profiles?student_id=eq.{student_id}",
                    headers=self._get_headers(),
                    json=patch_payload,
                )
        except Exception as e:
            logger.error("Error saving candidate profile for %s: %s", student_id, str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to persist candidate profile changes. Please try again.",
            )

        return await self.get_candidate_profile(student_id, email)

    async def update_resume_metadata(
        self, student_id: str, email: str, resume_path: str
    ) -> CandidateProfileResponse:
        """Records the object path of an uploaded PDF resume."""
        base_url = settings.SUPABASE_URL.rstrip('/')
        client = await self._get_client()
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        try:
            await client.patch(
                f"{base_url}/rest/v1/candidate_profiles?student_id=eq.{student_id}",
                headers=self._get_headers(),
                json={
                    "resume_path": resume_path,
                    "resume_updated_at": now,
                    "updated_at": now,
                },
            )
        except Exception as e:
            logger.error("Error setting resume metadata for %s: %s", student_id, str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update resume path in database.",
            )

        return await self.get_candidate_profile(student_id, email)

    async def delete_resume_metadata(self, student_id: str, email: str) -> CandidateProfileResponse:
        """Removes the resume object path reference."""
        base_url = settings.SUPABASE_URL.rstrip('/')
        client = await self._get_client()
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        try:
            await client.patch(
                f"{base_url}/rest/v1/candidate_profiles?student_id=eq.{student_id}",
                headers=self._get_headers(),
                json={
                    "resume_path": None,
                    "resume_updated_at": None,
                    "updated_at": now,
                },
            )
        except Exception as e:
            logger.error("Error deleting resume metadata for %s: %s", student_id, str(e))
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to remove resume record from profile.",
            )

        return await self.get_candidate_profile(student_id, email)

    # =========================================================================
    # 2. Job Discovery & Details
    # =========================================================================

    async def get_published_jobs(
        self,
        student_id: Optional[str] = None,
        search: Optional[str] = None,
        location: Optional[str] = None,
        work_mode: Optional[str] = None,
        employment_type: Optional[str] = None,
        experience_level: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> JobListResponse:
        """Lists active, published job openings with filters and student application status."""
        base_url = settings.SUPABASE_URL.rstrip('/')
        client = await self._get_client()

        # Build query parameters for PostgREST
        params: List[str] = [
            "status=eq.published",
            "order=created_at.desc",
        ]

        if work_mode:
            params.append(f"work_mode=eq.{work_mode}")
        if employment_type:
            params.append(f"employment_type=eq.{employment_type}")
        if experience_level:
            params.append(f"experience_level=eq.{experience_level}")
        if location:
            params.append(f"location=ilike.*{location.strip()}*")

        query_str = "&".join(params)
        req_headers = self._get_headers()
        req_headers["Prefer"] = "count=exact"

        offset = (page - 1) * limit
        req_headers["Range"] = f"{offset}-{offset + limit - 1}"

        try:
            res = await client.get(
                f"{base_url}/rest/v1/jobs?{query_str}",
                headers=req_headers,
            )

            total = 0
            content_range = res.headers.get("content-range")
            if content_range and "/" in content_range:
                try:
                    total = int(content_range.split("/")[1])
                except (ValueError, IndexError):
                    total = 0

            raw_jobs = res.json() if res.status_code in (200, 206) else []

            # In-memory keyword filtering for title, company, skills if search is given
            if search and search.strip():
                kw = search.strip().lower()
                raw_jobs = [
                    j for j in raw_jobs
                    if kw in j.get("title", "").lower()
                    or kw in j.get("company", "").lower()
                    or any(kw in s.lower() for s in j.get("required_skills", []))
                ]
                total = len(raw_jobs)

            # Check student application status
            applied_map: Dict[str, Dict[str, Any]] = {}
            if student_id:
                try:
                    app_res = await client.get(
                        f"{base_url}/rest/v1/applications?student_id=eq.{student_id}&select=id,job_id,stage",
                        headers=self._get_headers(),
                    )
                    if app_res.status_code == 200:
                        for a in app_res.json():
                            applied_map[a["job_id"]] = a
                except Exception as e:
                    logger.warning("Error fetching student applied jobs: %s", str(e))

            items: List[JobResponse] = []
            for j in raw_jobs:
                job_id = j["id"]
                app_info = applied_map.get(job_id)
                items.append(
                    JobResponse(
                        id=job_id,
                        recruiter_id=j["recruiter_id"],
                        title=j["title"],
                        company=j["company"],
                        description=j["description"],
                        required_skills=j.get("required_skills") or [],
                        location=j["location"],
                        work_mode=j["work_mode"],
                        employment_type=j["employment_type"],
                        experience_level=j.get("experience_level", "entry_level"),
                        status=j["status"],
                        deadline=j.get("deadline"),
                        created_at=j["created_at"],
                        updated_at=j.get("updated_at"),
                        has_applied=bool(app_info),
                        application_id=app_info.get("id") if app_info else None,
                        application_stage=app_info.get("stage") if app_info else None,
                    )
                )

            return JobListResponse(
                items=items,
                total=total,
                page=page,
                limit=limit,
                has_more=(offset + limit < total),
            )

        except Exception as e:
            logger.error("Error querying published jobs: %s", str(e))
            return JobListResponse(items=[], total=0, page=page, limit=limit, has_more=False)

    async def get_job_detail(self, job_id: str, student_id: Optional[str] = None) -> JobResponse:
        """Retrieves details of a published job."""
        base_url = settings.SUPABASE_URL.rstrip('/')
        client = await self._get_client()

        res = await client.get(
            f"{base_url}/rest/v1/jobs?id=eq.{job_id}",
            headers=self._get_headers(),
        )

        if res.status_code != 200 or not res.json():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job opening not found.")

        job_row = res.json()[0]
        if job_row.get("status") != "published":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This job posting is not currently open for applications.",
            )

        # Check application status
        has_applied = False
        app_id = None
        app_stage = None
        if student_id:
            try:
                app_res = await client.get(
                    f"{base_url}/rest/v1/applications?student_id=eq.{student_id}&job_id=eq.{job_id}&select=id,stage",
                    headers=self._get_headers(),
                )
                if app_res.status_code == 200 and app_res.json():
                    has_applied = True
                    app_id = app_res.json()[0]["id"]
                    app_stage = app_res.json()[0]["stage"]
            except Exception as e:
                logger.warning("Error checking application status: %s", str(e))

        return JobResponse(
            id=job_row["id"],
            recruiter_id=job_row["recruiter_id"],
            title=job_row["title"],
            company=job_row["company"],
            description=job_row["description"],
            required_skills=job_row.get("required_skills") or [],
            location=job_row["location"],
            work_mode=job_row["work_mode"],
            employment_type=job_row["employment_type"],
            experience_level=job_row.get("experience_level", "entry_level"),
            status=job_row["status"],
            deadline=job_row.get("deadline"),
            created_at=job_row["created_at"],
            updated_at=job_row.get("updated_at"),
            has_applied=has_applied,
            application_id=app_id,
            application_stage=app_stage,
        )

    # =========================================================================
    # 3. Application Submission & Tracking
    # =========================================================================

    async def apply_to_job(self, job_id: str, student_id: str, notes: Optional[str] = None) -> ApplyJobResponse:
        """
        Submits an application for a published job.
        Strictly enforces:
        1. Job is published.
        2. Deadline has not passed.
        3. Candidate has not already applied (prevents duplicate applications).
        """
        base_url = settings.SUPABASE_URL.rstrip('/')
        client = await self._get_client()

        # 1. Verify job exists and is published
        job = await self.get_job_detail(job_id, student_id)
        if job.status != "published":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This job is not accepting applications.",
            )

        if job.deadline:
            try:
                dl = datetime.datetime.fromisoformat(job.deadline.replace("Z", "+00:00"))
                if dl < datetime.datetime.now(datetime.timezone.utc):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="The application deadline for this position has passed.",
                    )
            except ValueError:
                pass

        # 2. Check for duplicate application
        dup_check = await client.get(
            f"{base_url}/rest/v1/applications?job_id=eq.{job_id}&student_id=eq.{student_id}&select=id",
            headers=self._get_headers(),
        )
        if dup_check.status_code == 200 and dup_check.json():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="You have already submitted an application for this position.",
            )

        # 3. Create application
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        insert_payload = {
            "job_id": job_id,
            "student_id": student_id,
            "stage": "applied",
            "applied_at": now_iso,
            "stage_changed_at": now_iso,
        }

        res = await client.post(
            f"{base_url}/rest/v1/applications",
            headers=self._get_headers(),
            json=insert_payload,
        )

        if res.status_code not in (200, 201):
            if res.status_code == 409 or "duplicate" in res.text.lower() or "unique" in res.text.lower():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="You have already applied to this job.",
                )
            logger.error("Application insert failed: %d - %s", res.status_code, res.text)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to submit application. Please try again.",
            )

        app_record = res.json()[0] if res.json() else {"id": "submitted"}
        application_id = app_record.get("id")

        # 4. Insert optional candidate note into activity_logs if provided
        if notes and notes.strip() and application_id:
            try:
                await client.post(
                    f"{base_url}/rest/v1/activity_logs",
                    headers=self._get_headers(),
                    json={
                        "application_id": application_id,
                        "actor_id": student_id,
                        "event_type": "candidate_note",
                        "metadata": {"note": notes.strip()},
                    },
                )
            except Exception as e:
                logger.warning("Failed to record candidate note in activity_logs: %s", str(e))

        return ApplyJobResponse(
            application_id=str(application_id),
            job_id=job_id,
            stage="applied",
            applied_at=now_iso,
            message="Your application was submitted successfully!",
        )

    async def get_student_applications(self, student_id: str) -> List[ApplicationSummary]:
        """Lists all applications belonging to the authenticated student."""
        base_url = settings.SUPABASE_URL.rstrip('/')
        client = await self._get_client()

        # Query applications with joined job details
        res = await client.get(
            f"{base_url}/rest/v1/applications?student_id=eq.{student_id}&select=id,job_id,stage,applied_at,stage_changed_at,next_action_at,jobs(id,title,company,location,work_mode,employment_type)&order=applied_at.desc",
            headers=self._get_headers(),
        )

        if res.status_code != 200:
            return []

        summaries: List[ApplicationSummary] = []
        for row in res.json():
            job_info = row.get("jobs") or {}
            summaries.append(
                ApplicationSummary(
                    id=row["id"],
                    job_id=row["job_id"],
                    job_title=job_info.get("title", "Untitled Position"),
                    company=job_info.get("company", "Company"),
                    location=job_info.get("location", "Unspecified"),
                    work_mode=job_info.get("work_mode", "remote"),
                    employment_type=job_info.get("employment_type", "full_time"),
                    stage=row["stage"],
                    applied_at=row["applied_at"],
                    stage_changed_at=row["stage_changed_at"],
                    next_action_at=row.get("next_action_at"),
                )
            )

        return summaries

    async def get_student_application_detail(
        self, application_id: str, student_id: str
    ) -> ApplicationDetailResponse:
        """Retrieves full application detail including timeline and interviews."""
        base_url = settings.SUPABASE_URL.rstrip('/')
        client = await self._get_client()

        # Fetch application with job
        res = await client.get(
            f"{base_url}/rest/v1/applications?id=eq.{application_id}&student_id=eq.{student_id}&select=id,job_id,student_id,stage,applied_at,stage_changed_at,next_action_at,created_at,jobs(title,company,location,work_mode,employment_type,description,required_skills)",
            headers=self._get_headers(),
        )

        if res.status_code != 200 or not res.json():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application record not found.")

        app_row = res.json()[0]
        job_info = app_row.get("jobs") or {}

        # Fetch scheduled interviews
        interviews: List[InterviewDetail] = []
        try:
            int_res = await client.get(
                f"{base_url}/rest/v1/interviews?application_id=eq.{application_id}&order=scheduled_at.asc",
                headers=self._get_headers(),
            )
            if int_res.status_code == 200:
                for item in int_res.json():
                    interviews.append(InterviewDetail(**item))
        except Exception as e:
            logger.warning("Error fetching interviews: %s", str(e))

        # Fetch activity logs
        activity_logs: List[ActivityLogItem] = []
        try:
            log_res = await client.get(
                f"{base_url}/rest/v1/activity_logs?application_id=eq.{application_id}&order=created_at.desc",
                headers=self._get_headers(),
            )
            if log_res.status_code == 200:
                for item in log_res.json():
                    activity_logs.append(ActivityLogItem(**item))
        except Exception as e:
            logger.warning("Error fetching activity logs: %s", str(e))

        return ApplicationDetailResponse(
            id=app_row["id"],
            job_id=app_row["job_id"],
            student_id=app_row["student_id"],
            job_title=job_info.get("title", "Untitled Position"),
            company=job_info.get("company", "Company"),
            location=job_info.get("location", "Unspecified"),
            work_mode=job_info.get("work_mode", "remote"),
            employment_type=job_info.get("employment_type", "full_time"),
            job_description=job_info.get("description", ""),
            required_skills=job_info.get("required_skills") or [],
            stage=app_row["stage"],
            applied_at=app_row["applied_at"],
            stage_changed_at=app_row["stage_changed_at"],
            next_action_at=app_row.get("next_action_at"),
            created_at=app_row["created_at"],
            interviews=interviews,
            activity_logs=activity_logs,
        )

    # =========================================================================
    # 4. Interviews, Notifications & Dashboard Stats
    # =========================================================================

    async def get_student_interviews(self, student_id: str) -> List[InterviewDetail]:
        """Lists interviews scheduled for any of the student's applications."""
        base_url = settings.SUPABASE_URL.rstrip('/')
        client = await self._get_client()

        # Join via applications
        res = await client.get(
            f"{base_url}/rest/v1/interviews?select=id,application_id,scheduled_at,timezone,interview_format,status,meeting_link,feedback,created_at,applications!inner(student_id)&applications.student_id=eq.{student_id}&order=scheduled_at.asc",
            headers=self._get_headers(),
        )

        if res.status_code != 200:
            return []

        interviews: List[InterviewDetail] = []
        for item in res.json():
            item_clean = {k: v for k, v in item.items() if k != "applications"}
            interviews.append(InterviewDetail(**item_clean))

        return interviews

    async def get_student_notifications(self, student_id: str) -> List[NotificationItem]:
        """Lists notifications for student."""
        base_url = settings.SUPABASE_URL.rstrip('/')
        client = await self._get_client()

        res = await client.get(
            f"{base_url}/rest/v1/notifications?recipient_id=eq.{student_id}&order=created_at.desc&limit=50",
            headers=self._get_headers(),
        )

        if res.status_code != 200:
            return []

        return [NotificationItem(**item) for item in res.json()]

    async def mark_notification_read(self, notification_id: str, student_id: str) -> bool:
        """Marks notification as read."""
        base_url = settings.SUPABASE_URL.rstrip('/')
        client = await self._get_client()
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        res = await client.patch(
            f"{base_url}/rest/v1/notifications?id=eq.{notification_id}&recipient_id=eq.{student_id}",
            headers=self._get_headers(),
            json={"read_at": now},
        )
        return res.status_code == 200

    async def get_dashboard_stats(self, student_id: str, email: str) -> StudentDashboardStats:
        """Aggregates all student dashboard metrics from real persisted database rows."""
        # 1. Profile completion
        profile = await self.get_candidate_profile(student_id, email)

        # 2. Applications
        applications = await self.get_student_applications(student_id)
        stage_counts: Dict[str, int] = {
            "applied": 0,
            "screening": 0,
            "interview": 0,
            "offer": 0,
            "hired": 0,
            "rejected": 0,
        }
        for a in applications:
            if a.stage in stage_counts:
                stage_counts[a.stage] += 1

        # 3. Interviews
        interviews = await self.get_student_interviews(student_id)
        upcoming_interviews = [
            i for i in interviews if i.status == "scheduled"
        ]

        # 4. Notifications
        notifications = await self.get_student_notifications(student_id)
        unread_count = sum(1 for n in notifications if not n.read_at)

        return StudentDashboardStats(
            profile_completion_percentage=profile.completion_percentage,
            total_applications=len(applications),
            applications_by_stage=stage_counts,
            upcoming_interviews_count=len(upcoming_interviews),
            recent_applications=applications[:5],
            upcoming_interviews=upcoming_interviews[:5],
            unread_notifications_count=unread_count,
        )


student_service = StudentService()
