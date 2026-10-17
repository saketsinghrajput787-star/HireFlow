-- ==============================================================================
-- HireFlow Migration 001: Initial Core Schema
-- Description: Core tables, constraints, foreign keys, triggers, and auto-provisioning
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to automatically update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 1. Profiles Table
-- Linked directly to Supabase auth.users.
-- Public signups can only ever have role 'student'.
-- Roles: student, recruiter, admin.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_role CHECK (role IN ('student', 'recruiter', 'admin'))
);

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Prevent users from updating their own role directly
CREATE OR REPLACE FUNCTION prevent_profile_role_tampering()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Only service_role or database admin can update roles
        IF (current_user != 'service_role' AND current_user != 'postgres' AND current_user != 'supabase_admin') THEN
            RAISE EXCEPTION 'Unauthorized: Users cannot modify their own role.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_profile_role_immutability
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_profile_role_tampering();

-- ------------------------------------------------------------------------------
-- 2. Candidate Profiles Table
-- Extended profile information for students.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.candidate_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    headline TEXT,
    education JSONB NOT NULL DEFAULT '[]'::jsonb,
    graduation_year INTEGER,
    skills TEXT[] NOT NULL DEFAULT '{}',
    experience JSONB NOT NULL DEFAULT '[]'::jsonb,
    preferred_role TEXT,
    preferred_location TEXT,
    resume_path TEXT,
    resume_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_candidate_profiles_updated_at
BEFORE UPDATE ON public.candidate_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 3. Jobs Table
-- Managed by recruiters.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    description TEXT NOT NULL,
    required_skills TEXT[] NOT NULL DEFAULT '{}',
    location TEXT NOT NULL,
    work_mode TEXT NOT NULL DEFAULT 'remote' CHECK (work_mode IN ('remote', 'hybrid', 'onsite')),
    employment_type TEXT NOT NULL DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'internship')),
    experience_level TEXT NOT NULL DEFAULT 'entry_level',
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'closed', 'archived')),
    deadline TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_recruiter_id ON public.jobs(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);

CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 4. Applications Table
-- Applications submitted by students for published jobs.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stage TEXT NOT NULL DEFAULT 'applied' CHECK (stage IN ('applied', 'screening', 'interview', 'offer', 'hired', 'rejected')),
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    stage_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_action_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_job_student_application UNIQUE (job_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_student_id ON public.applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_stage ON public.applications(stage);

CREATE TRIGGER update_applications_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to track stage change timestamps
CREATE OR REPLACE FUNCTION handle_application_stage_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stage IS DISTINCT FROM OLD.stage THEN
        NEW.stage_changed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_application_stage_change
BEFORE UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION handle_application_stage_change();

-- ------------------------------------------------------------------------------
-- 5. Interviews Table
-- Interview schedule and feedback.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    interview_format TEXT NOT NULL DEFAULT 'video' CHECK (interview_format IN ('video', 'in_person', 'phone')),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
    meeting_link TEXT,
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interviews_application_id ON public.interviews(application_id);

CREATE TRIGGER update_interviews_updated_at
BEFORE UPDATE ON public.interviews
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 6. Activity Logs Table
-- Immutable audit log for application events.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_application_id ON public.activity_logs(application_id);

-- ------------------------------------------------------------------------------
-- 7. Notifications Table
-- System notifications for users.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at);

-- ------------------------------------------------------------------------------
-- 8. Auth Signup Trigger (Automatic Profile Creation)
-- Triggered whenever a new user signs up in auth.users.
-- SECURITY RULE: Role is ALWAYS forced to 'student'.
-- Public signups can NEVER self-assign 'recruiter' or 'admin'.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
    extracted_full_name TEXT;
BEGIN
    -- Extract full name from metadata, fallback to email prefix if not provided
    extracted_full_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        SPLIT_PART(NEW.email, '@', 1)
    );

    -- Insert authoritative profile: role is unconditionally 'student'
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        extracted_full_name,
        'student'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Automatically initialize student candidate profile
    INSERT INTO public.candidate_profiles (student_id)
    VALUES (NEW.id)
    ON CONFLICT (student_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if re-running
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();
