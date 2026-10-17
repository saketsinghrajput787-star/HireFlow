import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Alert } from '../../components/Alert';
import { Briefcase, ArrowRight, Loader2, Lock, Mail, ShieldAlert } from 'lucide-react';

export const RecruiterLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { signInRecruiter, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/recruiter/dashboard';

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
      navigate(from, { replace: true });
    } catch (err: any) {
      setLocalError(err.message || 'Authentication failed. Please verify your recruiter credentials.');
    } finally {
      setSubmitting(false);
    }
  };

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

        {(localError || error) && (
          <Alert
            type="error"
            title="Authorization Failed"
            message={localError || error || ''}
            onClose={() => {
              setLocalError(null);
              clearError();
            }}
          />
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

        <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-500">
          Need a recruiter account? Contact your HireFlow workspace administrator for provisioning.
        </div>
      </div>
    </div>
  );
};
