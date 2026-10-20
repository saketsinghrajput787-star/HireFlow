import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { api } from '../services/api';
import { UserProfile } from '../types';

export interface SignUpResult {
  session: any | null;
  user: any | null;
  profile: UserProfile | null;
  requiresConfirmation: boolean;
}

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  session: any | null;
  loading: boolean;
  error: string | null;
  signInStudent: (email: string, password: string) => Promise<void>;
  signUpStudent: (email: string, password: string, fullName: string) => Promise<SignUpResult>;
  signInRecruiter: (email: string, password: string) => Promise<void>;
  signInDemoRecruiter: () => Promise<void>;
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
  const isAuthenticatingRef = useRef<boolean>(false);

  /**
   * Fetch authoritative user profile and role.
   * Priority:
   * 1. FastAPI backend /api/me (cryptographic token verification and service-role database lookup)
   * 2. Direct Supabase database query (if backend is offline/unreachable; permitted under RLS profiles_select_own)
   */
  const loadAuthoritativeProfile = async (
    accessToken: string,
    currentUser: any,
    retryCount: number = 1
  ): Promise<UserProfile> => {
    // 1. Try FastAPI backend /api/me
    try {
      const authProfile = await api.getMe(accessToken);
      if (!authProfile || !authProfile.role) {
        throw new Error('Invalid profile response from backend service');
      }
      setProfile(authProfile);
      return authProfile;
    } catch (backendErr: any) {
      if (backendErr.status === 401) {
        throw backendErr;
      }

      // If backend reports 404 and retries remain, retry after brief delay to allow database trigger completion
      if (backendErr.status === 404 && retryCount > 0) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        return loadAuthoritativeProfile(accessToken, currentUser, retryCount - 1);
      }

      console.warn('Backend /api/me unavailable or returned error, attempting direct Supabase profile resolution:', backendErr.message);

      // 2. Direct Supabase query fallback for offline/unreachable backend
      try {
        const { data: profileRow, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, role, created_at')
          .eq('id', currentUser.id)
          .maybeSingle();

        if (profileError) {
          console.warn('Direct Supabase profile resolution error:', profileError.message);
          throw profileError;
        }

        if (!profileRow) {
          if (retryCount > 0) {
            await new Promise((resolve) => setTimeout(resolve, 350));
            return loadAuthoritativeProfile(accessToken, currentUser, retryCount - 1);
          }
          const notFoundError: any = new Error(
            'Profile Record Missing: Your account exists in authentication, but no record was found in public.profiles. Please contact the administrator to initialize your profile record.'
          );
          notFoundError.status = 404;
          throw notFoundError;
        }

        const resolvedProfile: UserProfile = {
          id: profileRow.id,
          email: currentUser.email || '',
          full_name: profileRow.full_name || currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
          role: profileRow.role || 'student',
          created_at: profileRow.created_at,
        };
        setProfile(resolvedProfile);
        return resolvedProfile;
      } catch (dbErr: any) {
        if (dbErr.status === 404) {
          throw dbErr;
        }
        console.error('Direct profile resolution failed:', dbErr);
        throw new Error('Unable to reach backend or database service to verify user profile. Please check your connection.');
      }
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
          try {
            await loadAuthoritativeProfile(initialSession.access_token, initialSession.user);
          } catch (profileErr: any) {
            console.warn('Profile load on init warning:', profileErr.message);
          }
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
      async (event, newSession) => {
        if (!mounted) return;

        // If manual sign-in is actively verifying roles, do not overwrite state prematurely
        if (isAuthenticatingRef.current) {
          return;
        }

        if (event === 'SIGNED_OUT' || !newSession?.user) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          try {
            await loadAuthoritativeProfile(newSession.access_token, newSession.user);
          } catch (profileErr: any) {
            console.warn('Profile load on auth change warning:', profileErr.message);
          } finally {
            if (mounted) setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  /**
   * Student Login
   * Security Rule: Authenticates, then immediately checks authoritative role.
   * If the account role is 'recruiter', reject and sign out immediately.
   */
  const signInStudent = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    isAuthenticatingRef.current = true;
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase credentials are not configured. Please update your environment variables.');
      }

      const cleanEmail = email.trim();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) {
        const msg = (signInError.message || '').toLowerCase();
        const code = (signInError as any).code || (signInError as any).error_code || '';

        if (code === 'invalid_credentials' || msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
          throw new Error('Invalid email or password. Please verify your credentials or register a student account.');
        }

        if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
          throw new Error('Email confirmation is required. Please check your inbox for the confirmation link.');
        }

        throw signInError;
      }

      if (!data.session || !data.user) throw new Error('No session returned after login');

      // Resolve authoritative profile
      let authProfile: UserProfile;
      try {
        // Attempt trusted backend student check first if possible
        try {
          authProfile = await api.checkStudentAccess(data.session.access_token);
        } catch (chkErr: any) {
          if (chkErr.status === 403) {
            // Backend explicitly rejected: user is a recruiter
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setProfile(null);
            const roleMsg = 'This is a recruiter account. Please use Recruiter Login.';
            setError(roleMsg);
            throw new Error(roleMsg);
          }
          // Fallback to loadAuthoritativeProfile
          authProfile = await loadAuthoritativeProfile(data.session.access_token, data.user);
        }
      } catch (err: any) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        throw err;
      }

      // Strict role verification for Student Portal
      if (authProfile.role === 'recruiter') {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        const recruiterMsg = 'This is a recruiter account. Please use Recruiter Login.';
        setError(recruiterMsg);
        throw new Error(recruiterMsg);
      }

      if (authProfile.role !== 'student' && authProfile.role !== 'admin') {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        const unauthorizedMsg = 'Access denied: this portal requires a student account.';
        setError(unauthorizedMsg);
        throw new Error(unauthorizedMsg);
      }

      setSession(data.session);
      setUser(data.user);
      setProfile(authProfile);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      throw err;
    } finally {
      isAuthenticatingRef.current = false;
      setLoading(false);
    }
  };

  /**
   * Student Public Signup
   * Security Rule: Public signup strictly registers accounts with role 'student'.
   */
  const signUpStudent = async (email: string, password: string, fullName: string): Promise<SignUpResult> => {
    setError(null);
    setLoading(true);
    isAuthenticatingRef.current = true;
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase credentials are not configured. Please update your environment variables.');
      }

      const cleanEmail = email.trim();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: 'student', // Hardcoded constraint
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!data.user) {
        throw new Error('No user data returned from registration service.');
      }

      // Check if Supabase returned a dummy user for already-registered email
      if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('An account with this email address already exists. Please sign in or reset your password.');
      }

      if (data.session && data.user) {
        setSession(data.session);
        setUser(data.user);
        let resolvedProfile: UserProfile;
        try {
          resolvedProfile = await loadAuthoritativeProfile(data.session.access_token, data.user);
        } catch (profileErr: any) {
          console.warn('Profile load after student signup warning:', profileErr);
          throw new Error(
            profileErr.message || 'Account created, but student profile record could not be loaded. Please try signing in.'
          );
        }

        // Strict role validation
        if (resolvedProfile.role !== 'student' && resolvedProfile.role !== 'admin') {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setProfile(null);
          throw new Error('Access denied: account created is not authorized as a student.');
        }

        return {
          session: data.session,
          user: data.user,
          profile: resolvedProfile,
          requiresConfirmation: false,
        };
      }

      // Email confirmation required or session not established
      setSession(null);
      setUser(null);
      setProfile(null);
      return {
        session: null,
        user: data.user,
        profile: null,
        requiresConfirmation: true,
      };
    } catch (err: any) {
      setError(err.message || 'Failed to create student account');
      throw err;
    } finally {
      isAuthenticatingRef.current = false;
      setLoading(false);
    }
  };

  /**
   * Recruiter Login
   * Security Rule: Authenticates, then immediately checks authoritative role.
   * If the account role is 'student', reject and sign out immediately.
   */
  const signInRecruiter = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    isAuthenticatingRef.current = true;
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase credentials are not configured. Please update your environment variables.');
      }

      const cleanEmail = email.trim();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (signInError) {
        const msg = (signInError.message || '').toLowerCase();
        const code = (signInError as any).code || (signInError as any).error_code || '';

        if (code === 'invalid_credentials' || msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
          throw new Error(
            'Invalid email or password. Please verify your credentials. If you have not registered an account yet, you must first create one via Student Signup, as recruiter privileges are provisioned from an existing account.'
          );
        }

        if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
          throw new Error(
            'Email confirmation is required before signing in. Please check your inbox for the confirmation link or contact the administrator.'
          );
        }

        if (code === 'over_email_send_rate_limit' || msg.includes('rate limit')) {
          throw new Error('Too many login attempts. Please wait a few minutes before trying again.');
        }

        if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch')) {
          throw new Error('Unable to connect to the authentication server. Please check your network connection.');
        }

        throw new Error(signInError.message || 'Authentication failed. Please verify your recruiter credentials.');
      }

      if (!data.session || !data.user) {
        throw new Error('Authentication failed: No session returned from authentication provider.');
      }

      // Resolve authoritative role from backend (or direct Supabase fallback)
      let authProfile: UserProfile;
      try {
        // Attempt trusted backend recruiter authorization check first
        try {
          authProfile = await api.checkRecruiterAccess(data.session.access_token);
        } catch (chkErr: any) {
          if (chkErr.status === 403) {
            // Backend rejected: student account attempting recruiter login
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setProfile(null);
            const roleMsg = 'This is a student account. Please use Student Login.';
            setError(roleMsg);
            throw new Error(roleMsg);
          }
          // Fallback to loadAuthoritativeProfile
          authProfile = await loadAuthoritativeProfile(data.session.access_token, data.user);
        }
      } catch (err: any) {
        // Sign out immediately so no unverified session remains
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);

        if (err.status === 404 || err.message?.toLowerCase().includes('not found') || err.message?.toLowerCase().includes('profile record missing')) {
          const missingMsg =
            'Profile Record Missing: Your account exists in authentication, but no record was found in public.profiles. Please contact the administrator to initialize your profile record.';
          setError(missingMsg);
          throw new Error(missingMsg);
        }

        if (err.status === 401 || err.message?.toLowerCase().includes('token') || err.message?.toLowerCase().includes('session')) {
          const sessionMsg = 'Your session has expired or is invalid. Please sign in again.';
          setError(sessionMsg);
          throw new Error(sessionMsg);
        }

        throw err;
      }

      // Strict role verification for Recruiter Portal
      if (authProfile.role === 'student') {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);

        const studentMsg = 'This is a student account. Please use Student Login.';
        setError(studentMsg);
        throw new Error(studentMsg);
      }

      if (authProfile.role !== 'recruiter' && authProfile.role !== 'admin') {
        // Enforce boundary: Immediately terminate session for unauthorized role
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);

        const unauthorizedMsg =
          'Your account is not authorized as a recruiter. Contact the administrator.';
        setError(unauthorizedMsg);
        throw new Error(unauthorizedMsg);
      }

      setSession(data.session);
      setUser(data.user);
      setProfile(authProfile);
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate recruiter');
      throw err;
    } finally {
      isAuthenticatingRef.current = false;
      setLoading(false);
    }
  };

  /**
   * One-Click Evaluator Demo Recruiter Login
   * Requests server-side authenticated session for the pre-provisioned demo recruiter account.
   * Sets session in Supabase client and verifies authoritative recruiter role.
   */
  const signInDemoRecruiter = async () => {
    setError(null);
    setLoading(true);
    isAuthenticatingRef.current = true;
    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase credentials are not configured. Please update your environment variables.');
      }

      // Request server-side authenticated demo session
      const demoData = await api.demoRecruiterLogin();
      if (!demoData || !demoData.access_token) {
        throw new Error('Failed to retrieve authentication session from demo recruiter service.');
      }

      // Establish session in Supabase client
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token: demoData.access_token,
        refresh_token: demoData.refresh_token,
      });

      if (sessionError) {
        throw sessionError;
      }

      const activeSession = sessionData.session || {
        access_token: demoData.access_token,
        refresh_token: demoData.refresh_token,
        user: demoData.user,
      };
      const activeUser = sessionData.user || demoData.user;

      // Authoritative role validation
      let authProfile: UserProfile = demoData.profile;
      try {
        authProfile = await api.checkRecruiterAccess(activeSession.access_token);
      } catch (chkErr: any) {
        if (!authProfile || authProfile.role !== 'recruiter') {
          authProfile = await loadAuthoritativeProfile(activeSession.access_token, activeUser);
        }
      }

      // Strict role verification
      if (authProfile.role !== 'recruiter' && authProfile.role !== 'admin') {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        const unauthorizedMsg = 'Access denied: Demo account is not authorized as a recruiter.';
        setError(unauthorizedMsg);
        throw new Error(unauthorizedMsg);
      }

      setSession(activeSession);
      setUser(activeUser);
      setProfile(authProfile);
    } catch (err: any) {
      console.error('Demo recruiter login failed:', err);
      const friendlyMessage =
        err.message || 'Unable to authenticate as demo recruiter. Please try again or use manual credentials.';
      setError(friendlyMessage);
      throw err;
    } finally {
      isAuthenticatingRef.current = false;
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
        signInDemoRecruiter,
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
