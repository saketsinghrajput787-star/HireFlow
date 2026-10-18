-- ==============================================================================
-- HireFlow Recruiter Provisioning Procedure
-- Description: Controlled, secure script executed ONLY by authorized database admins
-- ==============================================================================

-- SECURITY NOTICE:
-- Public signup in HireFlow NEVER grants recruiter or admin roles.
-- To grant a user recruiter permissions:
-- 1. Have the recruiter user sign up via the platform as normal (which creates their user and profile with role 'student').
-- 2. An authorized database administrator executes the following SQL in Supabase SQL Editor:

-- Target verified email: Using existing registered account in auth.users
DO $$
DECLARE
    target_user_id UUID;
    target_email TEXT := 'saket7@education.com'; -- Verified existing account in auth.users
BEGIN
    -- Look up user ID from auth.users
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found in auth.users. Please have them register first via the Student Portal.', target_email;
    END IF;

    -- Update authoritative profile role to 'recruiter'
    -- Note: Executing via SQL Editor runs as postgres / supabase_admin, which safely updates role
    UPDATE public.profiles
    SET role = 'recruiter',
        updated_at = NOW()
    WHERE id = target_user_id;

    -- If the profile record was missing for any reason, safely create it
    IF NOT FOUND THEN
        INSERT INTO public.profiles (id, full_name, role)
        VALUES (
            target_user_id,
            COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = target_user_id), SPLIT_PART(target_email, '@', 1)),
            'recruiter'
        );
        RAISE NOTICE 'Created missing profile and provisioned recruiter role for % (%)', target_email, target_user_id;
    ELSE
        RAISE NOTICE 'Successfully granted recruiter role to user % (%)', target_email, target_user_id;
    END IF;
END $$;

-- Verification Query: Run to confirm authoritative role update in public.profiles
SELECT p.id, u.email, p.full_name, p.role, p.updated_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'saket7@education.com';
