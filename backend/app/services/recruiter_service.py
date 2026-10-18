from typing import Optional, List, Dict, Any
import datetime
import httpx
from fastapi import HTTPException, status
from app.core.config import settings
from app.core.security import logger
from app.schemas.recruiter import (
    RecruiterJobCreate,
    RecruiterJobUpdate,
    RecruiterJobResponse,
    RecruiterJobListResponse,
    RecruiterApplicantSummary,
    RecruiterApplicantListResponse,
    RecruiterApplicantDetailResponse,
    CandidateProfileBrief,
    CreateInterviewRequest,
    UpdateInterviewRequest,
    RecruiterInterviewItem,
    RecruiterInterviewListResponse,
    RecruiterDashboardStatsResponse,
)
from app.services.matching_service import calculate_job_match


class RecruiterService:
    """
    Handles business logic and Supabase PostgreSQL persistence for the Recruiter Workspace.
    Strictly verifies recruiter ownership on all operations using authenticated user ID.
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
    # 1. Job Postings Management
    # =========================================================================

    async def get_recruiter_jobs(
        self,
        recruiter_id: str,
        status_filter: Optional[str] = None
    ) -> RecruiterJobListResponse:
        """
        Retrieves all jobs created by the authenticated recruiter with application counts.
        """
        client = await self._get_client()
        headers = self._get_headers()
        rest_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/jobs"

        params: Dict[str, Any] = {
            "recruiter_id": f"eq.{recruiter_id}",
            "order": "created_at.desc",
            "select": "*"
        }
        if status_filter:
            params["status"] = f"eq.{status_filter}"

        try:
            resp = await client.get(rest_url, params=params, headers=headers)
            if resp.status_code != 200:
                logger.error("Failed to fetch recruiter jobs: %d %s", resp.status_code, resp.text)
                raise HTTPException(status_code=resp.status_code, detail="Unable to retrieve job postings.")

            jobs_data = resp.json()

            # Retrieve application counts per job for this recruiter
            job_ids = [j["id"] for j in jobs_data]
            app_counts: Dict[str, int] = {}
            if job_ids:
                apps_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/applications"
                # Supabase in.(id1,id2)
                apps_params = {
                    "job_id": f"in.({','.join(job_ids)})",
                    "select": "job_id"
                }
                apps_resp = await client.get(apps_url, params=apps_params, headers=headers)
                if apps_resp.status_code == 200:
                    for app in apps_resp.json():
                        jid = app.get("job_id")
                        app_counts[jid] = app_counts.get(jid, 0) + 1

            results: List[RecruiterJobResponse] = []
            for j in jobs_data:
                results.append(RecruiterJobResponse(
                    id=j["id"],
                    recruiter_id=j["recruiter_id"],
                    title=j["title"],
                    company=j["company"],
                    description=j["description"],
                    required_skills=j.get("required_skills") or [],
                    location=j["location"],
                    work_mode=j.get("work_mode") or "remote",
                    employment_type=j.get("employment_type") or "full_time",
                    experience_level=j.get("experience_level") or "entry_level",
                    status=j.get("status") or "published",
                    deadline=j.get("deadline"),
                    salary_range=j.get("salary_range"),
                    created_at=j["created_at"],
                    updated_at=j.get("updated_at"),
                    application_count=app_counts.get(j["id"], 0)
                ))

            return RecruiterJobListResponse(items=results, total=len(results))

        except httpx.RequestError as exc:
            logger.error("Network error fetching recruiter jobs: %s", str(exc))
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database service unreachable.")

    async def get_job_by_id(self, recruiter_id: str, job_id: str) -> RecruiterJobResponse:
        """
        Retrieves a single job posting by ID, strictly enforcing recruiter ownership.
        """
        client = await self._get_client()
        headers = self._get_headers()
        rest_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/jobs"

        params = {
            "id": f"eq.{job_id}",
            "recruiter_id": f"eq.{recruiter_id}",
            "select": "*"
        }
        resp = await client.get(rest_url, params=params, headers=headers)
        if resp.status_code != 200 or not resp.json():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job posting not found or unauthorized.")

        j = resp.json()[0]

        # Count applications
        apps_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/applications"
        apps_resp = await client.get(apps_url, params={"job_id": f"eq.{job_id}", "select": "id"}, headers=headers)
        app_count = len(apps_resp.json()) if apps_resp.status_code == 200 else 0

        return RecruiterJobResponse(
            id=j["id"],
            recruiter_id=j["recruiter_id"],
            title=j["title"],
            company=j["company"],
            description=j["description"],
            required_skills=j.get("required_skills") or [],
            location=j["location"],
            work_mode=j.get("work_mode") or "remote",
            employment_type=j.get("employment_type") or "full_time",
            experience_level=j.get("experience_level") or "entry_level",
            status=j.get("status") or "published",
            deadline=j.get("deadline"),
            salary_range=j.get("salary_range"),
            created_at=j["created_at"],
            updated_at=j.get("updated_at"),
            application_count=app_count
        )

    async def create_job(self, recruiter_id: str, data: RecruiterJobCreate) -> RecruiterJobResponse:
        """
        Creates a new job posting. The recruiter ID is assigned strictly from the verified session.
        """
        client = await self._get_client()
        headers = self._get_headers()
        rest_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/jobs"

        payload: Dict[str, Any] = {
            "recruiter_id": recruiter_id,
            "title": data.title.strip(),
            "company": data.company.strip(),
            "description": data.description.strip(),
            "required_skills": [s.strip() for s in data.required_skills if s.strip()],
            "location": data.location.strip(),
            "work_mode": data.work_mode,
            "employment_type": data.employment_type,
            "experience_level": data.experience_level,
            "status": data.status,
            "deadline": data.deadline.isoformat() if data.deadline else None,
        }
        if data.salary_range:
            payload["salary_range"] = data.salary_range.strip()

        resp = await client.post(rest_url, json=payload, headers=headers)
        # If column salary_range does not exist in DB yet, fallback without it
        if resp.status_code == 400 and "salary_range" in resp.text:
            del payload["salary_range"]
            resp = await client.post(rest_url, json=payload, headers=headers)

        if resp.status_code not in (200, 201):
            logger.error("Failed to create job posting: %d %s", resp.status_code, resp.text)
            raise HTTPException(status_code=resp.status_code, detail=f"Failed to create job: {resp.text}")

        created = resp.json()[0]
        return RecruiterJobResponse(
            id=created["id"],
            recruiter_id=created["recruiter_id"],
            title=created["title"],
            company=created["company"],
            description=created["description"],
            required_skills=created.get("required_skills") or [],
            location=created["location"],
            work_mode=created.get("work_mode") or "remote",
            employment_type=created.get("employment_type") or "full_time",
            experience_level=created.get("experience_level") or "entry_level",
            status=created.get("status") or "published",
            deadline=created.get("deadline"),
            salary_range=created.get("salary_range") or data.salary_range,
            created_at=created["created_at"],
            updated_at=created.get("updated_at"),
            application_count=0
        )

    async def update_job(self, recruiter_id: str, job_id: str, data: RecruiterJobUpdate) -> RecruiterJobResponse:
        """
        Updates an existing job posting owned by the authenticated recruiter.
        """
        # Ensure job exists and is owned by recruiter
        await self.get_job_by_id(recruiter_id, job_id)

        client = await self._get_client()
        headers = self._get_headers()
        rest_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/jobs"

        payload: Dict[str, Any] = {}
        if data.title is not None:
            payload["title"] = data.title.strip()
        if data.company is not None:
            payload["company"] = data.company.strip()
        if data.description is not None:
            payload["description"] = data.description.strip()
        if data.required_skills is not None:
            payload["required_skills"] = [s.strip() for s in data.required_skills if s.strip()]
        if data.location is not None:
            payload["location"] = data.location.strip()
        if data.work_mode is not None:
            payload["work_mode"] = data.work_mode
        if data.employment_type is not None:
            payload["employment_type"] = data.employment_type
        if data.experience_level is not None:
            payload["experience_level"] = data.experience_level
        if data.status is not None:
            payload["status"] = data.status
        if data.deadline is not None:
            payload["deadline"] = data.deadline.isoformat()
        if data.salary_range is not None:
            payload["salary_range"] = data.salary_range.strip()

        if not payload:
            return await self.get_job_by_id(recruiter_id, job_id)

        params = {"id": f"eq.{job_id}", "recruiter_id": f"eq.{recruiter_id}"}
        resp = await client.patch(rest_url, params=params, json=payload, headers=headers)
        if resp.status_code == 400 and "salary_range" in resp.text:
            del payload["salary_range"]
            resp = await client.patch(rest_url, params=params, json=payload, headers=headers)

        if resp.status_code not in (200, 204):
            logger.error("Failed to update job: %d %s", resp.status_code, resp.text)
            raise HTTPException(status_code=resp.status_code, detail="Failed to update job posting.")

        return await self.get_job_by_id(recruiter_id, job_id)

    async def delete_job(self, recruiter_id: str, job_id: str) -> Dict[str, str]:
        """
        Archives or removes a job posting owned by the recruiter.
        """
        await self.get_job_by_id(recruiter_id, job_id)

        client = await self._get_client()
        headers = self._get_headers()
        rest_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/jobs"
        params = {"id": f"eq.{job_id}", "recruiter_id": f"eq.{recruiter_id}"}

        # Safe archive first to preserve foreign keys
        resp = await client.patch(rest_url, params=params, json={"status": "archived"}, headers=headers)
        if resp.status_code not in (200, 204):
            raise HTTPException(status_code=resp.status_code, detail="Unable to archive job posting.")

        return {"message": "Job posting successfully archived.", "job_id": job_id}

    # =========================================================================
    # 2. Applicant Pipeline Management
    # =========================================================================

    async def get_recruiter_applications(
        self,
        recruiter_id: str,
        job_id: Optional[str] = None,
        stage: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: Optional[str] = None,
    ) -> RecruiterApplicantListResponse:
        """
        Retrieves all applications submitted to jobs belonging to the recruiter,
        enriched with candidate profile, resume, match calculation, and interview count.
        """
        client = await self._get_client()
        headers = self._get_headers()

        # Step 1: Find all job IDs belonging to this recruiter with matching criteria
        jobs_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/jobs"
        job_params = {
            "recruiter_id": f"eq.{recruiter_id}",
            "select": "id,title,company,description,required_skills,location,work_mode,experience_level,employment_type"
        }
        if job_id:
            job_params["id"] = f"eq.{job_id}"

        jobs_resp = await client.get(jobs_url, params=job_params, headers=headers)
        if jobs_resp.status_code != 200:
            raise HTTPException(status_code=jobs_resp.status_code, detail="Failed to fetch jobs.")

        jobs_list = jobs_resp.json()
        if not jobs_list:
            return RecruiterApplicantListResponse(items=[], total=0)

        job_map = {j["id"]: j for j in jobs_list}
        target_job_ids = list(job_map.keys())

        # Step 2: Fetch applications for these jobs
        apps_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/applications"
        apps_params: Dict[str, Any] = {
            "job_id": f"in.({','.join(target_job_ids)})",
            "order": "applied_at.desc",
            "select": "*"
        }
        if stage:
            apps_params["stage"] = f"eq.{stage}"

        apps_resp = await client.get(apps_url, params=apps_params, headers=headers)
        if apps_resp.status_code != 200:
            raise HTTPException(status_code=apps_resp.status_code, detail="Failed to fetch applications.")

        apps_data = apps_resp.json()
        if not apps_data:
            return RecruiterApplicantListResponse(items=[], total=0)

        student_ids = list({a["student_id"] for a in apps_data})
        app_ids = [a["id"] for a in apps_data]

        # Step 3: Fetch profiles & candidate profiles for these students
        profiles_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/profiles"
        prof_params = {"id": f"in.({','.join(student_ids)})", "select": "id,full_name"}
        prof_resp = await client.get(profiles_url, params=prof_params, headers=headers)
        profile_map = {p["id"]: p.get("full_name", "Student") for p in (prof_resp.json() if prof_resp.status_code == 200 else [])}

        cand_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/candidate_profiles"
        cand_params = {"student_id": f"in.({','.join(student_ids)})", "select": "*"}
        cand_resp = await client.get(cand_url, params=cand_params, headers=headers)
        cand_map = {c["student_id"]: c for c in (cand_resp.json() if cand_resp.status_code == 200 else [])}

        # Step 4: Fetch interview counts for these applications
        interviews_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/interviews"
        int_params = {"application_id": f"in.({','.join(app_ids)})", "select": "application_id"}
        int_resp = await client.get(interviews_url, params=int_params, headers=headers)
        int_counts: Dict[str, int] = {}
        if int_resp.status_code == 200:
            for item in int_resp.json():
                aid = item.get("application_id")
                int_counts[aid] = int_counts.get(aid, 0) + 1

        results: List[RecruiterApplicantSummary] = []
        search_lower = search.strip().lower() if search else None

        for app in apps_data:
            sid = app["student_id"]
            jid = app["job_id"]
            job_info = job_map.get(jid, {})
            cand_info = cand_map.get(sid, {})
            student_name = profile_map.get(sid, "Candidate")

            # Candidate profile brief
            profile_brief = None
            if cand_info:
                profile_brief = CandidateProfileBrief(
                    headline=cand_info.get("headline"),
                    skills=cand_info.get("skills") or [],
                    education=cand_info.get("education") or [],
                    experience=cand_info.get("experience") or [],
                    graduation_year=cand_info.get("graduation_year"),
                    preferred_role=cand_info.get("preferred_role"),
                    preferred_location=cand_info.get("preferred_location"),
                    resume_path=cand_info.get("resume_path"),
                    resume_updated_at=cand_info.get("resume_updated_at"),
                    phone=cand_info.get("phone")
                )

            # Search filtering
            if search_lower:
                match_name = search_lower in student_name.lower()
                match_job = search_lower in job_info.get("title", "").lower()
                skills_match = any(search_lower in s.lower() for s in (cand_info.get("skills") or []))
                headline_match = search_lower in (cand_info.get("headline") or "").lower()
                if not (match_name or match_job or skills_match or headline_match):
                    continue

            # Calculate candidate match with job requirements
            match_score = calculate_job_match(job_info, cand_info)

            results.append(RecruiterApplicantSummary(
                id=app["id"],
                job_id=jid,
                job_title=job_info.get("title", "Job Posting"),
                job_company=job_info.get("company", "Company"),
                student_id=sid,
                student_name=student_name,
                student_email=cand_info.get("phone") or "",  # Fallback contact info
                stage=app["stage"],
                applied_at=app["applied_at"],
                stage_changed_at=app["stage_changed_at"],
                next_action_at=app.get("next_action_at"),
                candidate_profile=profile_brief,
                interviews_count=int_counts.get(app["id"], 0),
                match=match_score,
            ))

        # Step 5: Apply sorting if requested
        if sort_by == "match_desc":
            results.sort(key=lambda r: r.match.score if r.match else 0, reverse=True)
        elif sort_by == "match_asc":
            results.sort(key=lambda r: r.match.score if r.match else 0)
        elif sort_by == "applied_asc":
            results.sort(key=lambda r: r.applied_at)
        elif sort_by == "applied_desc":
            results.sort(key=lambda r: r.applied_at, reverse=True)

        return RecruiterApplicantListResponse(items=results, total=len(results))

    async def get_application_detail(
        self,
        recruiter_id: str,
        application_id: str
    ) -> RecruiterApplicantDetailResponse:
        """
        Retrieves complete application detail including candidate profile, resume link,
        interview history, and immutable activity logs. Verifies recruiter ownership.
        """
        client = await self._get_client()
        headers = self._get_headers()

        # Fetch application
        apps_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/applications"
        app_resp = await client.get(apps_url, params={"id": f"eq.{application_id}", "select": "*"}, headers=headers)
        if app_resp.status_code != 200 or not app_resp.json():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

        app = app_resp.json()[0]

        # Verify recruiter ownership of the job
        jobs_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/jobs"
        job_resp = await client.get(
            jobs_url,
            params={"id": f"eq.{app['job_id']}", "recruiter_id": f"eq.{recruiter_id}", "select": "*"},
            headers=headers
        )
        if job_resp.status_code != 200 or not job_resp.json():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not manage this job posting.")

        job = job_resp.json()[0]

        # Fetch student profile & candidate profile
        sid = app["student_id"]
        prof_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/profiles"
        prof_resp = await client.get(prof_url, params={"id": f"eq.{sid}", "select": "id,full_name"}, headers=headers)
        student_name = prof_resp.json()[0].get("full_name", "Student") if prof_resp.status_code == 200 and prof_resp.json() else "Student"

        # Fetch candidate's email from auth admin
        student_email = ""
        try:
            user_auth_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/admin/users/{sid}"
            user_auth_resp = await client.get(user_auth_url, headers=headers)
            if user_auth_resp.status_code == 200:
                student_email = user_auth_resp.json().get("email") or ""
        except Exception as e:
            logger.warning("Could not fetch user email from auth admin: %s", str(e))

        cand_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/candidate_profiles"
        cand_resp = await client.get(cand_url, params={"student_id": f"eq.{sid}", "select": "*"}, headers=headers)
        cand_info = cand_resp.json()[0] if cand_resp.status_code == 200 and cand_resp.json() else {}

        profile_brief = None
        if cand_info:
            resume_path = cand_info.get("resume_path")
            resume_url = None
            if resume_path:
                try:
                    sign_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/sign/resumes/{resume_path}"
                    sign_resp = await client.post(sign_url, json={"expiresIn": 3600}, headers=headers)
                    if sign_resp.status_code == 200:
                        signed_path = sign_resp.json().get("signedURL")
                        if signed_path:
                            resume_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1{signed_path}"
                except Exception as ex:
                    logger.warning("Failed to generate signed resume URL: %s", str(ex))

            profile_brief = CandidateProfileBrief(
                headline=cand_info.get("headline"),
                skills=cand_info.get("skills") or [],
                education=cand_info.get("education") or [],
                experience=cand_info.get("experience") or [],
                graduation_year=cand_info.get("graduation_year"),
                preferred_role=cand_info.get("preferred_role"),
                preferred_location=cand_info.get("preferred_location"),
                resume_path=resume_path,
                resume_url=resume_url,
                resume_updated_at=cand_info.get("resume_updated_at"),
                phone=cand_info.get("phone")
            )

        # Fetch interviews
        int_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/interviews"
        int_resp = await client.get(int_url, params={"application_id": f"eq.{application_id}", "order": "scheduled_at.desc", "select": "*"}, headers=headers)
        interviews = int_resp.json() if int_resp.status_code == 200 else []

        # Fetch activity logs
        act_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/activity_logs"
        act_resp = await client.get(act_url, params={"application_id": f"eq.{application_id}", "order": "created_at.desc", "select": "*"}, headers=headers)
        activity_logs = act_resp.json() if act_resp.status_code == 200 else []

        # Calculate candidate-to-job match
        match_score = calculate_job_match(job, cand_info)

        return RecruiterApplicantDetailResponse(
            id=app["id"],
            job_id=job["id"],
            job_title=job["title"],
            job_company=job["company"],
            job_description=job["description"],
            student_id=sid,
            student_name=student_name,
            student_email=student_email,
            stage=app["stage"],
            applied_at=app["applied_at"],
            stage_changed_at=app["stage_changed_at"],
            next_action_at=app.get("next_action_at"),
            candidate_profile=profile_brief,
            interviews=interviews,
            activity_logs=activity_logs,
            match=match_score,
        )

    async def get_application_resume_url(
        self,
        recruiter_id: str,
        application_id: str
    ) -> Dict[str, Any]:
        """
        Generates a secure, short-lived signed URL for a candidate's resume.
        Enforces recruiter ownership of the job associated with the application.
        """
        client = await self._get_client()
        headers = self._get_headers()

        # Fetch application
        apps_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/applications"
        app_resp = await client.get(apps_url, params={"id": f"eq.{application_id}", "select": "*"}, headers=headers)
        if app_resp.status_code != 200 or not app_resp.json():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

        app = app_resp.json()[0]

        # Verify recruiter ownership
        jobs_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/jobs"
        job_resp = await client.get(
            jobs_url,
            params={"id": f"eq.{app['job_id']}", "recruiter_id": f"eq.{recruiter_id}", "select": "id"},
            headers=headers
        )
        if job_resp.status_code != 200 or not job_resp.json():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: You do not manage this job posting.")

        # Fetch candidate profile to get resume_path
        sid = app["student_id"]
        cand_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/candidate_profiles"
        cand_resp = await client.get(cand_url, params={"student_id": f"eq.{sid}", "select": "resume_path"}, headers=headers)
        if cand_resp.status_code != 200 or not cand_resp.json():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found.")

        resume_path = cand_resp.json()[0].get("resume_path")
        if not resume_path:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate has not uploaded a resume.")

        # Sign URL for 3600 seconds (1 hour)
        sign_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/sign/resumes/{resume_path}"
        sign_resp = await client.post(sign_url, json={"expiresIn": 3600}, headers=headers)
        if sign_resp.status_code != 200:
            logger.error("Failed to sign resume URL: %d %s", sign_resp.status_code, sign_resp.text)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to generate secure resume download link.")

        signed_path = sign_resp.json().get("signedURL")
        full_resume_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1{signed_path}"

        filename = resume_path.split("/")[-1] if "/" in resume_path else "resume.pdf"
        return {
            "application_id": application_id,
            "student_id": sid,
            "resume_path": resume_path,
            "resume_url": full_resume_url,
            "filename": filename
        }

    async def update_application_stage(
        self,
        recruiter_id: str,
        application_id: str,
        new_stage: str,
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Updates the pipeline stage for an applicant. Enforces recruiter job ownership.
        Database triggers automatically write the activity log and student notification.
        """
        # Ensure application exists and belongs to recruiter's job
        await self.get_application_detail(recruiter_id, application_id)

        valid_stages = ("applied", "screening", "interview", "offer", "hired", "rejected")
        if new_stage not in valid_stages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid stage '{new_stage}'. Must be one of: {', '.join(valid_stages)}."
            )

        client = await self._get_client()
        headers = self._get_headers()
        apps_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/applications"

        payload = {
            "stage": new_stage,
            "stage_changed_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        resp = await client.patch(apps_url, params={"id": f"eq.{application_id}"}, json=payload, headers=headers)
        if resp.status_code not in (200, 204):
            logger.error("Failed to update application stage: %d %s", resp.status_code, resp.text)
            raise HTTPException(status_code=resp.status_code, detail="Unable to update application stage.")

        # If a recruiter note was attached, log it as an activity entry
        if notes and notes.strip():
            act_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/activity_logs"
            act_payload = {
                "application_id": application_id,
                "actor_id": recruiter_id,
                "event_type": "recruiter_note",
                "metadata": {"note": notes.strip(), "stage": new_stage}
            }
            await client.post(act_url, json=act_payload, headers=headers)

        return {"message": f"Application stage successfully updated to {new_stage}.", "stage": new_stage}

    # =========================================================================
    # 3. Interview Scheduling
    # =========================================================================

    async def get_recruiter_interviews(
        self,
        recruiter_id: str,
        status_filter: Optional[str] = None
    ) -> RecruiterInterviewListResponse:
        """
        Lists all interviews associated with job postings managed by the recruiter.
        """
        client = await self._get_client()
        headers = self._get_headers()

        # Step 1: Identify all jobs owned by recruiter
        jobs_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/jobs"
        jobs_resp = await client.get(jobs_url, params={"recruiter_id": f"eq.{recruiter_id}", "select": "id,title,company"}, headers=headers)
        jobs_data = jobs_resp.json() if jobs_resp.status_code == 200 else []
        if not jobs_data:
            return RecruiterInterviewListResponse(items=[], total=0)

        job_map = {j["id"]: j for j in jobs_data}

        # Step 2: Identify applications for these jobs
        apps_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/applications"
        apps_resp = await client.get(apps_url, params={"job_id": f"in.({','.join(job_map.keys())})", "select": "id,job_id,student_id"}, headers=headers)
        apps_data = apps_resp.json() if apps_resp.status_code == 200 else []
        if not apps_data:
            return RecruiterInterviewListResponse(items=[], total=0)

        app_map = {a["id"]: a for a in apps_data}
        student_ids = list({a["student_id"] for a in apps_data})

        # Step 3: Fetch student names
        prof_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/profiles"
        prof_resp = await client.get(prof_url, params={"id": f"in.({','.join(student_ids)})", "select": "id,full_name"}, headers=headers)
        name_map = {p["id"]: p.get("full_name", "Student") for p in (prof_resp.json() if prof_resp.status_code == 200 else [])}

        # Step 4: Fetch interviews
        int_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/interviews"
        int_params: Dict[str, Any] = {
            "application_id": f"in.({','.join(app_map.keys())})",
            "order": "scheduled_at.asc",
            "select": "*"
        }
        if status_filter:
            int_params["status"] = f"eq.{status_filter}"

        int_resp = await client.get(int_url, params=int_params, headers=headers)
        int_data = int_resp.json() if int_resp.status_code == 200 else []

        results: List[RecruiterInterviewItem] = []
        for item in int_data:
            aid = item["application_id"]
            app_info = app_map.get(aid, {})
            jid = app_info.get("job_id")
            job_info = job_map.get(jid, {})
            sid = app_info.get("student_id")

            results.append(RecruiterInterviewItem(
                id=item["id"],
                application_id=aid,
                job_id=jid or "",
                job_title=job_info.get("title", "Job Posting"),
                job_company=job_info.get("company", "Company"),
                student_id=sid or "",
                student_name=name_map.get(sid, "Candidate"),
                student_email="",
                scheduled_at=item["scheduled_at"],
                timezone=item.get("timezone", "UTC"),
                interview_format=item.get("interview_format", "video"),
                status=item.get("status", "scheduled"),
                meeting_link=item.get("meeting_link"),
                feedback=item.get("feedback"),
                created_at=item["created_at"],
                updated_at=item.get("updated_at")
            ))

        return RecruiterInterviewListResponse(items=results, total=len(results))

    async def schedule_interview(
        self,
        recruiter_id: str,
        data: CreateInterviewRequest
    ) -> RecruiterInterviewItem:
        """
        Schedules a new interview round. Enforces job ownership on the application.
        Automatically updates application stage to 'interview' and logs notification.
        """
        app_detail = await self.get_application_detail(recruiter_id, data.application_id)

        client = await self._get_client()
        headers = self._get_headers()
        int_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/interviews"

        payload = {
            "application_id": data.application_id,
            "scheduled_at": data.scheduled_at.isoformat(),
            "timezone": data.timezone,
            "interview_format": data.interview_format,
            "status": "scheduled",
            "meeting_link": data.meeting_link.strip() if data.meeting_link else None,
            "feedback": data.feedback.strip() if data.feedback else None,
        }

        resp = await client.post(int_url, json=payload, headers=headers)
        if resp.status_code not in (200, 201):
            logger.error("Failed to schedule interview: %d %s", resp.status_code, resp.text)
            raise HTTPException(status_code=resp.status_code, detail="Failed to schedule interview round.")

        created = resp.json()[0]

        # Advance stage to 'interview' if currently in early stages
        if data.advance_stage and app_detail.stage in ("applied", "screening"):
            await self.update_application_stage(recruiter_id, data.application_id, "interview", "Stage advanced on scheduling interview.")

        # Notification for candidate
        notif_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/notifications"
        notif_payload = {
            "recipient_id": app_detail.student_id,
            "notification_type": "interview_scheduled",
            "title": f"Interview Scheduled: {app_detail.job_title}",
            "message": f"Your {data.interview_format} interview for {app_detail.job_title} at {app_detail.job_company} is scheduled for {data.scheduled_at.strftime('%B %d, %Y at %I:%M %p')} ({data.timezone}).",
            "related_application_id": data.application_id
        }
        await client.post(notif_url, json=notif_payload, headers=headers)

        return RecruiterInterviewItem(
            id=created["id"],
            application_id=data.application_id,
            job_id=app_detail.job_id,
            job_title=app_detail.job_title,
            job_company=app_detail.job_company,
            student_id=app_detail.student_id,
            student_name=app_detail.student_name,
            student_email="",
            scheduled_at=created["scheduled_at"],
            timezone=created.get("timezone", "UTC"),
            interview_format=created.get("interview_format", "video"),
            status=created.get("status", "scheduled"),
            meeting_link=created.get("meeting_link"),
            feedback=created.get("feedback"),
            created_at=created["created_at"],
            updated_at=created.get("updated_at")
        )

    async def update_interview(
        self,
        recruiter_id: str,
        interview_id: str,
        data: UpdateInterviewRequest
    ) -> Dict[str, Any]:
        """
        Updates interview schedule, status (completed/cancelled), meeting link, or feedback.
        Enforces recruiter ownership.
        """
        client = await self._get_client()
        headers = self._get_headers()

        # Step 1: Fetch interview
        int_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/interviews"
        int_resp = await client.get(int_url, params={"id": f"eq.{interview_id}", "select": "*"}, headers=headers)
        if int_resp.status_code != 200 or not int_resp.json():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview round not found.")

        interview = int_resp.json()[0]

        # Step 2: Verify ownership of related application
        app_detail = await self.get_application_detail(recruiter_id, interview["application_id"])

        payload: Dict[str, Any] = {}
        if data.scheduled_at is not None:
            payload["scheduled_at"] = data.scheduled_at.isoformat()
        if data.timezone is not None:
            payload["timezone"] = data.timezone
        if data.interview_format is not None:
            payload["interview_format"] = data.interview_format
        if data.status is not None:
            payload["status"] = data.status
        if data.meeting_link is not None:
            payload["meeting_link"] = data.meeting_link.strip() if data.meeting_link else None
        if data.feedback is not None:
            payload["feedback"] = data.feedback.strip() if data.feedback else None

        if not payload:
            return {"message": "No changes submitted.", "id": interview_id}

        resp = await client.patch(int_url, params={"id": f"eq.{interview_id}"}, json=payload, headers=headers)
        if resp.status_code not in (200, 204):
            logger.error("Failed to update interview: %d %s", resp.status_code, resp.text)
            raise HTTPException(status_code=resp.status_code, detail="Unable to update interview.")

        # Notify student if rescheduled, cancelled, completed, or feedback recorded
        if data.status in ("cancelled", "rescheduled") or data.scheduled_at is not None:
            notif_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/notifications"
            status_text = data.status or "rescheduled"
            notif_payload = {
                "recipient_id": app_detail.student_id,
                "notification_type": f"interview_{status_text}",
                "title": f"Interview {status_text.capitalize()}: {app_detail.job_title}",
                "message": f"Your interview for {app_detail.job_title} has been updated to: {status_text}.",
                "related_application_id": app_detail.id
            }
            await client.post(notif_url, json=notif_payload, headers=headers)
        elif data.status == "completed":
            notif_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/notifications"
            notif_payload = {
                "recipient_id": app_detail.student_id,
                "notification_type": "interview_completed",
                "title": f"Interview Completed: {app_detail.job_title}",
                "message": f"Your interview round for {app_detail.job_title} at {app_detail.job_company} was marked as completed.",
                "related_application_id": app_detail.id
            }
            await client.post(notif_url, json=notif_payload, headers=headers)
        elif data.feedback and data.feedback.strip():
            notif_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/notifications"
            notif_payload = {
                "recipient_id": app_detail.student_id,
                "notification_type": "interview_feedback",
                "title": f"Interview Feedback Recorded: {app_detail.job_title}",
                "message": f"Evaluation feedback has been recorded for your interview round on {app_detail.job_title}.",
                "related_application_id": app_detail.id
            }
            await client.post(notif_url, json=notif_payload, headers=headers)

        return {"message": "Interview round updated successfully.", "id": interview_id, "status": payload.get("status", interview.get("status"))}

    # =========================================================================
    # 4. Recruiter Dashboard Overview
    # =========================================================================

    async def get_recruiter_dashboard_stats(self, recruiter_id: str) -> RecruiterDashboardStatsResponse:
        """
        Aggregates enterprise workspace metrics, recent candidate applications,
        upcoming scheduled interview rounds, stage distribution, and top follow-up alerts.
        """
        # Fetch jobs
        jobs_res = await self.get_recruiter_jobs(recruiter_id)
        total_jobs = len(jobs_res.items)
        active_jobs = sum(1 for j in jobs_res.items if j.status == "published")

        # Fetch applications
        apps_res = await self.get_recruiter_applications(recruiter_id)
        total_applicants = len(apps_res.items)
        pending_reviews = sum(1 for a in apps_res.items if a.stage in ("applied", "screening"))

        stage_dist: Dict[str, int] = {
            "applied": 0,
            "screening": 0,
            "interview": 0,
            "offer": 0,
            "hired": 0,
            "rejected": 0,
        }
        for a in apps_res.items:
            if a.stage in stage_dist:
                stage_dist[a.stage] += 1

        # Fetch interviews
        int_res = await self.get_recruiter_interviews(recruiter_id)
        scheduled_interviews = sum(1 for i in int_res.items if i.status == "scheduled")
        interviews_awaiting_feedback = sum(
            1 for i in int_res.items
            if i.status == "completed" and (not i.feedback or not i.feedback.strip())
        )

        # Upcoming interviews (scheduled and in future or today)
        upcoming = [i for i in int_res.items if i.status in ("scheduled", "rescheduled")][:5]
        recent_apps = apps_res.items[:5]

        # Top follow-up alerts from FollowUpService
        from app.services.follow_up_service import follow_up_service
        top_follow_ups = []
        stale_count = 0
        try:
            fu_res = await follow_up_service.get_recruiter_follow_ups(recruiter_id)
            top_follow_ups = fu_res.items[:5]
            stale_count = fu_res.stale_applications_count
        except Exception as e:
            logger.warning("Could not load recruiter follow-ups for dashboard: %s", str(e))

        return RecruiterDashboardStatsResponse(
            total_jobs=total_jobs,
            active_jobs=active_jobs,
            total_applicants=total_applicants,
            pending_reviews=pending_reviews,
            scheduled_interviews=scheduled_interviews,
            recent_applications=recent_apps,
            upcoming_interviews=upcoming,
            interviews_awaiting_feedback=interviews_awaiting_feedback,
            stale_applications_count=stale_count,
            stage_distribution=stage_dist,
            top_follow_ups=top_follow_ups,
        )


# Singleton recruiter service instance
recruiter_service = RecruiterService()
