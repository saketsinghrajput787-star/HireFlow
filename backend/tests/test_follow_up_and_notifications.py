"""
Unit & Integration Tests for HireFlow Phase 4C & 4D:
- Student Notification Center (Mark all as read, application_submitted notifications)
- Recruiter Follow-up Center (Stale applications, upcoming interviews, pending feedback, low-applicant jobs)
- Interview Reminder Lifecycle (48h reminder window, cancelled exclusion, idempotency/no duplicates)
- Dashboard Hiring Insights (Stage distribution, recommended jobs, recruiter follow-ups)
- Authorization and Data Isolation boundaries
"""

import pytest
import datetime
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.services.follow_up_service import follow_up_service, FollowUpService
from app.schemas.auth import UserProfileResponse


@pytest.fixture
def test_client():
    return TestClient(app)


@pytest.fixture
def mock_student_user():
    return UserProfileResponse(
        id="student-uuid-1111",
        email="student@hireflow.test",
        full_name="Jane Student",
        role="student",
        is_active=True,
        created_at=datetime.datetime.now(datetime.timezone.utc).isoformat()
    )


@pytest.fixture
def mock_recruiter_user():
    return UserProfileResponse(
        id="recruiter-uuid-9999",
        email="recruiter@enterprise.test",
        full_name="Alex Recruiter",
        role="recruiter",
        is_active=True,
        created_at=datetime.datetime.now(datetime.timezone.utc).isoformat()
    )


# =============================================================================
# 1. Student Notification Center & Mark All As Read
# =============================================================================

@pytest.mark.asyncio
async def test_mark_all_notifications_read(mock_student_user):
    """Verifies student can mark all unread notifications as read."""
    from app.services.student_service import student_service

    mock_resp = MagicMock()
    mock_resp.status_code = 200

    mock_client = AsyncMock()
    mock_client.patch.return_value = mock_resp

    with patch.object(student_service, "_get_client", return_value=mock_client):
        success = await student_service.mark_all_notifications_read(mock_student_user.id)
        assert success is True

        # Verify patch was called with read_at=is.null filter
        call_url = mock_client.patch.call_args[0][0]
        assert f"recipient_id=eq.{mock_student_user.id}" in call_url
        assert "read_at=is.null" in call_url


def test_mark_all_notifications_read_api(test_client, mock_student_user):
    """Tests POST /api/student/notifications/read-all endpoint."""
    from app.api.deps import require_student

    app.dependency_overrides[require_student] = lambda: mock_student_user

    with patch("app.services.student_service.student_service.mark_all_notifications_read", new_callable=AsyncMock) as mock_mark:
        mock_mark.return_value = True

        resp = test_client.post("/api/student/notifications/read-all")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "All notifications marked as read" in data["message"]
        mock_mark.assert_called_once_with(mock_student_user.id)

    app.dependency_overrides.clear()


# =============================================================================
# 2. Recruiter Follow-up Center Aggregation
# =============================================================================

@pytest.mark.asyncio
async def test_recruiter_follow_ups_categories(mock_recruiter_user):
    """
    Tests that follow-up service categorizes stale applications,
    upcoming interviews within 48h, completed interviews with pending feedback,
    and low-applicant jobs accurately.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    stale_app_date = (now - datetime.timedelta(days=6)).isoformat()
    recent_app_date = (now - datetime.timedelta(hours=6)).isoformat()
    upcoming_iv_date = (now + datetime.timedelta(hours=18)).isoformat()
    past_iv_date = (now - datetime.timedelta(days=2)).isoformat()

    # Mock jobs
    jobs = [
        {
            "id": "job-1",
            "recruiter_id": mock_recruiter_user.id,
            "title": "Full Stack Engineer",
            "company": "Tech Corp",
            "status": "published",
            "created_at": (now - datetime.timedelta(days=10)).isoformat(),
        },
        {
            "id": "job-low",
            "recruiter_id": mock_recruiter_user.id,
            "title": "DevOps Architect",
            "company": "Tech Corp",
            "status": "published",
            "created_at": (now - datetime.timedelta(days=5)).isoformat(),
        }
    ]

    # Mock applications
    apps = [
        # Job 1 has 2 applicants: 1 new, 1 stale
        {
            "id": "app-new",
            "job_id": "job-1",
            "student_id": "cand-1",
            "stage": "applied",
            "applied_at": recent_app_date,
            "stage_changed_at": recent_app_date,
            "profiles": {"full_name": "Alice New", "email": "alice@test.com"},
        },
        {
            "id": "app-stale",
            "job_id": "job-1",
            "student_id": "cand-2",
            "stage": "screening",
            "applied_at": stale_app_date,
            "stage_changed_at": stale_app_date,
            "profiles": {"full_name": "Bob Stale", "email": "bob@test.com"},
        },
        # Job-low has 0 applications
    ]

    # Mock interviews
    interviews = [
        {
            "id": "iv-upcoming",
            "application_id": "app-new",
            "scheduled_at": upcoming_iv_date,
            "timezone": "UTC",
            "interview_format": "video",
            "status": "scheduled",
            "meeting_link": "https://meet.google.com/test",
            "feedback": None,
        },
        {
            "id": "iv-feedback-pending",
            "application_id": "app-stale",
            "scheduled_at": past_iv_date,
            "timezone": "UTC",
            "interview_format": "video",
            "status": "completed",
            "meeting_link": "https://meet.google.com/test",
            "feedback": "",  # Empty feedback!
        }
    ]

    fu_service = FollowUpService()

    async def mock_get(url, *args, **kwargs):
        resp = MagicMock()
        resp.status_code = 200
        if "jobs?recruiter_id=" in url:
            resp.json.return_value = jobs
        elif "applications?job_id=" in url:
            resp.json.return_value = apps
        elif "interviews?application_id=" in url:
            resp.json.return_value = interviews
        else:
            resp.json.return_value = []
        return resp

    mock_client = AsyncMock()
    mock_client.get.side_effect = mock_get

    with patch.object(fu_service, "_get_client", return_value=mock_client):
        res = await fu_service.get_recruiter_follow_ups(mock_recruiter_user.id)

        assert res.total_count > 0
        categories = {item.category for item in res.items}

        assert "new_application" in categories
        assert "stale_application" in categories
        assert "upcoming_interview" in categories
        assert "interview_feedback_pending" in categories
        assert "low_applicant_job" in categories

        # Check upcoming interview is high severity because hours <= 24
        up_item = next(i for i in res.items if i.category == "upcoming_interview")
        assert up_item.severity == "high"

        # Check feedback pending item
        fb_item = next(i for i in res.items if i.category == "interview_feedback_pending")
        assert fb_item.severity == "high"
        assert "feedback is still empty" in fb_item.reason

        # Check low applicant job
        low_job = next(i for i in res.items if i.category == "low_applicant_job")
        assert low_job.job_id == "job-low"


# =============================================================================
# 3. Interview Reminder Lifecycle & Idempotency
# =============================================================================

@pytest.mark.asyncio
async def test_interview_reminder_lifecycle_idempotency():
    """
    Tests that:
    1. Upcoming interviews within 48h generate reminder notification.
    2. Repeated run does NOT create duplicate reminders (idempotency).
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    in_24h = (now + datetime.timedelta(hours=24)).isoformat()

    interviews = [
        {
            "id": "iv-101",
            "application_id": "app-101",
            "scheduled_at": in_24h,
            "timezone": "UTC",
            "interview_format": "video",
            "meeting_link": "https://meet.google.com/test",
            "status": "scheduled",
        }
    ]

    app_data = [
        {
            "id": "app-101",
            "student_id": "student-101",
            "jobs": {
                "title": "Backend Developer",
                "company": "Cloud Inc",
                "recruiter_id": "recruiter-1",
            }
        }
    ]

    fu_service = FollowUpService()
    inserted_notifications = []

    async def mock_get(url, *args, **kwargs):
        resp = MagicMock()
        resp.status_code = 200
        if "interviews?status=eq.scheduled" in url:
            resp.json.return_value = interviews
        elif "applications?id=eq.app-101" in url:
            resp.json.return_value = app_data
        elif "notifications?recipient_id=eq.student-101" in url and "notification_type=eq.interview_reminder" in url:
            # First run: empty; second run: contains inserted notification
            resp.json.return_value = inserted_notifications
        else:
            resp.json.return_value = []
        return resp

    async def mock_post(url, json=None, *args, **kwargs):
        resp = MagicMock()
        resp.status_code = 201
        if "notifications" in url and json:
            inserted_notifications.append(json)
        return resp

    mock_client = AsyncMock()
    mock_client.get.side_effect = mock_get
    mock_client.post.side_effect = mock_post

    with patch.object(fu_service, "_get_client", return_value=mock_client):
        # Run 1: Should send 1 reminder
        result1 = await fu_service.process_upcoming_interview_reminders()
        assert result1.reminders_sent == 1
        assert len(inserted_notifications) == 1
        assert inserted_notifications[0]["notification_type"] == "interview_reminder"
        assert inserted_notifications[0]["recipient_id"] == "student-101"

        # Run 2: Idempotent repeat run — must send 0 reminders!
        result2 = await fu_service.process_upcoming_interview_reminders()
        assert result2.reminders_sent == 0
        assert len(inserted_notifications) == 1  # No duplicate created!


# =============================================================================
# 4. Endpoints & Authorization Isolation
# =============================================================================

def test_recruiter_follow_ups_endpoint_rbac(test_client, mock_student_user):
    """Ensures students cannot access recruiter follow-up endpoints (403 Forbidden)."""
    from app.api.deps import get_current_user

    # When student is logged in, require_recruiter raises 403 Forbidden
    app.dependency_overrides[get_current_user] = lambda: mock_student_user

    resp = test_client.get("/api/recruiter/follow-ups")
    assert resp.status_code == 403
    assert "Access denied" in resp.json()["detail"]

    resp2 = test_client.post("/api/recruiter/follow-ups/process-reminders")
    assert resp2.status_code == 403

    app.dependency_overrides.clear()


def test_recruiter_dashboard_stats_enhanced(test_client, mock_recruiter_user):
    """Verifies recruiter dashboard returns stage_distribution and top_follow_ups."""
    from app.api.deps import require_recruiter

    app.dependency_overrides[require_recruiter] = lambda: mock_recruiter_user

    mock_stats = {
        "total_jobs": 3,
        "active_jobs": 2,
        "total_applicants": 8,
        "pending_reviews": 3,
        "scheduled_interviews": 2,
        "recent_applications": [],
        "upcoming_interviews": [],
        "interviews_awaiting_feedback": 1,
        "stale_applications_count": 2,
        "stage_distribution": {
            "applied": 3,
            "screening": 2,
            "interview": 2,
            "offer": 1,
            "hired": 0,
            "rejected": 0,
        },
        "top_follow_ups": [
            {
                "id": "fu-1",
                "category": "upcoming_interview",
                "severity": "high",
                "title": "Upcoming Interview: Jane Candidate",
                "reason": "Interview scheduled today",
                "suggested_action": "Review resume",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "target_link": "/recruiter/interviews",
            }
        ]
    }

    with patch("app.services.recruiter_service.recruiter_service.get_recruiter_dashboard_stats", new_callable=AsyncMock) as mock_get_stats:
        mock_get_stats.return_value = MagicMock(**mock_stats)

        resp = test_client.get("/api/recruiter/dashboard")
        assert resp.status_code == 200
        data = resp.json()
        assert data["interviews_awaiting_feedback"] == 1
        assert data["stale_applications_count"] == 2
        assert "stage_distribution" in data
        assert data["stage_distribution"]["applied"] == 3
        assert len(data["top_follow_ups"]) == 1

    app.dependency_overrides.clear()
