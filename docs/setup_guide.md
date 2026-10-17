# HireFlow — Local Setup & Operations Guide (Phase 1)

This guide provides exact, step-by-step instructions to run, test, and operate HireFlow locally on Windows PowerShell as well as macOS/Linux.

---

## 1. Prerequisites & Version Requirements

| Dependency | Minimum Version | Verified Version |
| :--- | :--- | :--- |
| **Node.js** | `>= 18.0.0` | `v22.20.0` |
| **npm** | `>= 9.0.0` | `10.9.3` |
| **Python** | `>= 3.10.0` | `3.13.7` |
| **Git** | `>= 2.30.0` | Installed |
| **Supabase** | Cloud or Local CLI | PostgreSQL 15+ |

---

## 2. Supabase Configuration (Manual Step)

Follow these steps in your Supabase project dashboard ([supabase.com](https://supabase.com)):

### A. Apply Database Migrations
Open **SQL Editor** in your Supabase Dashboard and run the migration scripts in sequential order:

1. Copy and execute [001_initial_schema.sql](../database/migrations/001_initial_schema.sql):
   - Creates `profiles`, `candidate_profiles`, `jobs`, `applications`, `interviews`, `activity_logs`, and `notifications`.
   - Sets up automatic user creation trigger `handle_new_auth_user` on `auth.users` with forced role `'student'`.
   - Adds role tampering prevention trigger `prevent_profile_role_tampering`.
2. Copy and execute [002_row_level_security.sql](../database/migrations/002_row_level_security.sql):
   - Enables RLS on all 7 tables.
   - Defines security definer function `get_current_user_role()`.
   - Implements strict role-based access policies.
3. Copy and execute [003_storage.sql](../database/migrations/003_storage.sql):
   - Configures the private storage bucket `resumes` (5MB limit, PDF MIME only).
   - Establishes storage RLS policies for students and authorized recruiters.

### B. Configure Authentication Settings
In the Supabase Dashboard, navigate to **Authentication -> URL Configuration**:
- **Site URL**: `http://localhost:5173`
- **Redirect URLs**:
  - `http://localhost:5173/**`
  - `http://localhost:5173/student/dashboard`
  - `http://localhost:5173/recruiter/dashboard`

---

## 3. Backend Setup & Run Instructions

### Step 1: Create Virtual Environment and Install Dependencies

**Windows PowerShell:**
```powershell
# Navigate to backend directory from project root
cd C:\Users\Saket\OneDrive\Desktop\HireFlow

# Create Python virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Install required packages
pip install -r backend\requirements.txt
```

**macOS / Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### Step 2: Configure Environment Variables
Copy `backend/.env.example` to `backend/.env`:
```powershell
Copy-Item backend\.env.example backend\.env
```
Edit `backend/.env` with your real Supabase credentials:
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
HOST=0.0.0.0
PORT=8000
ENVIRONMENT=development
```

### Step 3: Run Backend Tests
Execute the pytest suite:
```powershell
$env:PYTHONPATH="backend"
.\.venv\Scripts\pytest backend\tests -v
```

### Step 4: Start Backend Server
```powershell
$env:PYTHONPATH="backend"
.\.venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Verify the health endpoint in your browser or terminal:
```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health"
```
Interactive OpenAPI documentation is available at:
`http://127.0.0.1:8000/docs`

---

## 4. Frontend Setup & Run Instructions

Open a separate terminal window:

### Step 1: Install Dependencies
```powershell
cd C:\Users\Saket\OneDrive\Desktop\HireFlow\frontend
npm install
```

### Step 2: Configure Environment Variables
Copy `frontend/.env.example` to `frontend/.env.local`:
```powershell
Copy-Item .env.example .env.local
```
Edit `frontend/.env.local`:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

### Step 3: Verify TypeScript Build
```powershell
npm run build
```

### Step 4: Start Vite Development Server
```powershell
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 5. Secure Recruiter Provisioning Procedure

**Security Constraint:** Public registration can NEVER create recruiter or admin accounts.

To provision an authorized recruiter account:
1. Have the user sign up through the student signup page (`/student/signup`).
2. An authorized database administrator opens the Supabase SQL Editor and executes [database/provision_recruiter.sql](../database/provision_recruiter.sql):

```sql
DO $$
DECLARE
    target_user_id UUID;
    target_email TEXT := 'recruiter@company.com'; -- Replace with recruiter's email
BEGIN
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User % not found.', target_email;
    END IF;

    UPDATE public.profiles
    SET role = 'recruiter',
        updated_at = NOW()
    WHERE id = target_user_id;

    RAISE NOTICE 'Granted recruiter role to %', target_email;
END $$;
```

3. The user can now sign in through `/recruiter/login`. Their authoritative role will be verified by the backend and granted recruiter portal access.

---

## 6. Troubleshooting Common Issues

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **CORS error in browser** | Backend `CORS_ORIGINS` mismatch | Ensure `http://localhost:5173` is listed in `backend/.env` under `CORS_ORIGINS`. |
| **`GET /api/me` returns 401** | Missing or expired token | Ensure token is passed in header: `Authorization: Bearer <token>`. |
| **Student cannot access recruiter portal** | Expected security behavior | Student accounts are intentionally rejected at `/recruiter/login`. Use recruiter provisioning SQL script to grant role. |
| **Storage upload fails (403)** | Path convention violation | Ensure upload destination path is `{student_id}/{filename}.pdf` and MIME is `application/pdf`. |
