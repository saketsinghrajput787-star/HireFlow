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
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      data.detail || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }
  return data as T;
}

export const api = {
  // =========================================================================
  // Core & Health
  // =========================================================================
  async getHealth(): Promise<BackendHealth> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        throw new ApiError(`Health check failed with status ${response.status}`, response.status);
      }
      return await response.json();
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(err.message || 'Failed to connect to backend service', 0);
    }
  },

  async getMe(accessToken: string): Promise<UserProfile> {
    const response = await fetch(`${API_BASE_URL}/api/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<UserProfile>(response);
  },

  async checkRecruiterAccess(accessToken: string): Promise<UserProfile> {
    const response = await fetch(`${API_BASE_URL}/api/recruiter-check`, {
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
    const response = await fetch(`${API_BASE_URL}/api/student/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<CandidateProfile>(response);
  },

  async updateStudentProfile(accessToken: string, payload: Partial<CandidateProfile>): Promise<CandidateProfile> {
    const response = await fetch(`${API_BASE_URL}/api/student/profile`, {
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
    const response = await fetch(`${API_BASE_URL}/api/student/resume/metadata`, {
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
    const response = await fetch(`${API_BASE_URL}/api/student/resume`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<CandidateProfile>(response);
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

    const response = await fetch(`${API_BASE_URL}/api/jobs?${query.toString()}`, { headers });
    return handleResponse<JobListResponse>(response);
  },

  async getJobDetail(jobId: string, accessToken?: string): Promise<JobItem> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, { headers });
    return handleResponse<JobItem>(response);
  },

  async applyToJob(accessToken: string, jobId: string, notes?: string): Promise<{ application_id: string; stage: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/apply`, {
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
    const response = await fetch(`${API_BASE_URL}/api/student/applications`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<ApplicationItem[]>(response);
  },

  async getStudentApplicationDetail(accessToken: string, applicationId: string): Promise<ApplicationDetail> {
    const response = await fetch(`${API_BASE_URL}/api/student/applications/${applicationId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<ApplicationDetail>(response);
  },

  async getStudentInterviews(accessToken: string): Promise<InterviewItem[]> {
    const response = await fetch(`${API_BASE_URL}/api/student/interviews`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<InterviewItem[]>(response);
  },

  async getStudentNotifications(accessToken: string): Promise<NotificationItem[]> {
    const response = await fetch(`${API_BASE_URL}/api/student/notifications`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<NotificationItem[]>(response);
  },

  async markNotificationRead(accessToken: string, notificationId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/student/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<void>(response);
  },

  async getStudentDashboardStats(accessToken: string): Promise<StudentDashboardStats> {
    const response = await fetch(`${API_BASE_URL}/api/student/dashboard-stats`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return handleResponse<StudentDashboardStats>(response);
  },
};
