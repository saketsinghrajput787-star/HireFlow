import {
  BackendHealth,
  UserProfile,
  CandidateProfile,
  JobItem,
  JobListResponse,
  ApplicationItem,
  ApplicationDetail,
  InterviewItem,
  NotificationItem,
  StudentDashboardStats,
  RecruiterJob,
  RecruiterJobListResponse,
  RecruiterApplicant,
  RecruiterApplicantDetail,
  RecruiterInterview,
  RecruiterDashboardStats,
  CreateJobPayload,
  UpdateJobPayload,
  ScheduleInterviewPayload,
  UpdateInterviewPayload,
  ResumeAnalysisResponse,
  JobSpecificResumeAnalysisResponse,
  RecruiterFollowUpCenterResponse,
  ProcessRemindersResult,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  data: any;
  isNetworkError: boolean;

  constructor(message: string, status: number, data?: any, isNetworkError: boolean = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.isNetworkError = isNetworkError;
  }
}

async function safeFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    const msg = (err?.message || '').toLowerCase();
    const isConnRefused =
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('load failed') ||
      err?.name === 'TypeError';
    throw new ApiError(
      isConnRefused
        ? `Unable to connect to the HireFlow backend server. Please verify that the backend is running at ${API_BASE_URL}.`
        : (err?.message || 'Network request failed'),
      0,
      null,
      true
    );
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    let detail = data.detail;
    if (!detail) {
      if (response.status === 401) detail = 'Your session has expired. Please sign in again.';
      else if (response.status === 403) detail = 'Access denied: you do not have permission for this action.';
      else if (response.status === 404) detail = 'The requested resource was not found.';
      else detail = `Request failed with status ${response.status}`;
    }
    throw new ApiError(detail, response.status, data, false);
  }
  return data as T;
}

export const api = {
  // =========================================================================
  // Core & Health
  // =========================================================================
  async getHealth(): Promise<BackendHealth> {
    try {
      const response = await safeFetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        throw new ApiError(`Health check failed with status ${response.status}`, response.status);
      }
      return await response.json();
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(err.message || 'Failed to connect to backend service', 0, null, true);
    }
  },

  async getMe(accessToken: string): Promise<UserProfile> {
    const response = await safeFetch(`${API_BASE_URL}/api/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<UserProfile>(response);
  },

  async checkRecruiterAccess(accessToken: string): Promise<UserProfile> {
    const response = await safeFetch(`${API_BASE_URL}/api/recruiter-check`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<UserProfile>(response);
  },

  async checkStudentAccess(accessToken: string): Promise<UserProfile> {
    const response = await safeFetch(`${API_BASE_URL}/api/student-check`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<UserProfile>(response);
  },

  // =========================================================================
  // Student Profile & Resume
  // =========================================================================
  async getStudentProfile(accessToken: string): Promise<CandidateProfile> {
    const response = await safeFetch(`${API_BASE_URL}/api/student/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<CandidateProfile>(response);
  },

  async updateStudentProfile(accessToken: string, payload: Partial<CandidateProfile>): Promise<CandidateProfile> {
    const response = await safeFetch(`${API_BASE_URL}/api/student/profile`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<CandidateProfile>(response);
  },

  async recordResumeMetadata(accessToken: string, resumePath: string): Promise<CandidateProfile> {
    const response = await safeFetch(`${API_BASE_URL}/api/student/resume/metadata`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resume_path: resumePath }),
    });
    return handleResponse<CandidateProfile>(response);
  },

  async removeResumeMetadata(accessToken: string): Promise<CandidateProfile> {
    const response = await safeFetch(`${API_BASE_URL}/api/student/resume`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<CandidateProfile>(response);
  },

  async getResumeAnalysis(accessToken: string): Promise<ResumeAnalysisResponse> {
    const response = await safeFetch(`${API_BASE_URL}/api/student/resume/analysis`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<ResumeAnalysisResponse>(response);
  },

  async analyzeResumeAgainstJob(accessToken: string, jobId: string): Promise<JobSpecificResumeAnalysisResponse> {
    const response = await safeFetch(`${API_BASE_URL}/api/student/resume/analyze-job`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ job_id: jobId }),
    });
    return handleResponse<JobSpecificResumeAnalysisResponse>(response);
  },

  // =========================================================================
  // Jobs
  // =========================================================================
  async getJobs(accessToken?: string, params?: Record<string, any>): Promise<JobListResponse> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await safeFetch(`${API_BASE_URL}/api/jobs?${query.toString()}`, { headers });
    return handleResponse<JobListResponse>(response);
  },

  async getJobDetail(jobId: string, accessToken?: string): Promise<JobItem> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await safeFetch(`${API_BASE_URL}/api/jobs/${jobId}`, { headers });
    return handleResponse<JobItem>(response);
  },

  async applyToJob(accessToken: string, jobId: string, notes?: string): Promise<{ application_id: string; stage: string; message: string }> {
    const response = await safeFetch(`${API_BASE_URL}/api/jobs/${jobId}/apply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notes: notes || null }),
    });
    return handleResponse<{ application_id: string; stage: string; message: string }>(response);
  },

  // =========================================================================
  // Student Applications & Dashboard
  // =========================================================================
  async getStudentApplications(accessToken: string): Promise<ApplicationItem[]> {
    const response = await safeFetch(`${API_BASE_URL}/api/student/applications`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<ApplicationItem[]>(response);
  },

  async getStudentApplicationDetail(accessToken: string, applicationId: string): Promise<ApplicationDetail> {
    const response = await safeFetch(`${API_BASE_URL}/api/student/applications/${applicationId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<ApplicationDetail>(response);
  },

  async getStudentInterviews(accessToken: string): Promise<InterviewItem[]> {
    const response = await safeFetch(`${API_BASE_URL}/api/student/interviews`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<InterviewItem[]>(response);
  },

  async getStudentNotifications(accessToken: string): Promise<NotificationItem[]> {
    const response = await safeFetch(`${API_BASE_URL}/api/student/notifications`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<NotificationItem[]>(response);
  },

  async markNotificationRead(accessToken: string, notificationId: string): Promise<void> {
    const response = await safeFetch(`${API_BASE_URL}/api/student/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<void>(response);
  },

  async markAllNotificationsRead(accessToken: string): Promise<boolean> {
    const response = await safeFetch(`${API_BASE_URL}/api/student/notifications/read-all`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await handleResponse<{ success: boolean }>(response);
    return data.success;
  },

  async getStudentDashboardStats(accessToken: string): Promise<StudentDashboardStats> {
    const response = await safeFetch(`${API_BASE_URL}/api/student/dashboard-stats`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<StudentDashboardStats>(response);
  },

  // =========================================================================
  // Phase 3: Recruiter Workspace API Endpoints
  // =========================================================================

  async getRecruiterDashboard(accessToken: string): Promise<RecruiterDashboardStats> {
    const response = await safeFetch(`${API_BASE_URL}/api/recruiter/dashboard`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<RecruiterDashboardStats>(response);
  },

  async getRecruiterJobs(accessToken: string, status?: string): Promise<RecruiterJobListResponse> {
    const url = new URL(`${API_BASE_URL}/api/recruiter/jobs`);
    if (status) url.searchParams.append('status', status);

    const response = await safeFetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<RecruiterJobListResponse>(response);
  },

  async createRecruiterJob(accessToken: string, payload: CreateJobPayload): Promise<RecruiterJob> {
    const response = await safeFetch(`${API_BASE_URL}/api/recruiter/jobs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<RecruiterJob>(response);
  },

  async getRecruiterJobDetail(accessToken: string, jobId: string): Promise<RecruiterJob> {
    const response = await safeFetch(`${API_BASE_URL}/api/recruiter/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<RecruiterJob>(response);
  },

  async updateRecruiterJob(accessToken: string, jobId: string, payload: UpdateJobPayload): Promise<RecruiterJob> {
    const response = await safeFetch(`${API_BASE_URL}/api/recruiter/jobs/${jobId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<RecruiterJob>(response);
  },

  async deleteRecruiterJob(accessToken: string, jobId: string): Promise<{ message: string; job_id: string }> {
    const response = await safeFetch(`${API_BASE_URL}/api/recruiter/jobs/${jobId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<{ message: string; job_id: string }>(response);
  },

  async getRecruiterApplicants(
    accessToken: string,
    params?: { jobId?: string; stage?: string; search?: string; sortBy?: string }
  ): Promise<{ items: RecruiterApplicant[]; total: number }> {
    const url = new URL(`${API_BASE_URL}/api/recruiter/applications`);
    if (params?.jobId) url.searchParams.append('job_id', params.jobId);
    if (params?.stage) url.searchParams.append('stage', params.stage);
    if (params?.search) url.searchParams.append('search', params.search);
    if (params?.sortBy) url.searchParams.append('sort_by', params.sortBy);

    const response = await safeFetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<{ items: RecruiterApplicant[]; total: number }>(response);
  },

  async getRecruiterApplicantDetail(accessToken: string, applicationId: string): Promise<RecruiterApplicantDetail> {
    const response = await safeFetch(`${API_BASE_URL}/api/recruiter/applications/${applicationId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<RecruiterApplicantDetail>(response);
  },

  async getRecruiterApplicantResumeUrl(accessToken: string, applicationId: string): Promise<{
    application_id: string;
    student_id: string;
    resume_path: string;
    resume_url: string;
    filename: string;
  }> {
    const response = await safeFetch(`${API_BASE_URL}/api/recruiter/applications/${applicationId}/resume-url`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<{
      application_id: string;
      student_id: string;
      resume_path: string;
      resume_url: string;
      filename: string;
    }>(response);
  },

  async updateApplicationStage(
    accessToken: string,
    applicationId: string,
    stage: string,
    notes?: string
  ): Promise<{ message: string; stage: string }> {
    const response = await safeFetch(`${API_BASE_URL}/api/recruiter/applications/${applicationId}/stage`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stage, notes }),
    });
    return handleResponse<{ message: string; stage: string }>(response);
  },

  async getRecruiterInterviews(accessToken: string, status?: string): Promise<{ items: RecruiterInterview[]; total: number }> {
    const url = new URL(`${API_BASE_URL}/api/recruiter/interviews`);
    if (status) url.searchParams.append('status', status);

    const response = await safeFetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<{ items: RecruiterInterview[]; total: number }>(response);
  },

  async scheduleInterview(accessToken: string, payload: ScheduleInterviewPayload): Promise<RecruiterInterview> {
    const response = await safeFetch(`${API_BASE_URL}/api/recruiter/interviews`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<RecruiterInterview>(response);
  },

  async updateInterview(accessToken: string, interviewId: string, payload: UpdateInterviewPayload): Promise<{ message: string; id: string }> {
    const response = await safeFetch(`${API_BASE_URL}/api/recruiter/interviews/${interviewId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ message: string; id: string }>(response);
  },

  async getRecruiterFollowUps(accessToken: string): Promise<RecruiterFollowUpCenterResponse> {
    const response = await safeFetch(`${API_BASE_URL}/api/recruiter/follow-ups`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<RecruiterFollowUpCenterResponse>(response);
  },

  async processInterviewReminders(accessToken: string): Promise<ProcessRemindersResult> {
    const response = await safeFetch(`${API_BASE_URL}/api/recruiter/follow-ups/process-reminders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<ProcessRemindersResult>(response);
  },
};
