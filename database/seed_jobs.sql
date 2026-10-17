-- ==============================================================================
-- HireFlow Development Seed Script: Realistic Fictional Jobs
-- Description: Seeds 6 diverse open job opportunities for Phase 2 testing.
-- Prerequisite: An authorized recruiter account must exist in public.profiles.
-- ==============================================================================

DO $$
DECLARE
    recruiter_rec RECORD;
    dev_recruiter_id UUID;
    jobs_count INTEGER := 0;
BEGIN
    -- 1. Identify an authorized recruiter or administrator account
    SELECT id, full_name INTO recruiter_rec
    FROM public.profiles
    WHERE role IN ('recruiter', 'admin')
    ORDER BY created_at ASC
    LIMIT 1;

    IF recruiter_rec.id IS NULL THEN
        RAISE EXCEPTION 'No recruiter or admin account found in public.profiles. Please provision a recruiter first using database/provision_recruiter.sql.';
    END IF;

    dev_recruiter_id := recruiter_rec.id;
    RAISE NOTICE 'Associating development seed jobs with authorized recruiter: % (ID: %)', recruiter_rec.full_name, dev_recruiter_id;

    -- 2. Insert Fictional Job 1: Junior Full Stack Engineer
    IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE title = 'Junior Full Stack Engineer' AND company = 'TechNova Solutions') THEN
        INSERT INTO public.jobs (
            recruiter_id, title, company, description, required_skills,
            location, work_mode, employment_type, experience_level, status, deadline
        ) VALUES (
            dev_recruiter_id,
            'Junior Full Stack Engineer',
            'TechNova Solutions',
            'TechNova is seeking an enthusiastic Junior Full Stack Engineer to join our core product team. You will build user-facing web applications using React, TypeScript, and Python FastAPI. You will collaborate closely with product designers and senior engineers to ship reliable, high-performance web features.',
            ARRAY['React', 'TypeScript', 'Python', 'FastAPI', 'PostgreSQL', 'Tailwind CSS'],
            'San Francisco, CA',
            'hybrid',
            'full_time',
            'entry_level',
            'published',
            NOW() + INTERVAL '45 days'
        );
        jobs_count := jobs_count + 1;
    END IF;

    -- 3. Insert Fictional Job 2: Cloud Infrastructure & Backend Intern
    IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE title = 'Cloud Infrastructure & Backend Intern' AND company = 'Aether Cloud Systems') THEN
        INSERT INTO public.jobs (
            recruiter_id, title, company, description, required_skills,
            location, work_mode, employment_type, experience_level, status, deadline
        ) VALUES (
            dev_recruiter_id,
            'Cloud Infrastructure & Backend Intern',
            'Aether Cloud Systems',
            'Join our 12-week summer engineering internship program. You will work on distributed microservices, automated CI/CD pipelines, and cloud database optimizations. Excellent opportunity for students with strong foundational knowledge in data structures and operating systems.',
            ARRAY['Python', 'Docker', 'Linux', 'SQL', 'Git', 'REST APIs'],
            'Seattle, WA (Remote Eligible)',
            'remote',
            'internship',
            'internship',
            'published',
            NOW() + INTERVAL '60 days'
        );
        jobs_count := jobs_count + 1;
    END IF;

    -- 4. Insert Fictional Job 3: Frontend Web Developer
    IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE title = 'Frontend Web Developer' AND company = 'Krypton Interactive') THEN
        INSERT INTO public.jobs (
            recruiter_id, title, company, description, required_skills,
            location, work_mode, employment_type, experience_level, status, deadline
        ) VALUES (
            dev_recruiter_id,
            'Frontend Web Developer',
            'Krypton Interactive',
            'We are looking for a creative Frontend Developer who takes pride in crafting pixel-perfect, accessible, and responsive user interfaces. You will translate wireframes into production components and optimize frontend performance metrics.',
            ARRAY['React', 'TypeScript', 'HTML5', 'CSS3', 'Tailwind CSS', 'Figma'],
            'New York, NY',
            'hybrid',
            'full_time',
            'mid_level',
            'published',
            NOW() + INTERVAL '30 days'
        );
        jobs_count := jobs_count + 1;
    END IF;

    -- 5. Insert Fictional Job 4: Machine Learning Research Intern
    IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE title = 'Machine Learning Research Intern' AND company = 'Cognitive Intelligence Labs') THEN
        INSERT INTO public.jobs (
            recruiter_id, title, company, description, required_skills,
            location, work_mode, employment_type, experience_level, status, deadline
        ) VALUES (
            dev_recruiter_id,
            'Machine Learning Research Intern',
            'Cognitive Intelligence Labs',
            'Collaborate with research scientists on state-of-the-art NLP and multimodal embedding architectures. Responsibilities include benchmark data preprocessing, model fine-tuning, and evaluation metrics reporting.',
            ARRAY['Python', 'PyTorch', 'NumPy', 'Scikit-Learn', 'Pandas'],
            'Boston, MA',
            'onsite',
            'internship',
            'internship',
            'published',
            NOW() + INTERVAL '90 days'
        );
        jobs_count := jobs_count + 1;
    END IF;

    -- 6. Insert Fictional Job 5: Associate Data Engineer
    IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE title = 'Associate Data Engineer' AND company = 'DataStream Analytics') THEN
        INSERT INTO public.jobs (
            recruiter_id, title, company, description, required_skills,
            location, work_mode, employment_type, experience_level, status, deadline
        ) VALUES (
            dev_recruiter_id,
            'Associate Data Engineer',
            'DataStream Analytics',
            'DataStream is hiring an Associate Data Engineer to maintain real-time telemetry streaming and ETL data pipelines. You will write robust SQL transformations and monitoring scripts.',
            ARRAY['SQL', 'Python', 'PostgreSQL', 'ETL', 'Data Warehousing'],
            'Austin, TX',
            'remote',
            'full_time',
            'entry_level',
            'published',
            NOW() + INTERVAL '40 days'
        );
        jobs_count := jobs_count + 1;
    END IF;

    -- 7. Insert Fictional Job 6: DevOps & Site Reliability Engineer
    IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE title = 'DevOps & Site Reliability Engineer' AND company = 'Nexus Global Networks') THEN
        INSERT INTO public.jobs (
            recruiter_id, title, company, description, required_skills,
            location, work_mode, employment_type, experience_level, status, deadline
        ) VALUES (
            dev_recruiter_id,
            'DevOps & Site Reliability Engineer',
            'Nexus Global Networks',
            'Help maintain high availability and security for our international telecommunication platform. Involves Docker orchestration, Kubernetes configurations, and automated vulnerability scanning.',
            ARRAY['Linux', 'Docker', 'Kubernetes', 'Bash', 'Networking', 'Security'],
            'Denver, CO',
            'hybrid',
            'full_time',
            'entry_level',
            'published',
            NOW() + INTERVAL '25 days'
        );
        jobs_count := jobs_count + 1;
    END IF;

    RAISE NOTICE 'Successfully seeded % new open jobs for testing.', jobs_count;
END $$;
