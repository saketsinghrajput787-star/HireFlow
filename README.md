# HireFlow — Modern Applicant Tracking System (ATS)
### Enterprise Talent Acquisition Platform with Smart Matching, Resume Intelligence & Follow-up Automation

[![Backend Tests](https://img.shields.io/badge/pytest-66%20passed-brightgreen.svg)](backend/tests)
[![TypeScript Build](https://img.shields.io/badge/TypeScript-clean%20build-blue.svg)](frontend)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](backend)
[![React](https://img.shields.io/badge/React-18.3+-61dafb.svg)](frontend)
[![Vite](https://img.shields.io/badge/Vite-6.4+-646CFF.svg)](frontend)
[![PostgreSQL RLS](https://img.shields.io/badge/PostgreSQL-RLS%20Hardened-336791.svg)](database/migrations)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](backend)

---

## 1. Project Overview

**HireFlow** is a modern, enterprise-grade Applicant Tracking System (ATS) engineered to connect student talent with corporate hiring teams. Designed around strict security isolation, privacy-first resume parsing, and deterministic candidate-job matching, HireFlow empowers candidates to discover opportunities and tailor their resumes while enabling recruiters to manage hiring pipelines with automated follow-ups and transparent scorecards.

The platform provides two strictly separated, role-governed portals:
1. **Student Portal** — Candidates build verified profiles, securely store PDF resumes in private cloud vaults, receive personalized job recommendations with transparent match scores, perform deep resume entity analysis, and track application stages.
2. **Recruiter Portal** — Corporate recruiters publish job openings, review applicant pipelines with side-by-side match scorecards, evaluate candidates with time-limited signed resume access, schedule and reschedule interviews, record round feedback, and leverage an automated Follow-up Center.

---

## 2. Key Capabilities & Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │          React Frontend (Vite + TS)          │
                    │  • /                      (Portal Gateway)   │
                    │  • /student/dashboard     (Guarded Student)  │
                    │  • /student/jobs          (Job Discovery)    │
                    │  • /student/resume-analysis (Intelligence)   │
                    │  • /recruiter/dashboard   (Enterprise RBAC)  │
                    │  • /recruiter/applicants  (Pipeline & Match) │
                    │  • /recruiter/interviews  (Coordination)     │
                    └──────────────┬────────────────┬──────────────┘
                                   │                │
         Direct Supabase Auth JWT  │                │ Bearer Token
         + Storage Upload (RLS)    │                │ (Strict RBAC Verification)
                                   ▼                ▼
         ┌──────────────────────────┐      ┌──────────────────────────┐
         │      Supabase Cloud      │      │     FastAPI Backend      │
         │  • Auth API (/auth/v1)   │◄─────┤  • Smart Match Engine    │
         │  • PostgreSQL DB + RLS   │      │  • Local Resume Parser   │
         │  • Private Bucket Resumes│      │  • Follow-up Intelligence│
         └──────────────────────────┘      │  • Idempotent Reminders  │
                                           └──────────────────────────┘
```

### Phase 4A — Smart Candidate–Job Matching
- **Deterministic Match Engine** (`backend/app/services/matching_service.py`): Calculates authoritative 0–100 candidate-job alignment scores:
  - **Required Skills Overlap (50 pts max)**: Semantic normalization and alias mapping (e.g., `React.js` &rarr; `React`, `TS` &rarr; `TypeScript`, `K8s` &rarr; `Kubernetes`).
  - **Role & Specialization Alignment (20 pts max)**: Keyword alignment across target roles, headlines, and work experience.
  - **Location & Work-Mode (15 pts max)**: Remote accommodation, hybrid proximity, and candidate location matching.
  - **Experience & Education (15 pts max)**: Seniority level weighting and credential verification.
- **Fairness & Partial-Profile Handling**: Candidates with incomplete profiles receive neutral baselines rather than 0% or false mismatch accusations.
- **Decision-Support Governance**: Every match rating is accompanied by transparent positive/negative factor explanations and an explicit human-in-the-loop notice.

### Phase 4B — Resume Intelligence & Tailoring
- **Local PDF Text Extraction**: Uses pure-Python `pypdf` with zero dependency on external paid AI APIs. Resume text is processed ephemerally and never permanently logged.
- **Entity Detection**: Automatically detects skills, degree levels, fields of study, graduation dates, work experiences, project titles, and professional certifications.
- **Scanned Document Detection**: Multi-page PDFs yielding < 40 characters of extractable text are flagged with `is_scanned_or_empty: True` along with actionable guidance to re-export as a searchable PDF.
- **Profile vs. Resume Discrepancies**: Compares extracted resume data against saved profile data to highlight discrepancies without mutating candidate records.
- **Job-Specific Tailoring**: Compares resume text against published job descriptions, highlighting required skills found, skills not detected, and concrete tailoring tips.

### Phase 4C — Follow-up Intelligence & Automated Reminders
- **Recruiter Follow-up Center**: Dedicated dashboard identifying:
  - Unreviewed newly submitted applications (`stage == 'applied'`).
  - Stale applications exceeding stage thresholds (`applied` > 3 days, `screening` > 5 days, `interview` > 5 days, `offer` > 7 days).
  - Upcoming interviews in the next 24–48 hours (highlighting <= 24 hours as High Priority).
  - Completed interviews with missing interviewer feedback.
  - Low-volume job postings (< 2 applicants after 3 days).
- **Automated Interview Reminder Lifecycle**: Scans scheduled interviews occurring within 48 hours and idempotently delivers student in-app notifications without creating duplicates across repeated runs.
- **Notification Hub**: Full student notifications center with "Mark all as read" (`POST /api/student/notifications/read-all`), unread filter tabs, contextual icon badges, and direct application links.

### Phase 4D — Hiring Insights & Dashboard Integration
- **Student Dashboard**: Real-time stage distribution, outstanding action alerts (e.g., missing resume), upcoming rounds, and top recommended jobs with match badges.
- **Recruiter Dashboard**: 6-metric KPI row, pipeline stage distribution visual breakdown, and embedded Follow-up Intelligence widget with on-demand reminder runner.

---

## 3. Technology Stack

### Frontend
- **Framework**: React 18.3 with Vite 6.4
- **Language**: TypeScript 5.8
- **Styling**: Tailwind CSS with custom SaaS light/dark aesthetic and micro-animations
- **Routing**: React Router 7
- **Icons**: Lucide React
- **Auth Client**: Official Supabase JS SDK (`@supabase/supabase-js`)

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Server**: Uvicorn ASGI
- **Validation**: Pydantic v2 & `pydantic-settings`
- **PDF Extraction**: `pypdf` 5.0+ (pure-Python, lightweight, local)
- **HTTP Client**: HTTPX (async)
- **Testing**: Pytest & `pytest-asyncio`

### Database & Storage
- **Database**: Supabase PostgreSQL 15+
- **Security**: PostgreSQL Row-Level Security (RLS) & Security Definer helper functions
- **Private Storage**: Supabase Storage bucket `resumes` (`{student_id}/resume.pdf`) with short-lived signed URLs (300s expiry)

---

## 4. Security & Role-Based Access Control (RBAC)

1. **Strict Role Separation**: Public signups (`/student/signup`) are forced to role `student` by a PostgreSQL trigger (`handle_new_auth_user()`). Client-injected roles are discarded.
2. **Immutable Roles**: The database trigger `prevent_profile_role_tampering()` prevents users from elevating their own privileges.
3. **Recruiter Gating**: Logging into `/recruiter/login` immediately calls FastAPI `/api/recruiter-check`. Student tokens receive `403 Forbidden` and are signed out immediately.
4. **Ownership Verification**: All recruiter actions (viewing candidates, updating stages, scheduling interviews, downloading resumes) verify job ownership against the authenticated recruiter ID.
5. **Private Resume Vault**: Resumes can only be downloaded by the candidate owner or by an authorized recruiter reviewing an active application for their job.

---

## 5. Repository Structure

```
HireFlow/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.py                  # Token verification & recruiter-check
│   │   │   │   ├── health.py                # Service health status
│   │   │   │   ├── jobs.py                  # Published job discovery & application
│   │   │   │   ├── recruiter.py             # Recruiter workspace & follow-up center
│   │   │   │   └── student.py               # Student profile, resume analysis & notifications
│   │   │   └── deps.py                      # Bearer auth & RBAC dependencies
│   │   ├── core/
│   │   │   ├── config.py                    # Environment settings
│   │   │   └── security.py                  # Bearer extraction & sanitizing logger
│   │   ├── schemas/
│   │   │   ├── applications.py              # Application and interview models
│   │   │   ├── auth.py                      # User profiles & role definitions
│   │   │   ├── follow_up.py                 # Follow-up center & reminder models
│   │   │   ├── jobs.py                      # Job listing & response schemas
│   │   │   ├── matching.py                  # Phase 4A JobMatchScore schema
│   │   │   ├── recruiter.py                 # Recruiter applicant and dashboard schemas
│   │   │   ├── resume_intelligence.py       # Phase 4B detected entities & section health
│   │   │   └── student_dashboard.py         # Student dashboard and notification schemas
│   │   ├── services/
│   │   │   ├── follow_up_service.py         # Follow-up aggregation & reminder runner
│   │   │   ├── matching_service.py          # Deterministic candidate-job matching engine
│   │   │   ├── recruiter_service.py         # Recruiter pipeline and interview management
│   │   │   ├── resume_intelligence_service.py # In-house PDF text extraction and parsing
│   │   │   ├── student_service.py           # Student profile builder & applications
│   │   │   └── supabase_auth.py             # Supabase Auth integration
│   │   └── main.py                          # FastAPI ASGI entrypoint
│   ├── tests/
│   │   ├── test_auth.py                     # Auth & RBAC security tests
│   │   ├── test_follow_up_and_notifications.py # Follow-up, reminders & idempotency tests
│   │   ├── test_health.py                   # Health endpoint tests
│   │   ├── test_jobs_and_applications.py    # Job discovery & application tests
│   │   ├── test_matching.py                 # Matching algorithm & scoring tests
│   │   ├── test_recruiter.py                # Recruiter workspace & ownership tests
│   │   ├── test_resume_intelligence.py      # PDF parsing, corruption & boundary tests
│   │   └── test_student_profile.py          # Profile completeness tests
│   ├── render.yaml                          # Render deployment configuration
│   ├── requirements.txt                     # Backend dependencies
│   └── .env.example                         # Backend environment template
├── frontend/
│   ├── src/
│   │   ├── components/                      # Navbar, MatchScoreBadge, Alert, LoadingSpinner
│   │   ├── layouts/                         # DashboardLayout
│   │   ├── pages/
│   │   │   ├── auth/                        # StudentLogin, StudentSignup, RecruiterLogin
│   │   │   ├── recruiter/                   # RecruiterDashboardPage, RecruiterJobsPage,
│   │   │   │                                # RecruiterApplicantsPage, RecruiterInterviewsPage
│   │   │   ├── student/                     # StudentDashboardPage, JobDiscoveryPage,
│   │   │   │                                # JobDetailPage, StudentApplicationsPage,
│   │   │   │                                # StudentResumeAnalysisPage, StudentNotificationsPage,
│   │   │   │                                # StudentProfilePage
│   │   │   ├── LandingPage.tsx              # Public landing page
│   │   │   └── NotFoundPage.tsx             # 404 handler
│   │   ├── hooks/                           # useAuth hook & AuthContext
│   │   ├── services/                        # api.ts (FastAPI) & storage.ts (Supabase)
│   │   ├── types/                           # TypeScript interfaces
│   │   ├── App.tsx                          # Application routes
│   │   └── main.tsx                         # DOM entrypoint
│   ├── package.json                         # Frontend dependencies
│   ├── vite.config.ts                       # Vite build configuration
│   └── .env.example                         # Frontend environment template
├── database/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql           # Schema, tables, triggers
│   │   ├── 002_row_level_security.sql       # RLS policies across all tables
│   │   ├── 003_storage.sql                  # Private 'resumes' bucket setup
│   │   ├── 004_student_portal_enhancements.sql # Logging and stage change triggers
│   │   └── 005_recruiter_portal_enhancements.sql # Compensation schema update
│   ├── provision_recruiter.sql              # Recruiter provisioning script
│   └── seed_jobs.sql                        # Demonstration job postings
├── .gitignore
└── README.md
```

---

## 6. Quick Start & Local Setup

### Prerequisites
- **Node.js** 18+ and **npm**
- **Python** 3.10+ (Python 3.13 supported)
- A free **Supabase** account ([supabase.com](https://supabase.com))

### 1. Database Setup (Supabase)
1. In your Supabase project, navigate to the **SQL Editor**.
2. Run the migration scripts in numerical order:
   - `database/migrations/001_initial_schema.sql`
   - `database/migrations/002_row_level_security.sql`
   - `database/migrations/003_storage.sql`
   - `database/migrations/004_student_portal_enhancements.sql`
   - `database/migrations/005_recruiter_portal_enhancements.sql`
3. Optional: Run `database/seed_jobs.sql` to populate sample corporate job postings.

### 2. Backend Setup
```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

Configure `backend/.env`:
```ini
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
PORT=8000
ENVIRONMENT=development
```

Run the backend server:
```bash
uvicorn app.main:app --reload --port 8000
```
API Documentation: `http://localhost:8000/docs`

### 3. Frontend Setup
```bash
# Navigate to frontend (in a separate terminal)
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
```

Configure `frontend/.env.local`:
```ini
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE_URL=http://localhost:8000
```

Start the frontend development server:
```bash
npm run dev
```
Access the application at: `http://localhost:5173`

---

## 7. Automated Testing

### Backend Test Suite (Pytest)
The test suite covers authentication, role authorization, deterministic matching, PDF resume text extraction, corrupt file handling, notification dispatch, recruiter follow-ups, and reminder idempotency.

```bash
# Run all 66 tests
pytest backend/tests
```
**Current Status**: `66 passed in 1.09s` (100% pass rate).

### Frontend Production Build (TypeScript + Vite)
```bash
npm --prefix frontend run build
```
**Current Status**: Clean compilation with zero TypeScript errors.

---

## 8. Automated Follow-up & Reminder Automation

The automated reminder lifecycle can run via any of the following mechanisms:

1. **CLI / Cron Job** (Recommended for Render or GitHub Actions):
   ```bash
   python -m app.services.follow_up_service
   ```
2. **On-Demand Recruiter Action**:
   Recruiters can trigger an immediate reminder scan via the "Run Reminder Scan" button on the Recruiter Dashboard (`POST /api/recruiter/follow-ups/process-reminders`).
3. **Scheduled Webhook**:
   Automated hourly cron trigger pinging `POST /api/recruiter/follow-ups/process-reminders`.

---

## 9. License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
