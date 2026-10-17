import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Alert } from '../../components/Alert';
import { KeyRound, ArrowLeft, Loader2, Mail } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { resetPassword, error, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email) {
      setLocalError('Please enter your account email.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to request password reset link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-center">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reset Password</h1>
          <p className="mt-2 text-sm text-slate-600">
            Enter your email and we'll send you instructions to reset your password.
          </p>
        </div>

        {success ? (
          <div className="space-y-6">
            <Alert
              type="success"
              title="Reset Email Dispatched"
              message="If an account exists for this email address, you will receive a secure password reset link shortly."
            />
            <Link
              to="/student/login"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Sign In
            </Link>
          </div>
        ) : (
          <>
            {(localError || error) && (
              <Alert
                type="error"
                title="Error"
                message={localError || error || ''}
                onClose={() => {
                  setLocalError(null);
                  clearError();
                }}
              />
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
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
                    Sending Reset Link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center text-sm text-slate-600">
              <Link to="/student/login" className="inline-flex items-center gap-1.5 font-medium text-indigo-600 hover:text-indigo-500">
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
