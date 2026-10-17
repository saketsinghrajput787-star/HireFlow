-- ==============================================================================
-- HireFlow Database Seed Script
-- Description: Optional sample data for testing and development environments
-- ==============================================================================

-- Note: In Supabase, users must exist in auth.users before foreign keys to profiles can be satisfied.
-- Run migrations 001, 002, and 003 first.
-- To populate sample jobs, an authorized recruiter profile ID must be supplied.

-- Sample comment explaining how to link demo jobs to an existing recruiter user:
/*
-- Example:
INSERT INTO public.jobs (
    recruiter_id,
    title,
    company,
    description,
    required_skills,
    location,
    work_mode,
    employment_type,
    experience_level,
    status
) VALUES
(
    '00000000-0000-0000-0000-000000000000', -- Replace with recruiter UUID
    'Junior Full Stack Developer',
    'TechNova Systems',
    'We are looking for an ambitious full-stack engineer proficient in React, TypeScript, and Python.',
    ARRAY['React', 'TypeScript', 'Python', 'PostgreSQL'],
    'San Francisco, CA (or Remote)',
    'hybrid',
    'full_time',
    'entry_level',
    'published'
),
(
    '00000000-0000-0000-0000-000000000000', -- Replace with recruiter UUID
    'Backend Engineering Intern',
    'DataStream Labs',
    'Join our cloud infrastructure team for a 12-week summer internship developing real-time APIs.',
    ARRAY['Python', 'FastAPI', 'Docker', 'SQL'],
    'Remote',
    'remote',
    'internship',
    'entry_level',
    'published'
);
*/
