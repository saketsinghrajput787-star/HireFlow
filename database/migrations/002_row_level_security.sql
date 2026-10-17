-- ==============================================================================
-- HireFlow Migration 002: Row Level Security (RLS)
-- Description: Enable RLS and define strict role-based access control policies
-- ==============================================================================

-- Helper function to fetch current authenticated user's authoritative role.
-- Marked as SECURITY DEFINER to avoid recursive policy evaluation loops on public.profiles.
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 1. Profiles RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Recruiters can read student profiles of applicants who applied to their jobs
CREATE POLICY "profiles_select_applicants_by_recruiter"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    public.get_current_user_role() IN ('recruiter', 'admin') AND
    EXISTS (
        SELECT 1
        FROM public.applications a
        JOIN public.jobs j ON j.id = a.job_id
        WHERE a.student_id = public.profiles.id
          AND j.recruiter_id = auth.uid()
    )
);

-- Admins can read all profiles
CREATE POLICY "profiles_select_admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.get_current_user_role() = 'admin');

-- Users can only update their own profile name (role modification blocked by trigger)
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ------------------------------------------------------------------------------
-- 2. Candidate Profiles RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;

-- Students can view their own candidate profile
CREATE POLICY "candidate_profiles_select_own"
ON public.candidate_profiles
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Recruiters can view candidate profiles of students who applied to their posted jobs
CREATE POLICY "candidate_profiles_select_recruiter"
ON public.candidate_profiles
FOR SELECT
TO authenticated
USING (
    public.get_current_user_role() IN ('recruiter', 'admin') AND
    EXISTS (
        SELECT 1
        FROM public.applications a
        JOIN public.jobs j ON j.id = a.job_id
        WHERE a.student_id = public.candidate_profiles.student_id
          AND j.recruiter_id = auth.uid()
    )
);

-- Admins can view all candidate profiles
CREATE POLICY "candidate_profiles_select_admin"
ON public.candidate_profiles
FOR SELECT
TO authenticated
USING (public.get_current_user_role() = 'admin');

-- Only student can update their own candidate profile
CREATE POLICY "candidate_profiles_update_own"
ON public.candidate_profiles
FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

-- Only student can insert their own candidate profile
CREATE POLICY "candidate_profiles_insert_own"
ON public.candidate_profiles
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 3. Jobs RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view published jobs
CREATE POLICY "jobs_select_published"
ON public.jobs
FOR SELECT
TO authenticated
USING (status = 'published');

-- Recruiters can view all of their own jobs (including drafts and closed)
CREATE POLICY "jobs_select_recruiter_own"
ON public.jobs
FOR SELECT
TO authenticated
USING (
    public.get_current_user_role() IN ('recruiter', 'admin') AND
    recruiter_id = auth.uid()
);

-- Admins can view all jobs
CREATE POLICY "jobs_select_admin"
ON public.jobs
FOR SELECT
TO authenticated
USING (public.get_current_user_role() = 'admin');

-- Only verified recruiters or admins can create job postings
CREATE POLICY "jobs_insert_recruiter"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (
    public.get_current_user_role() IN ('recruiter', 'admin') AND
    recruiter_id = auth.uid()
);

-- Recruiters can update only their own jobs
CREATE POLICY "jobs_update_recruiter_own"
ON public.jobs
FOR UPDATE
TO authenticated
USING (
    public.get_current_user_role() IN ('recruiter', 'admin') AND
    recruiter_id = auth.uid()
)
WITH CHECK (
    public.get_current_user_role() IN ('recruiter', 'admin') AND
    recruiter_id = auth.uid()
);

-- Recruiters can delete (archive) only their own jobs
CREATE POLICY "jobs_delete_recruiter_own"
ON public.jobs
FOR DELETE
TO authenticated
USING (
    public.get_current_user_role() IN ('recruiter', 'admin') AND
    recruiter_id = auth.uid()
);

-- ------------------------------------------------------------------------------
-- 4. Applications RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Students can view their own applications
CREATE POLICY "applications_select_student_own"
ON public.applications
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Recruiters can view applications submitted to jobs they own
CREATE POLICY "applications_select_recruiter_own_jobs"
ON public.applications
FOR SELECT
TO authenticated
USING (
    public.get_current_user_role() IN ('recruiter', 'admin') AND
    EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = public.applications.job_id
          AND j.recruiter_id = auth.uid()
    )
);

-- Admins can view all applications
CREATE POLICY "applications_select_admin"
ON public.applications
FOR SELECT
TO authenticated
USING (public.get_current_user_role() = 'admin');

-- Students can create an application for themselves IF the job is currently published
CREATE POLICY "applications_insert_student"
ON public.applications
FOR INSERT
TO authenticated
WITH CHECK (
    public.get_current_user_role() = 'student' AND
    student_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = job_id
          AND j.status = 'published'
    )
);

-- Only recruiters owning the job (or admin) can update application stage and actions
-- Students CANNOT update their own application stage or feedback
CREATE POLICY "applications_update_recruiter"
ON public.applications
FOR UPDATE
TO authenticated
USING (
    public.get_current_user_role() IN ('recruiter', 'admin') AND
    EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = public.applications.job_id
          AND j.recruiter_id = auth.uid()
    )
)
WITH CHECK (
    public.get_current_user_role() IN ('recruiter', 'admin') AND
    EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = public.applications.job_id
          AND j.recruiter_id = auth.uid()
    )
);

-- ------------------------------------------------------------------------------
-- 5. Interviews RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- Students can view interviews scheduled for their own applications
CREATE POLICY "interviews_select_student"
ON public.interviews
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id = public.interviews.application_id
          AND a.student_id = auth.uid()
    )
);

-- Recruiters can view interviews for applications on their jobs
CREATE POLICY "interviews_select_recruiter"
ON public.interviews
FOR SELECT
TO authenticated
USING (
    public.get_current_user_role() IN ('recruiter', 'admin') AND
    EXISTS (
        SELECT 1
        FROM public.applications a
        JOIN public.jobs j ON j.id = a.job_id
        WHERE a.id = public.interviews.application_id
          AND j.recruiter_id = auth.uid()
    )
);

-- Only recruiters (or admin) can schedule or modify interviews
CREATE POLICY "interviews_insert_recruiter"
ON public.interviews
FOR INSERT
TO authenticated
WITH CHECK (
    public.get_current_user_role() IN ('recruiter', 'admin') AND
    EXISTS (
        SELECT 1
        FROM public.applications a
        JOIN public.jobs j ON j.id = a.job_id
        WHERE a.id = application_id
          AND j.recruiter_id = auth.uid()
    )
);

CREATE POLICY "interviews_update_recruiter"
ON public.interviews
FOR UPDATE
TO authenticated
USING (
    public.get_current_user_role() IN ('recruiter', 'admin') AND
    EXISTS (
        SELECT 1
        FROM public.applications a
        JOIN public.jobs j ON j.id = a.job_id
        WHERE a.id = public.interviews.application_id
          AND j.recruiter_id = auth.uid()
    )
);

-- ------------------------------------------------------------------------------
-- 6. Activity Logs RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Students can view activity logs for their applications
CREATE POLICY "activity_logs_select_student"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.applications a
        WHERE a.id = public.activity_logs.application_id
          AND a.student_id = auth.uid()
    )
);

-- Recruiters can view activity logs for applications on their jobs
CREATE POLICY "activity_logs_select_recruiter"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (
    public.get_current_user_role() IN ('recruiter', 'admin') AND
    EXISTS (
        SELECT 1
        FROM public.applications a
        JOIN public.jobs j ON j.id = a.job_id
        WHERE a.id = public.activity_logs.application_id
          AND j.recruiter_id = auth.uid()
    )
);

-- Authorized participants can insert activity entries (immutable logs, no UPDATE/DELETE)
CREATE POLICY "activity_logs_insert_participant"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
    actor_id = auth.uid() AND
    (
        EXISTS (
            SELECT 1 FROM public.applications a
            WHERE a.id = application_id AND a.student_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1
            FROM public.applications a
            JOIN public.jobs j ON j.id = a.job_id
            WHERE a.id = application_id AND j.recruiter_id = auth.uid()
        )
    )
);

-- ------------------------------------------------------------------------------
-- 7. Notifications RLS
-- ------------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "notifications_select_own"
ON public.notifications
FOR SELECT
TO authenticated
USING (recipient_id = auth.uid());

-- Users can update (e.g., mark as read) only their own notifications
CREATE POLICY "notifications_update_own"
ON public.notifications
FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());
