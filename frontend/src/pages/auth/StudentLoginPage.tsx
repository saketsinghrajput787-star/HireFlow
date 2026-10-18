import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Alert } from '../../components/Alert';
import { GraduationCap, ArrowRight, Loader2, Lock, Mail, Shield, User } from 'lucide-react';

export const StudentLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { signInStudent, error, clearError, session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Strict route isolation: Ensure redirect strictly stays within the student portal
  const rawFrom = location.state?.from?.pathname;
  const targetPath =
    rawFrom &&
    rawFrom.startsWith('/student') &&
    !rawFrom.includes('/login') &&
    !rawFrom.includes('/signup')
      ? rawFrom
      : '/student/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await signInStudent(email, password);
      // Redirect to /student/dashboard only after verified role
      navigate(targetPath, { replace: true });
    } catch (err: any) {
      setLocalError(err.message || 'Failed to sign in. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeError = localError || error;

  const isRecruiterError = activeError?.toLowerCase().includes('recruiter account');

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Sign In</h1>
          <p className="mt-2 text-sm text-slate-600">
            Access your candidate dashboard, job applications, and interview schedules.
          </p>
        </div>

        {/* Existing Session Notice */}
        {session && profile && (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Active Session: {profile.email}
              </span>
              <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                {profile.role}
              </span>
            </div>
            {profile.role === 'student' ? (
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-600">You are already signed in.</span>
                <div className="flex items-center gap-3">
                  <Link
                    to="/student/dashboard"
                    className="font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                  >
                    Dashboard <ArrowRight className="w-3 h-3" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="text-rose-600 hover:text-rose-700 font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 gap-2">
                <span>
                  This is a recruiter account. Sign in below with your student account, or{' '}
                  <Link to="/recruiter/dashboard" className="font-bold underline hover:text-amber-900">
                    switch to Recruiter Dashboard
                  </Link>
                  .
                </span>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold whitespace-nowrap"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}

        {activeError && (
          <div className="space-y-2">
            <Alert
              type="error"
              title={isRecruiterError ? 'Recruiter Account Detected' : 'Authentication Error'}
              message={activeError}
              onClose={() => {
                setLocalError(null);
                clearError();
              }}
            />
            {isRecruiterError && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
                <span>Are you a hiring manager or recruiter?</span>
                <Link
                  to="/recruiter/login"
                  className="font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
                >
                  Recruiter Login <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <div>
            <label htmlFor="student-email" className="block text-sm font-medium text-slate-700">
              Email Address
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="student-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="student-password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
              >
                Forgot password?
              </Link>
            </div>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="student-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3 text-center text-sm text-slate-600">
          <div>
            Don't have an account?{' '}
            <Link to="/student/signup" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Sign up as a Student
            </Link>
          </div>
          <div className="text-xs text-slate-400 pt-2 border-t border-slate-50 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            Recruiter or Enterprise Admin?{' '}
            <Link to="/recruiter/login" className="font-medium text-slate-600 hover:text-indigo-600 underline">
              Recruiter Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
