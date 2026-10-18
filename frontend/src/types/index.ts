export type UserRole = 'student' | 'recruiter' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at?: string;
}

export interface BackendHealth {
  status: string;
  service: string;
  version: string;
  database_configured: boolean;
}

export interface AuthState {
  user: any | null;
  profile: UserProfile | null;
  session: any | null;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Phase 2: Student Portal Types
// ============================================================================

export interface EducationItem {
  institution: string;
  degree: string;
  field_of_study: string;
  start_year?: number;
  end_year?: number;
  grade?: string;
}

export interface ExperienceItem {
  title: string;
  company: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  current: boolean;
  description?: string;
}

export interface CandidateProfile {
  id: string;
  student_id: string;
  full_name: string;
  email: string;
  headline?: string;
  phone?: string;
  preferred_role?: string;
  preferred_location?: string;
  graduation_year?: number;
  skills: string[];
  education: EducationItem[];
  experience: ExperienceItem[];
  resume_path?: string;
  resume_updated_at?: string;
  completion_percentage: number;
  created_at?: string;
  updated_at?: string;
}

export type ApplicationStage = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';

export interface JobItem {
  id: string;
  recruiter_id: string;
  title: string;
  company: string;
  description: string;
  required_skills: string[];
  location: string;
  work_mode: 'remote' | 'hybrid' | 'onsite';
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship';
  experience_level: string;
  status: string;
  deadline?: string;
  created_at: string;
  updated_at?: string;
  has_applied: boolean;
  application_id?: string;
  application_stage?: ApplicationStage;
  match?: JobMatchScore;
}

export interface JobMatchScore {
  score: number;
  matched_skills: string[];
  missing_skills: string[];
  match_reasons: string[];
  is_partial_profile: boolean;
}

export interface JobListResponse {
  items: JobItem[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ActivityLogItem {
  id: string;
  event_type: string;
  metadata: Record<string, any>;
  created_at: string;
}

export type InterviewFormat = 'video' | 'in_person' | 'phone';
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';

export interface InterviewItem {
  id: string;
  application_id: string;
  scheduled_at: string;
  timezone: string;
  interview_format: InterviewFormat;
  status: InterviewStatus;
  meeting_link?: string;
  feedback?: string;
  created_at: string;
}

export interface ApplicationItem {
  id: string;
  job_id: string;
  job_title: string;
  company: string;
  location: string;
  work_mode: string;
  employment_type: string;
  stage: ApplicationStage;
  applied_at: string;
  stage_changed_at: string;
  next_action_at?: string;
  has_scheduled_interview?: boolean;
}

export interface ApplicationDetail extends ApplicationItem {
  student_id: string;
  job_description: string;
  required_skills: string[];
  created_at: string;
  interviews: InterviewItem[];
  activity_logs: ActivityLogItem[];
}

export interface NotificationItem {
  id: string;
  recipient_id: string;
  notification_type: string;
  title: string;
  message: string;
  related_application_id?: string;
  read_at?: string;
  created_at: string;
}

export interface StudentDashboardStats {
  profile_completion_percentage: number;
  total_applications: number;
  applications_by_stage: Record<ApplicationStage, number>;
  upcoming_interviews_count: number;
  recent_applications: ApplicationItem[];
  upcoming_interviews: InterviewItem[];
  unread_notifications_count: number;
  recommended_jobs?: JobItem[];
  has_resume?: boolean;
}

// ============================================================================
// Phase 3: Recruiter Workspace Types
// ============================================================================

export type RecruiterJobStatus = 'draft' | 'published' | 'closed' | 'archived';

export interface RecruiterJob {
  id: string;
  recruiter_id: string;
  title: string;
  company: string;
  description: string;
  required_skills: string[];
  location: string;
  work_mode: 'remote' | 'hybrid' | 'onsite';
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship';
  experience_level: string;
  status: RecruiterJobStatus;
  deadline?: string;
  salary_range?: string;
  created_at: string;
  updated_at?: string;
  application_count: number;
}

export interface RecruiterJobListResponse {
  items: RecruiterJob[];
  total: number;
}

export interface RecruiterApplicant {
  id: string;
  job_id: string;
  job_title: string;
  job_company: string;
  student_id: string;
  student_name: string;
  student_email: string;
  stage: ApplicationStage;
  applied_at: string;
  stage_changed_at: string;
  next_action_at?: string;
  candidate_profile?: {
    headline?: string;
    skills: string[];
    education: EducationItem[];
    experience: ExperienceItem[];
    graduation_year?: number;
    preferred_role?: string;
    preferred_location?: string;
    resume_path?: string;
    resume_url?: string;
    resume_updated_at?: string;
    phone?: string;
  };
  interviews_count: number;
  match?: JobMatchScore;
}

export interface RecruiterApplicantDetail extends RecruiterApplicant {
  job_description: string;
  interviews: InterviewItem[];
  activity_logs: ActivityLogItem[];
  match?: JobMatchScore;
}

export interface RecruiterInterview {
  id: string;
  application_id: string;
  job_id: string;
  job_title: string;
  job_company: string;
  student_id: string;
  student_name: string;
  student_email: string;
  scheduled_at: string;
  timezone: string;
  interview_format: 'video' | 'in_person' | 'phone';
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  meeting_link?: string;
  feedback?: string;
  created_at: string;
  updated_at?: string;
}

export interface RecruiterDashboardStats {
  total_jobs: number;
  active_jobs: number;
  total_applicants: number;
  pending_reviews: number;
  scheduled_interviews: number;
  recent_applications: RecruiterApplicant[];
  upcoming_interviews: RecruiterInterview[];
  interviews_awaiting_feedback?: number;
  stale_applications_count?: number;
  stage_distribution?: Record<string, number>;
  top_follow_ups?: FollowUpItem[];
}

export interface CreateJobPayload {
  title: string;
  company: string;
  description: string;
  required_skills: string[];
  location: string;
  work_mode: 'remote' | 'hybrid' | 'onsite';
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship';
  experience_level: string;
  status: RecruiterJobStatus;
  deadline?: string;
  salary_range?: string;
}

export interface UpdateJobPayload {
  title?: string;
  company?: string;
  description?: string;
  required_skills?: string[];
  location?: string;
  work_mode?: 'remote' | 'hybrid' | 'onsite';
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'internship';
  experience_level?: string;
  status?: RecruiterJobStatus;
  deadline?: string;
  salary_range?: string;
}

export interface ScheduleInterviewPayload {
  application_id: string;
  scheduled_at: string;
  timezone: string;
  interview_format: 'video' | 'in_person' | 'phone';
  meeting_link?: string;
  feedback?: string;
  advance_stage?: boolean;
}

export interface UpdateInterviewPayload {
  scheduled_at?: string;
  timezone?: string;
  interview_format?: 'video' | 'in_person' | 'phone';
  status?: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  meeting_link?: string;
  feedback?: string;
}

// ============================================================================
// Phase 4B: Resume Intelligence & Job-Specific Analysis Types
// ============================================================================

export interface DetectedEducation {
  institution?: string;
  degree?: string;
  field_of_study?: string;
  year?: string;
  raw_text?: string;
}

export interface DetectedExperience {
  title?: string;
  company?: string;
  duration?: string;
  summary?: string;
}

export interface DetectedProject {
  title?: string;
  technologies: string[];
  description?: string;
}

export interface SectionPresence {
  has_contact_info: boolean;
  has_summary: boolean;
  has_skills: boolean;
  has_experience: boolean;
  has_education: boolean;
  has_projects: boolean;
  has_certifications: boolean;
}

export interface ProfileDiscrepancy {
  category: 'skills' | 'education' | 'experience' | 'general';
  description: string;
  profile_value?: string;
  resume_value?: string;
  recommendation: string;
}

export interface ResumeAnalysisResponse {
  resume_path: string;
  filename: string;
  file_size_bytes: number;
  page_count: number;
  word_count: number;
  is_readable: boolean;
  is_scanned_or_empty: boolean;
  limitation_notice?: string;
  detected_skills: string[];
  detected_education: DetectedEducation[];
  detected_experience: DetectedExperience[];
  detected_projects: DetectedProject[];
  detected_certifications: string[];
  professional_summary?: string;
  sections_detected: SectionPresence;
  strengths: string[];
  areas_for_improvement: string[];
  profile_discrepancies: ProfileDiscrepancy[];
  disclaimer: string;
}

export interface JobSpecificResumeAnalysisResponse {
  job_id: string;
  job_title: string;
  job_company: string;
  resume_path: string;
  filename: string;
  is_readable: boolean;
  is_scanned_or_empty: boolean;
  limitation_notice?: string;
  job_required_skills: string[];
  skills_found_in_resume: string[];
  skills_not_detected_in_resume: string[];
  relevant_experience_evidence: string[];
  relevant_education_evidence: string[];
  tailoring_suggestions: string[];
  resume_improvements: string[];
  profile_vs_resume_notes: string[];
  profile_match_score?: number;
  disclaimer: string;
}

// ============================================================================
// Phase 4C: Follow-up Intelligence & Reminder Lifecycle Types
// ============================================================================

export type FollowUpCategory =
  | 'new_application'
  | 'stale_application'
  | 'upcoming_interview'
  | 'interview_feedback_pending'
  | 'candidate_action_required'
  | 'low_applicant_job';

export type FollowUpSeverity = 'high' | 'medium' | 'low';

export interface FollowUpItem {
  id: string;
  category: FollowUpCategory;
  severity: FollowUpSeverity;
  title: string;
  reason: string;
  suggested_action: string;
  candidate_id?: string;
  candidate_name?: string;
  candidate_email?: string;
  job_id?: string;
  job_title?: string;
  job_company?: string;
  application_id?: string;
  application_stage?: string;
  interview_id?: string;
  timestamp: string;
  days_elapsed?: number;
  target_link: string;
}

export interface RecruiterFollowUpCenterResponse {
  items: FollowUpItem[];
  total_count: number;
  high_priority_count: number;
  pending_reviews_count: number;
  stale_applications_count: number;
  upcoming_interviews_count: number;
  pending_feedback_count: number;
  low_applicant_jobs_count: number;
  generated_at: string;
}

export interface ProcessRemindersResult {
  reminders_sent: number;
  interviews_processed: number;
  errors: string[];
  message: string;
}


