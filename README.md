# HireFlow — Applicant Tracking System (ATS)
### Phase 2: Complete Student Portal

[![Backend Tests](https://img.shields.io/badge/pytest-20%20passed-brightgreen.svg)](file:///c:/Users/Saket/OneDrive/Desktop/HireFlow/backend/tests)
[![TypeScript Build](https://img.shields.io/badge/TypeScript-clean%20build-blue.svg)](file:///c:/Users/Saket/OneDrive/Desktop/HireFlow/frontend)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](file:///c:/Users/Saket/OneDrive/Desktop/HireFlow/backend)
[![React](https://img.shields.io/badge/React-18.3+-61dafb.svg)](file:///c:/Users/Saket/OneDrive/Desktop/HireFlow/frontend)
[![PostgreSQL RLS](https://img.shields.io/badge/PostgreSQL-RLS%20Hardened-336791.svg)](file:///c:/Users/Saket/OneDrive/Desktop/HireFlow/database/migrations)

---

## 1. Project Overview

**HireFlow** is a modern, enterprise-ready full-stack Applicant Tracking System (ATS) connecting student talent with recruiters. HireFlow is designed around two distinct portals:
1. **Student Portal** — Students create rich candidate profiles, store verified PDF resumes in private cloud storage, discover open positions, apply, and track interview progress.
2. **Recruiter Portal** — Authorized corporate recruiters manage job postings, review applicant pipelines, download candidate resumes, and coordinate interview stages.

### Phase 2 Scope & Deliverables
This release completes **Phase 2: Complete Student Portal**:
- **Real-Time Student Dashboard**: Dynamic metrics backed by real database queries — calculated profile completion percentage, submitted application counters, stage breakdowns, upcoming interviews, and recent status updates.
- **Rich Candidate Profile Builder**: Form management for personal info, graduation year, multi-entry education histories, professional experience timelines, and normalized interactive skill tag management.
- **Private Resume Vault**: Secure PDF resume upload directly to the private Supabase `resumes` bucket (`{student_id}/resume.pdf`), time-limited signed URL download generation, replacement, deletion, and database synchronization.
- **Live Job Discovery & Search**: Full-text keyword search across titles and descriptions, multi-parameter filters (work mode, employment type, experience level, location), pagination, and detailed job specification pages.
- **Application Submission & Duplicate Prevention**: Backend student token verification, atomic application creation, and database-level duplicate prevention (`UNIQUE(job_id, student_id)`) returning HTTP 409 Conflict.
- **Application Tracking & Hiring Stepper**: Dedicated application list and detail views with a visual progress stepper reflecting the authoritative stage (`Applied` &rarr; `Screening` &rarr; `Interview` &rarr; `Offer` &rarr; `Hired` or terminal `Rejected`).
- **Interviews & Notifications Hub**: Scheduled interview coordinates with meeting links, automatic audit and status change notifications, and mark-as-read functionality.
- **Additive Database Migration 004**: Adds `phone` to `candidate_profiles`, automated audit logging triggers, and application notification triggers.
- **Repeatable Development Job Seed Script**: Safe `seed_jobs.sql` script populating 6 fictional job openings linked to an authorized recruiter.
- **Automated Test Suite**: 20 backend unit/integration tests with 100% pass rate.

---

## 2. Technology Stack

### Frontend
- **Framework**: React 18 with Vite 6
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS with custom SaaS light theme
- **Routing**: React Router 7
- **Icons**: Lucide React
- **Auth Client**: Official Supabase JS SDK (`@supabase/supabase-js`)

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Server**: Uvicorn ASGI
- **Data Validation & Settings**: Pydantic v2 & `pydantic-settings`
- **HTTP Client**: HTTPX (async)
- **Testing**: Pytest & `pytest-asyncio`

### Database & Storage
- **Database**: Supabase PostgreSQL 15+
- **Security**: PostgreSQL Row-Level Security (RLS) & Security Definer helper functions
- **Private Storage**: Supabase Storage bucket `resumes`

---

## 3. Architecture & Security Model

```
                    ┌─────────────────────────────────────────┐
                    │      React Frontend (Vite + TS)         │
                    │  • /                      (Landing Page)│
                    │  • /student/login         (Student Auth)│
                    │  • /student/signup        (Student Only)│
                    │  • /student/dashboard     (Guarded)     │
                    │  • /recruiter/login       (Restricted)  │
                    │  • /recruiter/dashboard   (Guarded)     │
                    └────────────┬───────────────┬────────────┘
                                 │               │
       Direct Supabase Auth JWT  │               │ Bearer Token
       + Storage Upload (RLS)    │               │
                                 ▼               ▼
        ┌─────────────────────────┐     ┌─────────────────────────┐
        │     Supabase Cloud      │     │     FastAPI Backend     │
        │  • Auth API (/auth/v1)  │◄────┤  • GET /health          │
        │  • PostgreSQL DB + RLS  │◄────┤  • GET /api/me          │
        │  • Private Bucket Resumes│     │  • GET /recruiter-check │
        └─────────────────────────┘     └─────────────────────────┘
```

### Critical Role & Security Rules
1. **Public Signup Constraint**: Public registration (`/student/signup`) is hardcoded to create `student` accounts only. Even if client metadata attempts to inject `role: "recruiter"`, the PostgreSQL trigger `handle_new_auth_user()` unconditionally forces `role = 'student'`.
2. **Immutability of Roles**: The trigger `prevent_profile_role_tampering()` prevents any standard user from changing their own or other users' roles. Only `service_role` or a database administrator can update roles.
3. **No Role-Switch Controls**: There is no student/recruiter toggle in the application. Recruiter accounts are restricted and must be provisioned by a workspace administrator.
4. **Recruiter Portal Gate**: Logging in via `/recruiter/login` immediately checks the authoritative role from the backend. Student accounts are rejected with an explicit security alert and signed out instantly.
5. **Private Resume Vault**: Resumes are stored in a private Supabase bucket (`resumes`). Resumes can only be read by the student owner, or by an authorized recruiter who owns a job that student applied for.

---

## 4. Project Structure

```
HireFlow/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── auth.py          # /api/me & /api/recruiter-check routes
│   │   │   │   └── health.py        # /health service status endpoint
│   │   │   └── deps.py              # JWT & role verification dependencies
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic Settings & environment config
│   │   │   └── security.py          # Bearer auth & sanitizing logger
│   │   ├── schemas/
│   │   │   ├── auth.py              # UserProfile & Error schemas
│   │   │   └── health.py            # HealthResponse schema
│   │   ├── services/
│   │   │   └── supabase_auth.py     # Supabase token & PostgREST role service
│   │   └── main.py                  # FastAPI application entrypoint
│   ├── tests/
│   │   ├── test_auth.py             # Auth & RBAC unit/integration tests
│   │   └── test_health.py           # Health endpoint tests
│   ├── render.yaml                  # Render deployment configuration
│   ├── requirements.txt             # Python backend dependencies
│   └── .env.example                 # Backend environment variable template
├── frontend/
│   ├── src/
│   │   ├── components/              # Navbar, Footer, ProtectedRoute, Alert, RoleBadge
│   │   ├── layouts/                 # RootLayout, DashboardLayout
│   │   ├── pages/
│   │   │   ├── auth/                # StudentLogin, StudentSignup, RecruiterLogin, ForgotPassword
│   │   │   ├── student/             # StudentDashboardPage
│   │   │   ├── recruiter/           # RecruiterDashboardPage
│   │   │   ├── LandingPage.tsx      # Main landing & portal gateway
│   │   │   └── NotFoundPage.tsx     # 404 handler
│   │   ├── hooks/                   # useAuth hook & AuthProvider
│   │   ├── services/                # api.ts (FastAPI) & supabase.ts (Client)
│   │   ├── types/                   # TypeScript interfaces
│   │   ├── App.tsx                  # React Router configuration
│   │   └── main.tsx                 # DOM render entrypoint
│   ├── vercel.json                  # Vercel deployment configuration
│   ├── package.json                 # Node dependencies
│   ├── vite.config.ts               # Vite configuration
│   └── .env.example                 # Frontend environment template
├── database/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql   # Tables, constraints, user triggers
│   │   ├── 002_row_level_security.sql # Granular RLS policies for all 7 tables
│   │   └── 003_storage.sql          # Private 'resumes' bucket & policies
│   ├── provision_recruiter.sql      # Admin recruiter provisioning SQL procedure
│   └── seed.sql                     # Development seed template
├── docs/
│   ├── architecture.md              # In-depth architectural & RLS specification
│   └── setup_guide.md               # Step-by-step setup for PowerShell and Unix
├── .gitignore                       # Multi-stack git exclusions
└── README.md                        # Project documentation
```

---

## 5. Quick Start (Local Development)

### 1. Database Setup in Supabase
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard and run the SQL migration scripts in order:
   - [database/migrations/001_initial_schema.sql](file:///c:/Users/Saket/OneDrive/Desktop/HireFlow/database/migrations/001_initial_schema.sql)
   - [database/migrations/002_row_level_security.sql](file:///c:/Users/Saket/OneDrive/Desktop/HireFlow/database/migrations/002_row_level_security.sql)
   - [database/migrations/003_storage.sql](file:///c:/Users/Saket/OneDrive/Desktop/HireFlow/database/migrations/003_storage.sql)

### 2. Backend Setup
```powershell
# Create virtual environment and install packages
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt

# Create .env from template
Copy-Item backend\.env.example backend\.env
# Populate SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY

# Run backend unit tests
$env:PYTHONPATH="backend"
.\.venv\Scripts\pytest backend\tests -v

# Start FastAPI dev server
.\.venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup
In a new terminal:
```powershell
cd frontend

# Install npm packages
npm install

# Create environment file from template
Copy-Item .env.example .env.local
# Populate VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY

# Verify TypeScript build
npm run build

# Start Vite dev server
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 6. Authorizing a Recruiter Account

Recruiter accounts cannot self-register. To grant recruiter privileges:
1. The user registers normally via the Student Signup page (`/student/signup`).
2. An authorized database admin runs the SQL snippet in [database/provision_recruiter.sql](file:///c:/Users/Saket/OneDrive/Desktop/HireFlow/database/provision_recruiter.sql) in the Supabase SQL Editor:
```sql
UPDATE public.profiles
SET role = 'recruiter', updated_at = NOW()
WHERE id = (SELECT id FROM auth.users WHERE email = 'recruiter@company.com');
```
3. The recruiter can now sign in at **`/recruiter/login`**.

## 7. Phase 2 API Endpoints

### Student Portal & Jobs API

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/student/dashboard-stats` | Student | Profile completion %, app counts, interviews, recent updates |
| `GET` | `/api/student/profile` | Student | Candidate profile details (education, experience, skills, resume) |
| `PATCH`| `/api/student/profile` | Student | Updates candidate profile details |
| `PATCH`| `/api/student/profile/resume` | Student | Records uploaded resume path in candidate profile |
| `DELETE`| `/api/student/profile/resume` | Student | Removes resume path from candidate profile |
| `GET` | `/api/jobs` | Public / Student | Discovers open published jobs with search & filters |
| `GET` | `/api/jobs/{id}` | Public / Student | Full job specification and application status |
| `POST`| `/api/jobs/{id}/apply` | Student | Submits job application with duplicate prevention |
| `GET` | `/api/student/applications` | Student | Lists student's submitted applications |
| `GET` | `/api/student/applications/{id}`| Student | Detailed application progress, stage stepper, logs |
| `GET` | `/api/student/interviews` | Student | Scheduled interview coordinates and meeting links |
| `GET` | `/api/student/notifications` | Student | Lists application and interview notifications |
| `PATCH`| `/api/student/notifications/{id}/read` | Student | Marks notification as read |

---

## 8. Verification & Test Results

| Test Category | Command | Result | Notes |
| :--- | :--- | :--- | :--- |
| **Backend Pytest** | `pytest backend/tests -v` | **20 passed** (100%) | Auth, Health, Jobs discovery, Applications, Duplicates, Isolation, Profile lifecycle, Resume metadata, Notifications, Interviews |
| **Live Health Check** | `GET /health` | **HTTP 200** | Live FastAPI server validated |
| **Live Auth Gate** | `GET /api/me` | **HTTP 401** | Correctly rejects unauthenticated requests |
| **TypeScript Build** | `npm run build` | **0 errors** | 1,674 modules transformed, clean production bundle |
| **Browser E2E** | Chrome Subagent | **All routes verified** | Real database queries, accessible forms, zero console errors |

---

## 9. Phase 3 Roadmap (Recruiter Portal)

The following modules are scheduled for **Phase 3: Recruiter Portal**:
- [ ] Recruiter Job Management CRUD: Create, publish, edit, close, and archive job postings.
- [ ] Applicant Pipeline Kanban: Drag-and-drop applicant cards across hiring stages (`applied` &rarr; `screening` &rarr; `interview` &rarr; `offer` &rarr; `hired`).
- [ ] Resume Review Vault: In-browser PDF resume viewer and secure authorized download for recruiters.
- [ ] Interview Coordination: Schedule interviews, assign meeting links, and submit recruiter feedback.
- [ ] Candidate Status Communication: Automated notifications and email updates on stage changes.
