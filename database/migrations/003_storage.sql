-- ==============================================================================
-- HireFlow Migration 003: Private Resume Storage
-- Description: Sets up the private 'resumes' storage bucket and granular RLS policies
-- ==============================================================================

-- 1. Create or update the private 'resumes' bucket
-- Max file size: 5 MB (5 * 1024 * 1024 = 5242880 bytes)
-- Allowed MIME types: application/pdf (strict single MIME type for resumes)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'resumes',
    'resumes',
    false, -- STRICT: Bucket is NOT public
    5242880, -- 5 MB limit
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['application/pdf'];

-- 2. Storage Policies for storage.objects
-- Path naming convention: "{student_id}/{filename}.pdf"

-- Policy A: Students can upload (INSERT) resumes only to their own folder
CREATE POLICY "student_upload_own_resume"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    (storage.extension(name)) = 'pdf'
);

-- Policy B: Students can read (SELECT) their own resume objects
CREATE POLICY "student_read_own_resume"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy C: Students can update/overwrite their own resume
CREATE POLICY "student_update_own_resume"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy D: Students can delete their own resume
CREATE POLICY "student_delete_own_resume"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'resumes' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy E: Authorized Recruiters can read resumes of students who applied to their jobs
-- Checks that the folder name (student_id) corresponds to an applicant for a job owned by this recruiter
CREATE POLICY "recruiter_read_applicant_resume"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'resumes' AND
    public.get_current_user_role() IN ('recruiter', 'admin') AND
    EXISTS (
        SELECT 1
        FROM public.applications a
        JOIN public.jobs j ON j.id = a.job_id
        WHERE a.student_id::text = (storage.foldername(storage.objects.name))[1]
          AND j.recruiter_id = auth.uid()
    )
);

-- Policy F: Admins can read all resumes
CREATE POLICY "admin_read_all_resumes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'resumes' AND
    public.get_current_user_role() = 'admin'
);
