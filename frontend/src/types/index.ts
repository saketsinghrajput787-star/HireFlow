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
