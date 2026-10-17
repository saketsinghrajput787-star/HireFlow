import { supabase } from './supabase';

export const MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Validates and uploads a PDF resume to the private 'resumes' Supabase bucket.
 * Enforces:
 * 1. File size <= 5MB.
 * 2. MIME type strictly 'application/pdf' and extension .pdf.
 * 3. Path strictly in student's folder: {student_id}/resume.pdf
 */
export async function uploadStudentResume(file: File, studentId: string): Promise<string> {
  if (!file) {
    throw new StorageError('No file selected for upload.');
  }

  // File size validation
  if (file.size > MAX_RESUME_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    throw new StorageError(`File size (${sizeInMb}MB) exceeds the maximum allowed limit of 5.0MB.`);
  }

  // Strict PDF MIME and extension validation
  const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
  const isPdfMime = file.type === 'application/pdf' || file.type === '';
  if (!hasPdfExtension || !isPdfMime) {
    throw new StorageError('Invalid file format. Only verified PDF (.pdf) documents are accepted.');
  }

  // Consistent, safe path: {student_id}/resume.pdf
  const objectPath = `${studentId}/resume.pdf`;

  const { error: uploadError } = await supabase.storage
    .from('resumes')
    .upload(objectPath, file, {
      upsert: true,
      contentType: 'application/pdf',
      cacheControl: '3600',
    });

  if (uploadError) {
    throw new StorageError(uploadError.message || 'Failed to upload resume to secure storage.');
  }

  return objectPath;
}

/**
 * Generates a short-lived signed URL for an authorized resume download.
 * Never generates permanent public URLs.
 */
export async function getResumeDownloadUrl(resumePath: string): Promise<string> {
  if (!resumePath) {
    throw new StorageError('Resume path is missing.');
  }

  // Create signed URL valid for 5 minutes (300 seconds)
  const { data, error } = await supabase.storage
    .from('resumes')
    .createSignedUrl(resumePath, 300, {
      download: true,
    });

  if (error || !data?.signedUrl) {
    throw new StorageError(error?.message || 'Unable to generate secure download link.');
  }

  return data.signedUrl;
}

/**
 * Removes an existing resume file from the private bucket.
 */
export async function deleteStudentResumeFile(resumePath: string): Promise<void> {
  if (!resumePath) return;

  const { error } = await supabase.storage.from('resumes').remove([resumePath]);
  if (error) {
    console.warn('Storage deletion warning:', error.message);
  }
}
