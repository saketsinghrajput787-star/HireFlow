# HireFlow Architecture & Security Specification — Phase 1

## 1. System Overview

HireFlow is an enterprise-grade Applicant Tracking System (ATS) architected with defense-in-depth principles. It bridges student job seekers and corporate recruiters through a single full-stack platform backed by Supabase Auth, PostgreSQL Row-Level Security (RLS), and a FastAPI backend.

```mermaid
flowchart TD
    subgraph Client["Frontend (React + Vite + TS)"]
        Landing["Landing Page (/)"]
        StudentUI["Student Portal (/student/*)"]
        RecruiterUI["Recruiter Portal (/recruiter/*)"]
        AuthContext["Auth Context & Token Manager"]
    end

    subgraph Backend["Backend API (FastAPI)"]
        FastAPI["Uvicorn / FastAPI"]
        AuthDep["Authentication & Role Dependency"]
        HealthEndpoint["GET /health"]
        MeEndpoint["GET /api/me"]
    end

    subgraph Supabase["Supabase Cloud Platform"]
        AuthAPI["Supabase Auth (/auth/v1)"]
        PostgresDB[("PostgreSQL 15+ (With RLS)")]
        StorageVault[("Private Storage ('resumes')")]
    end

    StudentUI --> AuthContext
    RecruiterUI --> AuthContext
    AuthContext -->|1. Sign In / Sign Up| AuthAPI
    AuthContext -->|2. Authoritative Profile Request (Bearer JWT)| MeEndpoint
    MeEndpoint --> AuthDep
    AuthDep -->|3. Verify Token Cryptographically| AuthAPI
    AuthDep -->|4. Resolve Role from public.profiles| PostgresDB
    StudentUI -.->|Direct Query with JWT & RLS| PostgresDB
    RecruiterUI -.->|Direct Query with JWT & RLS| PostgresDB
    StudentUI -.->|Upload PDF Resume with RLS| StorageVault
```

---

## 2. Authentication & Authoritative Role Hierarchy

### Roles:
- **`student`**: Default role for all public signups. Permitted to maintain candidate profile, upload PDF resumes, discover published jobs, submit one application per job, and track application stages.
- **`recruiter`**: Enterprise role. Permitted to manage jobs, view candidate profiles of applicants to their jobs, download candidate resumes, schedule interviews, and transition application stages.
- **`admin`**: Workspace administrator with omnipotent audit and management capabilities.

### Security Guarantees:
1. **Public Signup Boundary**: Public registration (`/student/signup`) exclusively provisions `student` accounts. Even if a malicious client sends `role: "recruiter"` or `"admin"` in user metadata, the database trigger `handle_new_auth_user()` unconditionally forces `role = 'student'`.
2. **Immutability of Role**: A database trigger `prevent_profile_role_tampering()` blocks any UPDATE on `public.profiles.role` by standard authenticated users. Roles can only be updated by the database administrator or `service_role`.
3. **Zero-Trust Backend Verification**: The FastAPI backend never merely decodes a JWT. It securely verifies the access token against Supabase Auth API (`/auth/v1/user`), then queries `public.profiles` to extract the authoritative role.
4. **Recruiter Portal Gate**: Logging in via `/recruiter/login` immediately validates that the authoritative role is `recruiter` or `admin`. If a student attempts to log into the recruiter portal, the session is invalidated immediately, logged out, and rejected with a 403-equivalent alert.

---

## 3. Database Schema Reference

| Table | Purpose | Primary Key | Critical Constraints |
| :--- | :--- | :--- | :--- |
| `profiles` | Authoritative user identity & role | `id` (FK `auth.users`) | `role IN ('student', 'recruiter', 'admin')` |
| `candidate_profiles` | Student resume & career metadata | `id` (UUID) | Unique `student_id` |
| `jobs` | Job opening listings | `id` (UUID) | `recruiter_id` FK, enum checks for work mode and type |
| `applications` | Job applications | `id` (UUID) | **`UNIQUE (job_id, student_id)`** |
| `interviews` | Interview coordination | `id` (UUID) | FK `application_id`, format & status enums |
| `activity_logs` | Audit trail of application events | `id` (UUID) | Immutable (INSERT only) |
| `notifications` | System alerts for users | `id` (UUID) | FK `recipient_id` |

---

## 4. Row-Level Security (RLS) Matrix

| Table | Student Permissions | Recruiter Permissions | Admin |
| :--- | :--- | :--- | :--- |
| `profiles` | SELECT own, UPDATE own (`full_name` only) | SELECT applicants to their jobs | ALL |
| `candidate_profiles` | SELECT own, INSERT own, UPDATE own | SELECT applicants to their jobs | ALL |
| `jobs` | SELECT where `status = 'published'` | SELECT own (all statuses), INSERT/UPDATE/DELETE own | ALL |
| `applications` | SELECT own, INSERT own (if job is open) | SELECT on own jobs, UPDATE stage on own jobs | ALL |
| `interviews` | SELECT own application interviews | SELECT/INSERT/UPDATE on own job applications | ALL |
| `activity_logs` | SELECT own, INSERT own activity | SELECT/INSERT on own job applications | ALL |
| `notifications` | SELECT own, UPDATE own (mark as read) | SELECT own, UPDATE own | ALL |

---

## 5. Private Resume Storage Architecture

- **Bucket**: `resumes` (in Supabase Storage)
- **Visibility**: Strictly `public = false` (private bucket)
- **Size Limit**: 5 MB (`5242880` bytes)
- **MIME Whitelist**: `ARRAY['application/pdf']`
- **Object Path Convention**: `{student_id}/{filename}.pdf`
- **Storage Policies**:
  - `student_upload_own_resume`: INSERT permitted only if `(storage.foldername(name))[1] = auth.uid()` and extension is `pdf`.
  - `student_read_own_resume`: SELECT permitted only for the owner.
  - `recruiter_read_applicant_resume`: SELECT permitted only if the recruiter owns a job to which the student has applied.
  - Public anonymous downloads are completely prohibited.
