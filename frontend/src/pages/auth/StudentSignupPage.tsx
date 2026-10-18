import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Alert } from '../../components/Alert';
import { GraduationCap, ArrowRight, Loader2, Lock, Mail, User, ShieldCheck } from 'lucide-react';

export const StudentSignupPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const { signUpStudent, session, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!fullName.trim() || !email.trim() || !password) {
      setLocalError('Please fill out all required fields.');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match. Please verify and try again.');
      return;
    }

    setSubmitting(true);
    try {
      await signUpStudent(email, password, fullName.trim());
      setSignupSuccess(true);
      setTimeout(() => {
        navigate(session ? '/student/dashboard' : '/student/login');
      }, 1500);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to create student account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-center">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create Student Account</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign up to build your profile, apply for verified jobs, and connect with recruiters.
          </p>
        </div>

        {signupSuccess && (
          <Alert
            type="success"
            title="Account Created"
            message="Your student profile has been registered successfully! Redirecting to your dashboard..."
          />
        )}

        {(localError || error) && (
          <Alert
            type="error"
            title="Registration Error"
            message={localError || error || ''}
            onClose={() => {
              setLocalError(null);
              clearError();
            }}
          />
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
          <div>
            <label htmlFor="student-name" className="block text-sm font-medium text-slate-700">
              Full Name
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="student-name"
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-email" className="block text-sm font-medium text-slate-700">
              Email Address
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@university.edu"
                className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="signup-password" className="block text-sm font-medium text-slate-700">
              Password (min. 8 characters)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700">
              Confirm Password
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
              />
            </div>
          </div>

          {/* Security Notice: Role Constraint */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-500 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>
              Public registration assigns verified Student permissions only. Recruiter accounts are
              managed exclusively by system administrators.
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting || signupSuccess}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Student Account...
              </>
            ) : (
              <>
                Complete Registration <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/student/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
};
