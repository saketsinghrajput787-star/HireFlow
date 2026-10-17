-- ==============================================================================
-- HireFlow Migration 004: Student Portal Enhancements
-- Description: Add phone to candidate_profiles and auto-logging triggers for applications
-- ==============================================================================

-- 1. Add phone number column to candidate_profiles if not exists
ALTER TABLE public.candidate_profiles
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Automatic activity log entry when a new application is submitted
CREATE OR REPLACE FUNCTION public.log_new_application()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.activity_logs (application_id, actor_id, event_type, metadata)
    VALUES (
        NEW.id,
        NEW.student_id,
        'application_submitted',
        jsonb_build_object(
            'message', 'Application submitted by candidate',
            'initial_stage', NEW.stage
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_application_created_log ON public.applications;

CREATE TRIGGER on_application_created_log
AFTER INSERT ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.log_new_application();

-- 3. Automatic activity log and notification when application stage changes
CREATE OR REPLACE FUNCTION public.log_application_stage_change()
RETURNS TRIGGER AS $$
DECLARE
    job_title TEXT;
    company_name TEXT;
BEGIN
    IF NEW.stage IS DISTINCT FROM OLD.stage THEN
        -- Insert activity log entry
        INSERT INTO public.activity_logs (application_id, actor_id, event_type, metadata)
        VALUES (
            NEW.id,
            COALESCE(auth.uid(), NEW.student_id),
            'stage_changed',
            jsonb_build_object(
                'old_stage', OLD.stage,
                'new_stage', NEW.stage
            )
        );

        -- Lookup job title and company for friendly notification
        SELECT title, company INTO job_title, company_name
        FROM public.jobs
        WHERE id = NEW.job_id;

        -- Create notification for student
        INSERT INTO public.notifications (
            recipient_id,
            notification_type,
            title,
            message,
            related_application_id
        )
        VALUES (
            NEW.student_id,
            'status_update',
            'Application Update: ' || COALESCE(job_title, 'Job'),
            'Your application for ' || COALESCE(job_title, 'the role') || ' at ' || COALESCE(company_name, 'the company') || ' has been updated to: ' || UPPER(NEW.stage),
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_application_stage_change_log ON public.applications;

CREATE TRIGGER on_application_stage_change_log
AFTER UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.log_application_stage_change();
