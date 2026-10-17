import { BackendHealth, UserProfile } from '../types';

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

export const api = {
  /**
   * Check backend health status
   */
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

  /**
   * Fetch authoritative user profile and role from FastAPI backend
   */
  async getMe(accessToken: string): Promise<UserProfile> {
    const response = await fetch(`${API_BASE_URL}/api/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(
        data.detail || `Authentication request failed (${response.status})`,
        response.status,
        data
      );
    }

    return data as UserProfile;
  },

  /**
   * Verify recruiter authorization on the backend
   */
  async checkRecruiterAccess(accessToken: string): Promise<UserProfile> {
    const response = await fetch(`${API_BASE_URL}/api/recruiter-check`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(
        data.detail || `Recruiter access check failed (${response.status})`,
        response.status,
        data
      );
    }

    return data as UserProfile;
  },
};
