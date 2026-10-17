# HireFlow — Applicant Tracking System (ATS)
### Phase 1: Architecture Foundation, Database Schema & Role-Based Security

[![Backend Tests](https://img.shields.io/badge/pytest-8%20passed-brightgreen.svg)](file:///c:/Users/Saket/OneDrive/Desktop/HireFlow/backend/tests)
[![TypeScript Build](https://img.shields.io/badge/TypeScript-clean%20build-blue.svg)](file:///c:/Users/Saket/OneDrive/Desktop/HireFlow/frontend)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](file:///c:/Users/Saket/OneDrive/Desktop/HireFlow/backend)
[![React](https://img.shields.io/badge/React-18.3+-61dafb.svg)](file:///c:/Users/Saket/OneDrive/Desktop/HireFlow/frontend)
[![PostgreSQL RLS](https://img.shields.io/badge/PostgreSQL-RLS%20Hardened-336791.svg)](file:///c:/Users/Saket/OneDrive/Desktop/HireFlow/database/migrations)

---

## 1. Project Overview

**HireFlow** is a modern, enterprise-ready full-stack Applicant Tracking System (ATS) connecting student talent with recruiters. HireFlow is designed around two distinct portals:
1. **Student Portal** — Students create rich candidate profiles, store verified PDF resumes in private cloud storage, discover open positions, apply, and track interview progress.
2. **Recruiter Portal** — Authorized corporate recruiters manage job postings, review applicant pipelines, download candidate resumes, and coordinate interview stages.

### Phase 1 Scope & Deliverables
This release completes **Phase 1: Foundation, Database & Security**:
- Hardened PostgreSQL relational schema (7 core tables) with automated user triggers and immutable audit logs.
- Strict Row-Level Security (RLS) on all database tables and private storage objects.
- Zero-trust authentication using Supabase Auth and authoritative role resolution (`student`, `recruiter`, `admin`).
- High-performance FastAPI backend with token verification dependencies, OpenAPI documentation, and `/health` & `/api/me` endpoints.
- Modern, accessible, responsive light-theme React + Vite + TypeScript frontend with role-guarded routes and separate student/recruiter access gateways.
- Private resume bucket (`resumes`) with strict PDF MIME and 5MB size limits.
- Automated unit and integration test suite with 100% pass rate.
- Cloud deployment readiness for **Vercel** (frontend) and **Render** (backend).

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

---

## 7. Verification & Test Results

| Test Category | Command | Result | Notes |
| :--- | :--- | :--- | :--- |
| **Backend Pytest** | `pytest backend/tests -v` | **8 passed** (100%) | Health, Missing Token, Invalid Token, Student Role, Recruiter RBAC |
| **Live Health Check** | `GET /health` | **HTTP 200** | Live FastAPI server validated |
| **Live Auth Gate** | `GET /api/me` | **HTTP 401** | Correctly rejects unauthenticated requests |
| **TypeScript Build** | `npm run build` | **0 errors** | 1,662 modules transformed, clean production bundle |
| **Browser E2E** | Chrome Subagent | **All routes verified** | Visual inspection, accessible forms, zero console errors |

---

## 8. Known Limitations & Phase 2 Roadmap

The following modules are deliberately scheduled for **Phase 2**:
- [ ] Student Profile Editing: Interactive forms for education, skills, and work experience.
- [ ] PDF Resume Upload: Multipart upload directly to the private `resumes` bucket with client & server-side validation.
- [ ] Job Management CRUD: Recruiter dashboard interface to publish, edit, and archive job postings.
- [ ] Application Submission & Tracking: 1-click student applications with duplicate prevention.
- [ ] Recruiter Pipeline Kanban: Drag-and-drop applicant status changes (`applied` &rarr; `screening` &rarr; `interview` &rarr; `offer`).
- [ ] Interview Coordination Calendar: Meeting link generation and recruiter feedback logging.
