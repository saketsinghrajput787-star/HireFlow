import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { api } from '../services/api';
import { UserProfile } from '../types';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  session: any | null;
  loading: boolean;
  error: string | null;
  signInStudent: (email: string, password: string) => Promise<void>;
  signUpStudent: (email: string, password: string, fullName: string) => Promise<void>;
  signInRecruiter: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch authoritative user profile and role from the backend
   */
  const loadAuthoritativeProfile = async (accessToken: string, currentUser: any) => {
    try {
      const authProfile = await api.getMe(accessToken);
      setProfile(authProfile);
      return authProfile;
    } catch (err: any) {
      console.warn('Backend profile resolution unavailable, falling back to local metadata:', err.message);
      // Fallback for when backend might be starting or offline
      const fallbackProfile: UserProfile = {
        id: currentUser.id,
        email: currentUser.email || '',
        full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
        role: 'student', // Public default is strictly student
      };
      setProfile(fallbackProfile);
      return fallbackProfile;
    }
  };

  /**
   * Listen to Supabase auth state changes and initial session
   */
  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          await loadAuthoritativeProfile(initialSession.access_token, initialSession.user);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (err: any) {
        if (mounted) {
          console.error('Session initialization error:', err);
          setError(err.message);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;

        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          await loadAuthoritativeProfile(newSession.access_token, newSession.user);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  /**
   * Student Login
   */
  const signInStudent = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase credentials are not configured. Please update your environment variables.');
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      if (!data.session || !data.user) throw new Error('No session returned after login');

      setSession(data.session);
      setUser(data.user);
      await loadAuthoritativeProfile(data.session.access_token, data.user);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Student Public Signup
   * Security Rule: Public signup strictly registers accounts with role 'student'.
   */
  const signUpStudent = async (email: string, password: string, fullName: string) => {
    setError(null);
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase credentials are not configured. Please update your environment variables.');
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'student', // Hardcoded constraint
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.session && data.user) {
        setSession(data.session);
        setUser(data.user);
        await loadAuthoritativeProfile(data.session.access_token, data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create student account');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Recruiter Login
   * Security Rule: Authenticates, then immediately checks authoritative role.
   * If the account role is not 'recruiter' or 'admin', reject and sign out immediately.
   */
  const signInRecruiter = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase credentials are not configured. Please update your environment variables.');
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      if (!data.session || !data.user) throw new Error('No session returned after login');

      // Resolve authoritative role from backend
      const authProfile = await loadAuthoritativeProfile(data.session.access_token, data.user);

      if (authProfile.role !== 'recruiter' && authProfile.role !== 'admin') {
        // Enforce boundary: Immediately terminate session for unauthorized role
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);

        const unauthorizedMsg =
          'Access Denied: This account does not possess authorized recruiter privileges. ' +
          'Student accounts must log in via the Student Portal.';
        setError(unauthorizedMsg);
        throw new Error(unauthorizedMsg);
      }

      setSession(data.session);
      setUser(data.user);
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate recruiter');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign Out
   */
  const signOut = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Sign out warning:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setSession(null);
      setError(null);
    }
  };

  /**
   * Password Reset
   */
  const resetPassword = async (email: string) => {
    setError(null);
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase credentials are not configured.');
      }
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/student/login`,
      });
      if (resetError) throw resetError;
    } catch (err: any) {
      setError(err.message || 'Password reset request failed');
      throw err;
    }
  };

  const clearError = () => setError(null);

  const refreshProfile = async () => {
    if (session?.access_token && user) {
      await loadAuthoritativeProfile(session.access_token, user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        error,
        signInStudent,
        signUpStudent,
        signInRecruiter,
        signOut,
        resetPassword,
        clearError,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
