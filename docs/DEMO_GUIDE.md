# HireFlow — Recruiter & Interviewer Demo Guide
### 2 to 3-Minute Live Walkthrough of Key Capabilities & Technical Highlights

This guide provides an effective, high-impact demonstration sequence designed for technical recruiters, hiring managers, and portfolio reviewers. It highlights HireFlow's architecture, security boundaries, and user workflows in under three minutes.

---

## Quick Reference Links
- **Live Frontend**: [https://hire-flow-beryl-one.vercel.app](https://hire-flow-beryl-one.vercel.app/)
- **Backend API**: [https://hireflow-giet.onrender.com](https://hireflow-giet.onrender.com/)
- **Interactive Swagger Docs**: [https://hireflow-giet.onrender.com/docs](https://hireflow-giet.onrender.com/docs)
- **API Health Check**: [https://hireflow-giet.onrender.com/health](https://hireflow-giet.onrender.com/health)

---

## 2-to-3 Minute Walkthrough Sequence

```mermaid
timeline
    title 3-Minute Demo Timeline
    00:00 - 00:30 : 1. Architecture & Role Separation : Public Landing, System Health Badge, Gated Recruiter Sign-in
    00:30 - 01:15 : 2. Student Discovery & Matching : Job Listings, Transparent 0-100 Match Scorecards, Profile Gap Analysis
    01:15 - 01:45 : 3. Resume Intelligence : Ephemeral PDF Parsing, Skill Extraction, Scanned PDF Guardrail
    01:45 - 02:15 : 4. Recruiter Pipeline & Follow-up : Applicant Pipeline Stages, Overdue Actions, On-Demand Reminder Scan
    02:15 - 03:00 : 5. Engineering Rigor & Roadmap : 69 Pytest Tests, Vitest Regressions, Strict RLS, Future Enhancements
```

---

### Segment 1: Public Landing & Zero-Trust Architecture (0:00 – 0:30)
1. **Show the Landing Page** ([https://hire-flow-beryl-one.vercel.app](https://hire-flow-beryl-one.vercel.app/)):
   - Note the real-time backend operational pill communicating with the FastAPI health check.
   - Explain the two distinct user personas: **Students** and **Recruiters**.
2. **Demonstrate Strict Role Separation**:
   - Navigate to `/recruiter/login`.
   - Point out the security warning: public self-service signup exclusively provisions `student` accounts. Even if an attacker injects `role: "recruiter"` into user metadata, the PostgreSQL trigger `handle_new_auth_user()` unconditionally forces `student`.
   - Recruiter accounts can only be provisioned through explicit database admin approval (`database/provision_recruiter.sql`).

---

### Segment 2: Student Job Discovery & Deterministic Matching (0:30 – 1:15)
1. **Explore Jobs** (`/student/jobs`):
   - Show the published job cards with work-mode badges (Remote, Hybrid, Onsite) and required skill tags.
2. **Open a Job Detail & Scorecard** (Click *View Details & Match*):
   - Highlight the **Deterministic 0–100 Match Score**.
   - Explain that this is calculated by the FastAPI backend (`backend/app/services/matching_service.py`), not a generative hallucination:
     - **Required Skills Overlap (50 pts)** with alias normalization (e.g., `React.js` &rarr; `React`, `TS` &rarr; `TypeScript`).
     - **Role/Specialization Alignment (20 pts)**.
     - **Location & Work Mode (15 pts)**.
     - **Experience Level (15 pts)**.
   - Show the **Matched Skills** vs. **Missing Requirements** breakdown and the transparent evaluation factors explaining *why* the candidate received that score.
   - Emphasize the **Decision-Support Notice**: the score assists human evaluation and never automatically rejects candidates.

---

### Segment 3: Resume Intelligence & Tailoring (1:15 – 1:45)
1. **Candidate Profile & Private Resume Vault** (`/student/profile`):
   - Candidate resumes are uploaded to a private Supabase Storage bucket (`resumes/{student_id}/resume.pdf`).
   - Downloads require time-limited signed URLs (300-second expiration) and are restricted by PostgreSQL Row Level Security (RLS) to the candidate owner and assigned recruiters.
2. **Resume Analysis & Scanned Document Guardrail** (`/student/resume-analysis`):
   - Explain the in-house pure-Python extraction engine (`pypdf`): no paid third-party AI APIs required, text is parsed ephemerally in-memory and never permanently stored.
   - Mention the guardrail: scanned image-only PDFs with < 40 extracted characters are automatically flagged with actionable advice to upload searchable text.

---

### Segment 4: Recruiter Pipeline & Follow-up Center (1:45 – 2:15)
1. **Recruiter Workspace & Pipeline Management**:
   - Recruiters view only candidates who applied to their own job openings (enforced by backend ownership checks and RLS).
   - Moving candidates across pipeline stages (`applied` &rarr; `screening` &rarr; `interview` &rarr; `offer` &rarr; `hired`/`rejected`) triggers automated audit activity logs and student in-app notifications.
2. **Follow-up Intelligence Center**:
   - Surfaces unreviewed applications, overdue stage transitions, and interviews scheduled within the next 24–48 hours.
   - Recruiters can trigger the idempotent interview reminder scanner directly from the dashboard (`POST /api/recruiter/follow-ups/process-reminders`).

---

### Segment 5: Engineering Rigor & Future Roadmap (2:15 – 3:00)
1. **Quality & Test Coverage**:
   - **Backend**: 69 passing pytest tests covering authentication, RBAC boundaries, matching scoring math, PDF parsing, corruption handling, and reminder idempotency.
   - **Frontend**: Vitest test suite verifying student auth and navigation regressions + zero-warning TypeScript compilation (`tsc && vite build`).
2. **Honest Limitations & Next Steps**:
   - Automatic interview reminders currently run via manual on-demand trigger or CLI/cron (not a costly 24/7 background worker).
   - Notifications are currently in-app (planned: email/SMS provider via SendGrid/Twilio).
   - Planned: OCR for scanned PDFs, Google Calendar two-way synchronization.
