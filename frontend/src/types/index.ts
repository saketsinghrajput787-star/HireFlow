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

export interface InterviewItem {
  id: string;
  application_id: string;
  scheduled_at: string;
  timezone: string;
  interview_format: 'video' | 'in_person' | 'phone';
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
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
}
