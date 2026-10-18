"""
HireFlow Follow-Up Intelligence & Interview Reminder Service — Phase 4C
Identifies actionable items for recruiters (stale applications, pending feedback,
upcoming interviews, low-applicant jobs) and coordinates the automated reminder lifecycle.
"""

import datetime
import logging
from typing import Dict, Any, List, Optional
import httpx
from fastapi import HTTPException, status
from app.core.config import settings
from app.schemas.follow_up import (
    FollowUpItem,
    RecruiterFollowUpCenterResponse,
    ProcessRemindersResult,
)

logger = logging.getLogger("hireflow.follow_up_service")

# Configurable business thresholds (in days)
THRESHOLD_APPLIED_STALE_DAYS = 3
THRESHOLD_SCREENING_STALE_DAYS = 5
THRESHOLD_INTERVIEW_STALE_DAYS = 5
THRESHOLD_OFFER_STALE_DAYS = 7
THRESHOLD_LOW_APPLICANT_JOB_DAYS = 3
THRESHOLD_LOW_APPLICANT_COUNT = 2


class FollowUpService:
    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=20.0)
        return self._client

    def _get_headers(self) -> Dict[str, str]:
        return {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

    # =========================================================================
    # 1. Recruiter Follow-up Center Aggregation
    # =========================================================================

    async def get_recruiter_follow_ups(self, recruiter_id: str) -> RecruiterFollowUpCenterResponse:
        """
        Aggregates actionable follow-up items for the authenticated recruiter.
        Enforces strict job ownership — only jobs and applications belonging to recruiter.
        """
        base_url = settings.SUPABASE_URL.rstrip('/')
        client = await self._get_client()
        headers = self._get_headers()
        now = datetime.datetime.now(datetime.timezone.utc)

        # 1. Fetch all jobs belonging to this recruiter
        jobs_res = await client.get(
            f"{base_url}/rest/v1/jobs?recruiter_id=eq.{recruiter_id}&select=id,title,company,status,created_at",
            headers=headers
        )
        if jobs_res.status_code != 200:
            logger.error("Failed to query recruiter jobs for follow-ups: %s", jobs_res.text)
            raise HTTPException(status_code=500, detail="Failed to fetch recruiter jobs.")

        jobs_list = jobs_res.json()
        if not jobs_list:
            return RecruiterFollowUpCenterResponse(
                items=[],
                total_count=0,
                high_priority_count=0,
                pending_reviews_count=0,
                stale_applications_count=0,
                upcoming_interviews_count=0,
                pending_feedback_count=0,
                low_applicant_jobs_count=0,
                generated_at=now.isoformat()
            )

        job_map = {j["id"]: j for j in jobs_list}
        job_ids = list(job_map.keys())

        # 2. Fetch all applications for these jobs
        job_ids_filter = f"in.({','.join(job_ids)})"
        apps_res = await client.get(
            f"{base_url}/rest/v1/applications?job_id={job_ids_filter}&select=id,job_id,student_id,stage,applied_at,stage_changed_at,profiles(full_name,email)",
            headers=headers
        )
        if apps_res.status_code != 200:
            logger.error("Failed to query applications for follow-ups: %s", apps_res.text)
            raise HTTPException(status_code=500, detail="Failed to fetch candidate applications.")

        apps_list = apps_res.json()
        app_map = {a["id"]: a for a in apps_list}
        app_ids = list(app_map.keys())

        # Count applicants per job for low applicant detection
        job_applicant_counts: Dict[str, int] = {jid: 0 for jid in job_ids}
        for a in apps_list:
            jid = a.get("job_id")
            if jid in job_applicant_counts:
                job_applicant_counts[jid] += 1

        # 3. Fetch all interviews for these applications
        interviews_list: List[Dict[str, Any]] = []
        if app_ids:
            app_ids_filter = f"in.({','.join(app_ids)})"
            int_res = await client.get(
                f"{base_url}/rest/v1/interviews?application_id={app_ids_filter}&select=id,application_id,scheduled_at,timezone,interview_format,status,meeting_link,feedback,created_at,updated_at",
                headers=headers
            )
            if int_res.status_code == 200:
                interviews_list = int_res.json()

        # Map interviews by application_id
        interviews_by_app: Dict[str, List[Dict[str, Any]]] = {}
        for iv in interviews_list:
            aid = iv.get("application_id")
            if aid not in interviews_by_app:
                interviews_by_app[aid] = []
            interviews_by_app[aid].append(iv)

        items: List[FollowUpItem] = []

        # ---------------------------------------------------------------------
        # Evaluation A & B: Applications (New reviews, Stale applications)
        # ---------------------------------------------------------------------
        for app in apps_list:
            app_id = app.get("id")
            job_id = app.get("job_id")
            job = job_map.get(job_id, {})
            student_profile = app.get("profiles") or {}
            cand_name = student_profile.get("full_name") or "Candidate"
            cand_email = student_profile.get("email") or ""
            stage = app.get("stage", "applied")
            applied_at_str = app.get("applied_at") or app.get("created_at")
            stage_changed_at_str = app.get("stage_changed_at") or applied_at_str

            applied_at = self._parse_iso(applied_at_str)
            stage_changed_at = self._parse_iso(stage_changed_at_str) or applied_at

            target_link = f"/recruiter/applicants?jobId={job_id}&appId={app_id}"

            # A: Newly submitted unreviewed applications
            if stage == "applied":
                days_since_applied = (now - applied_at).days if applied_at else 0
                if days_since_applied <= 2:
                    items.append(
                        FollowUpItem(
                            id=f"followup-new-app-{app_id}",
                            category="new_application",
                            severity="medium",
                            title=f"New Application: {cand_name}",
                            reason=f"Candidate submitted an application {days_since_applied} day{'s' if days_since_applied != 1 else ''} ago.",
                            suggested_action="Review candidate profile and resume to advance to screening or decline.",
                            candidate_id=app.get("student_id"),
                            candidate_name=cand_name,
                            candidate_email=cand_email,
                            job_id=job_id,
                            job_title=job.get("title", "Position"),
                            job_company=job.get("company", "Company"),
                            application_id=app_id,
                            application_stage=stage,
                            timestamp=applied_at.isoformat() if applied_at else now.isoformat(),
                            days_elapsed=days_since_applied,
                            target_link=target_link
                        )
                    )
                else:
                    # Stale applied application (overdue initial review)
                    items.append(
                        FollowUpItem(
                            id=f"followup-stale-applied-{app_id}",
                            category="stale_application",
                            severity="high" if days_since_applied >= 5 else "medium",
                            title=f"Review Pending: {cand_name}",
                            reason=f"Application has remained unreviewed in 'Applied' stage for {days_since_applied} days.",
                            suggested_action="Evaluate resume and screen candidate to keep hiring pipeline moving.",
                            candidate_id=app.get("student_id"),
                            candidate_name=cand_name,
                            candidate_email=cand_email,
                            job_id=job_id,
                            job_title=job.get("title", "Position"),
                            job_company=job.get("company", "Company"),
                            application_id=app_id,
                            application_stage=stage,
                            timestamp=applied_at.isoformat() if applied_at else now.isoformat(),
                            days_elapsed=days_since_applied,
                            target_link=target_link
                        )
                    )

            # B: Stale application in intermediate stages
            elif stage in ("screening", "interview", "offer"):
                days_in_stage = (now - stage_changed_at).days if stage_changed_at else 0
                threshold = (
                    THRESHOLD_SCREENING_STALE_DAYS if stage == "screening"
                    else THRESHOLD_INTERVIEW_STALE_DAYS if stage == "interview"
                    else THRESHOLD_OFFER_STALE_DAYS
                )
                if days_in_stage >= threshold:
                    items.append(
                        FollowUpItem(
                            id=f"followup-stale-stage-{app_id}",
                            category="stale_application",
                            severity="high" if days_in_stage >= threshold * 2 else "medium",
                            title=f"Stale in {stage.capitalize()}: {cand_name}",
                            reason=f"Candidate has remained in '{stage}' stage for {days_in_stage} days without updates.",
                            suggested_action=(
                                "Schedule interview round or update candidate status." if stage == "screening"
                                else "Review interview evaluations and decide next round or offer." if stage == "interview"
                                else "Follow up on offer acceptance or mark candidate as hired."
                            ),
                            candidate_id=app.get("student_id"),
                            candidate_name=cand_name,
                            candidate_email=cand_email,
                            job_id=job_id,
                            job_title=job.get("title", "Position"),
                            job_company=job.get("company", "Company"),
                            application_id=app_id,
                            application_stage=stage,
                            timestamp=stage_changed_at.isoformat() if stage_changed_at else now.isoformat(),
                            days_elapsed=days_in_stage,
                            target_link=target_link
                        )
                    )

        # ---------------------------------------------------------------------
        # Evaluation C & D: Interviews (Upcoming 24-48h, Pending Feedback)
        # ---------------------------------------------------------------------
        for iv in interviews_list:
            iv_id = iv.get("id")
            aid = iv.get("application_id")
            app = app_map.get(aid, {})
            job = job_map.get(app.get("job_id"), {})
            student_profile = app.get("profiles") or {}
            cand_name = student_profile.get("full_name") or "Candidate"
            cand_email = student_profile.get("email") or ""
            iv_status = iv.get("status", "scheduled")
            sched_at = self._parse_iso(iv.get("scheduled_at"))
            feedback = (iv.get("feedback") or "").strip()

            target_link = "/recruiter/interviews"

            # C: Upcoming interviews (within next 48h)
            if iv_status in ("scheduled", "rescheduled") and sched_at:
                seconds_diff = (sched_at - now).total_seconds()
                hours_diff = seconds_diff / 3600.0
                if 0 <= hours_diff <= 48:
                    severity = "high" if hours_diff <= 24 else "medium"
                    time_label = "today" if hours_diff <= 12 else f"in {int(hours_diff)} hours"
                    items.append(
                        FollowUpItem(
                            id=f"followup-upcoming-interview-{iv_id}",
                            category="upcoming_interview",
                            severity=severity,
                            title=f"Upcoming Interview: {cand_name}",
                            reason=f"{iv.get('interview_format', 'video').capitalize()} interview is scheduled {time_label} ({sched_at.strftime('%b %d at %I:%M %p')}).",
                            suggested_action="Review resume and match report, and verify meeting link.",
                            candidate_id=app.get("student_id"),
                            candidate_name=cand_name,
                            candidate_email=cand_email,
                            job_id=app.get("job_id"),
                            job_title=job.get("title", "Position"),
                            job_company=job.get("company", "Company"),
                            application_id=aid,
                            application_stage=app.get("stage"),
                            interview_id=iv_id,
                            timestamp=sched_at.isoformat(),
                            days_elapsed=0,
                            target_link=target_link
                        )
                    )

            # D: Completed interviews with pending feedback
            elif iv_status == "completed" and not feedback and sched_at:
                days_since_iv = max(0, (now - sched_at).days)
                items.append(
                    FollowUpItem(
                        id=f"followup-feedback-pending-{iv_id}",
                        category="interview_feedback_pending",
                        severity="high",
                        title=f"Feedback Needed: {cand_name}",
                        reason=f"Interview was completed {days_since_iv} day{'s' if days_since_iv != 1 else ''} ago, but evaluation feedback is still empty.",
                        suggested_action="Submit interviewer evaluation and scorecard to finalize application stage decision.",
                        candidate_id=app.get("student_id"),
                        candidate_name=cand_name,
                        candidate_email=cand_email,
                        job_id=app.get("job_id"),
                        job_title=job.get("title", "Position"),
                        job_company=job.get("company", "Company"),
                        application_id=aid,
                        application_stage=app.get("stage"),
                        interview_id=iv_id,
                        timestamp=sched_at.isoformat(),
                        days_elapsed=days_since_iv,
                        target_link=target_link
                    )
                )

        # ---------------------------------------------------------------------
        # Evaluation E: Low applicant count published jobs
        # ---------------------------------------------------------------------
        for jid, count in job_applicant_counts.items():
            job = job_map.get(jid, {})
            if job.get("status") == "published":
                created_at = self._parse_iso(job.get("created_at"))
                days_live = (now - created_at).days if created_at else 0
                if days_live >= THRESHOLD_LOW_APPLICANT_JOB_DAYS and count < THRESHOLD_LOW_APPLICANT_COUNT:
                    items.append(
                        FollowUpItem(
                            id=f"followup-low-app-{jid}",
                            category="low_applicant_job",
                            severity="low",
                            title=f"Low Applicant Volume: {job.get('title')}",
                            reason=f"Job has been published for {days_live} days but received only {count} applicant{'s' if count != 1 else ''}.",
                            suggested_action="Review required skills, location options, or job description to improve candidate reach.",
                            candidate_id=None,
                            candidate_name=None,
                            candidate_email=None,
                            job_id=jid,
                            job_title=job.get("title", "Position"),
                            job_company=job.get("company", "Company"),
                            application_id=None,
                            application_stage=None,
                            interview_id=None,
                            timestamp=created_at.isoformat() if created_at else now.isoformat(),
                            days_elapsed=days_live,
                            target_link=f"/recruiter/jobs"
                        )
                    )

        # Sort items: High priority first, then medium, then low; tie-breaker: days_elapsed desc
        severity_order = {"high": 0, "medium": 1, "low": 2}
        items.sort(key=lambda x: (severity_order.get(x.severity, 3), -(x.days_elapsed or 0)))

        # Aggregate counts
        high_cnt = sum(1 for i in items if i.severity == "high")
        pending_rev_cnt = sum(1 for i in items if i.category in ("new_application", "stale_application") and i.application_stage == "applied")
        stale_apps_cnt = sum(1 for i in items if i.category == "stale_application")
        upcoming_iv_cnt = sum(1 for i in items if i.category == "upcoming_interview")
        pending_fb_cnt = sum(1 for i in items if i.category == "interview_feedback_pending")
        low_app_cnt = sum(1 for i in items if i.category == "low_applicant_job")

        return RecruiterFollowUpCenterResponse(
            items=items,
            total_count=len(items),
            high_priority_count=high_cnt,
            pending_reviews_count=pending_rev_cnt,
            stale_applications_count=stale_apps_cnt,
            upcoming_interviews_count=upcoming_iv_cnt,
            pending_feedback_count=pending_fb_cnt,
            low_applicant_jobs_count=low_app_cnt,
            generated_at=now.isoformat()
        )

    # =========================================================================
    # 2. Automated Interview Reminder Lifecycle (Idempotent)
    # =========================================================================

    async def process_upcoming_interview_reminders(
        self,
        recruiter_id: Optional[str] = None
    ) -> ProcessRemindersResult:
        """
        Idempotent background processor for upcoming interview reminders.
        Finds scheduled interviews occurring within the next 48 hours and creates
        an in-app candidate notification if one has not already been sent.
        """
        base_url = settings.SUPABASE_URL.rstrip('/')
        client = await self._get_client()
        headers = self._get_headers()
        now = datetime.datetime.now(datetime.timezone.utc)
        in_48h = now + datetime.timedelta(hours=48)

        reminders_sent = 0
        interviews_processed = 0
        errors: List[str] = []

        try:
            # Query upcoming scheduled interviews using URL-safe UTC ISO format
            now_iso_z = now.strftime("%Y-%m-%dT%H:%M:%SZ")
            in_48h_iso_z = in_48h.strftime("%Y-%m-%dT%H:%M:%SZ")
            int_url = f"{base_url}/rest/v1/interviews?status=eq.scheduled&scheduled_at=gte.{now_iso_z}&scheduled_at=lte.{in_48h_iso_z}&select=id,application_id,scheduled_at,timezone,interview_format,meeting_link"
            int_res = await client.get(int_url, headers=headers)
            if int_res.status_code != 200:
                logger.error("Failed to query upcoming interviews: %s", int_res.text)
                return ProcessRemindersResult(
                    reminders_sent=0,
                    interviews_processed=0,
                    errors=[f"Database query failed: {int_res.text}"],
                    message="Failed to query upcoming interviews."
                )

            interviews = int_res.json()
            interviews_processed = len(interviews)

            for iv in interviews:
                app_id = iv.get("application_id")
                if not app_id:
                    continue

                # Query application details with job and candidate info
                app_res = await client.get(
                    f"{base_url}/rest/v1/applications?id=eq.{app_id}&select=id,student_id,jobs(title,company,recruiter_id)",
                    headers=headers
                )
                if app_res.status_code != 200 or not app_res.json():
                    continue

                app_data = app_res.json()[0]
                student_id = app_data.get("student_id")
                job_data = app_data.get("jobs") or {}

                # If recruiter_id was provided, enforce ownership filter
                if recruiter_id and job_data.get("recruiter_id") != recruiter_id:
                    continue

                # IDEMPOTENCY CHECK: Check if an 'interview_reminder' notification already exists
                notif_check = await client.get(
                    f"{base_url}/rest/v1/notifications?recipient_id=eq.{student_id}&related_application_id=eq.{app_id}&notification_type=eq.interview_reminder",
                    headers=headers
                )
                if notif_check.status_code == 200 and len(notif_check.json()) > 0:
                    # Reminder already sent for this interview/application; skip to prevent duplication
                    continue

                # Format friendly interview date
                sched_dt = self._parse_iso(iv.get("scheduled_at"))
                tz_str = iv.get("timezone", "UTC")
                date_str = sched_dt.strftime("%A, %B %d at %I:%M %p") if sched_dt else "Upcoming"
                format_str = iv.get("interview_format", "video").capitalize()
                job_title = job_data.get("title", "Position")
                company_name = job_data.get("company", "Company")

                notif_payload = {
                    "recipient_id": student_id,
                    "notification_type": "interview_reminder",
                    "title": f"Upcoming Interview Reminder: {job_title}",
                    "message": f"Reminder: Your {format_str} interview for {job_title} at {company_name} is scheduled for {date_str} ({tz_str}).",
                    "related_application_id": app_id,
                }

                ins_res = await client.post(
                    f"{base_url}/rest/v1/notifications",
                    headers=headers,
                    json=notif_payload
                )
                if ins_res.status_code in (200, 201):
                    reminders_sent += 1
                else:
                    logger.warning("Failed to insert interview reminder: %s", ins_res.text)
                    errors.append(f"Failed for app {app_id}: {ins_res.text}")

        except Exception as e:
            logger.exception("Error in process_upcoming_interview_reminders: %s", str(e))
            errors.append(str(e))

        return ProcessRemindersResult(
            reminders_sent=reminders_sent,
            interviews_processed=interviews_processed,
            errors=errors,
            message=f"Processed {interviews_processed} upcoming interviews; dispatched {reminders_sent} reminder notifications."
        )

    @staticmethod
    def _parse_iso(iso_str: Optional[str]) -> Optional[datetime.datetime]:
        if not iso_str:
            return None
        try:
            return datetime.datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        except Exception:
            return None


# Singleton instance
follow_up_service = FollowUpService()


if __name__ == "__main__":
    import asyncio
    logging.basicConfig(level=logging.INFO)
    print("Initiating automated interview reminder lifecycle scan...")
    result = asyncio.run(follow_up_service.process_upcoming_interview_reminders())
    print(f"Result: {result.message} (Reminders sent: {result.reminders_sent}, Processed: {result.interviews_processed})")
