-- ==============================================================================
-- HireFlow Recruiter Provisioning Procedure
-- Description: Controlled, secure script executed ONLY by authorized database admins
-- ==============================================================================

-- SECURITY NOTICE:
-- Public signup in HireFlow NEVER grants recruiter or admin roles.
-- To grant a user recruiter permissions:
-- 1. Have the recruiter user sign up via the platform as normal (which creates their user and profile with role 'student').
-- 2. An authorized database administrator executes the following SQL in Supabase SQL Editor:

-- Replace the email below with the target recruiter's verified email address:
DO $$
DECLARE
    target_user_id UUID;
    target_email TEXT := 'recruiter@company.com'; -- <--- REPLACE WITH ACTUAL EMAIL
BEGIN
    -- Look up user ID from auth.users
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found in auth.users. Please have them register first.', target_email;
    END IF;

    -- Update authoritative profile role to 'recruiter'
    -- Note: Executing via SQL Editor runs as postgres / supabase_admin, which bypasses RLS and triggers safely.
    UPDATE public.profiles
    SET role = 'recruiter',
        updated_at = NOW()
    WHERE id = target_user_id;

    RAISE NOTICE 'Successfully granted recruiter role to user % (%)', target_email, target_user_id;
END $$;
