import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Alert } from '../../components/Alert';
import { Briefcase, ArrowRight, Loader2, Lock, Mail, ShieldAlert, GraduationCap, User, Sparkles } from 'lucide-react';

export const RecruiterLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { signInRecruiter, signInDemoRecruiter, error, clearError, session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Strict route isolation: Ensure redirect strictly stays within recruiter workspace
  const rawFrom = location.state?.from?.pathname;
  const targetPath =
    rawFrom &&
    rawFrom.startsWith('/recruiter') &&
    !rawFrom.includes('/login')
      ? rawFrom
      : '/recruiter/dashboard';

  const handleDemoLogin = async () => {
    setLocalError(null);
    clearError();
    setDemoSubmitting(true);
    try {
      await signInDemoRecruiter();
      navigate(targetPath, { replace: true });
    } catch (err: any) {
      setLocalError(
        err.message || 'Demo recruiter authentication failed. Please try again or use enterprise credentials.'
      );
    } finally {
      setDemoSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Please enter both your recruiter email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await signInRecruiter(email, password);
      // Redirect to /recruiter/dashboard only after verified role
      navigate(targetPath, { replace: true });
    } catch (err: any) {
      setLocalError(err.message || 'Authentication failed. Please verify your recruiter credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const getErrorTitle = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes('student account')) {
      return 'Student Account Detected';
    }
    if (lower.includes('not authorized as a recruiter') || lower.includes('access denied')) {
      return 'Authorization Required';
    }
    if (lower.includes('email confirmation')) {
      return 'Email Confirmation Required';
    }
    if (lower.includes('profile record missing') || lower.includes('not found in public.profiles')) {
      return 'Profile Record Missing';
    }
    if (lower.includes('session') || lower.includes('token')) {
      return 'Session Expired';
    }
    if (lower.includes('connection') || lower.includes('network') || lower.includes('unable to reach') || lower.includes('unable to connect')) {
      return 'Connection Error';
    }
    if (lower.includes('too many login attempts')) {
      return 'Rate Limit Exceeded';
    }
    return 'Authentication Failed';
  };

  const activeError = localError || error;
  const isStudentError = activeError?.toLowerCase().includes('student account');

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-center">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Briefcase className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Recruiter Portal</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in with your enterprise credentials to manage jobs and applicants.
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
            {profile.role === 'recruiter' ? (
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-600">You are already signed in.</span>
                <div className="flex items-center gap-3">
                  <Link
                    to="/recruiter/dashboard"
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
                  This is a student account. Sign in below with your recruiter credentials, or{' '}
                  <Link to="/student/dashboard" className="font-bold underline hover:text-amber-900">
                    return to Student Dashboard
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

        {/* Security Warning Notice */}
        <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 leading-relaxed">
            <p className="font-semibold mb-0.5">Restricted Access Notice</p>
            This portal is restricted to authorized recruiters. If you are a student, please sign in via the{' '}
            <Link to="/student/login" className="underline font-medium hover:text-amber-900">
              Student Portal
            </Link>
            . Public signup is disabled for recruiters.
          </div>
        </div>

        {/* Evaluator Demo Recruiter Access */}
        <div className="bg-gradient-to-br from-indigo-50/90 to-slate-50 border border-indigo-100 p-4 rounded-xl shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-600" />
              Evaluator Demo
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Pre-Configured Access</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Evaluating HireFlow? Continue directly to the recruiter demo.
          </p>
          <button
            type="button"
            id="demo-recruiter-login-btn"
            onClick={handleDemoLogin}
            disabled={submitting || demoSubmitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
          >
            {demoSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Authenticating Demo Recruiter...
              </>
            ) : (
              <>
                Continue as Demo Recruiter <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2.5 text-slate-400 font-medium tracking-wider">
              Or sign in with enterprise credentials
            </span>
          </div>
        </div>

        {activeError && (
          <div className="space-y-2">
            <Alert
              type="error"
              title={getErrorTitle(activeError)}
              message={activeError}
              onClose={() => {
                setLocalError(null);
                clearError();
              }}
            />
            {isStudentError && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                <span>Looking for student jobs and applications?</span>
                <Link
                  to="/student/login"
                  className="font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  Student Login <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          <div>
            <label htmlFor="recruiter-email" className="block text-sm font-medium text-slate-700">
              Enterprise Email
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="recruiter-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="recruiter@company.com"
                className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="recruiter-password" className="block text-sm font-medium text-slate-700">
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
                id="recruiter-password"
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
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying Authoritative Role...
              </>
            ) : (
              <>
                Sign In as Recruiter <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3 text-center text-xs text-slate-500">
          <div>
            Need a recruiter account? Contact your HireFlow workspace administrator for provisioning.
          </div>
          <div className="pt-2 border-t border-slate-50 flex items-center justify-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
            Are you a student or candidate?{' '}
            <Link to="/student/login" className="font-semibold text-indigo-600 hover:text-indigo-700 underline">
              Sign In as Student
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
