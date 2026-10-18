-- ==============================================================================
-- HireFlow Migration 005: Recruiter Portal Enhancements
-- Description: Adds salary_range column to public.jobs table
-- ==============================================================================

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS salary_range TEXT;

-- Comment for documentation
COMMENT ON COLUMN public.jobs.salary_range IS 'Optional compensation range or rate displayed on job postings';
