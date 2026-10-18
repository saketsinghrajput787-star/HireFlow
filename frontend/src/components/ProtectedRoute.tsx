import React from 'react';
import { Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from './LoadingSpinner';
import { RoleBadge } from './RoleBadge';
import { UserRole } from '../types';
import { ShieldAlert, LogOut, ArrowRight, Briefcase, GraduationCap } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { session, profile, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" message="Authenticating session and permissions..." />
      </div>
    );
  }

  const isRecruiterPath = location.pathname.startsWith('/recruiter');

  // If no active session, redirect to the appropriate portal login
  if (!session) {
    const redirectPath = isRecruiterPath ? '/recruiter/login' : '/student/login';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // If session exists but profile is missing or failed to resolve
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Profile Verification Error</h2>
          <p className="text-sm text-slate-600 mb-6">
            An active session was found, but your authoritative profile record could not be loaded.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={async () => {
                await signOut();
                navigate(isRecruiterPath ? '/recruiter/login' : '/student/login', { replace: true });
              }}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out & Sign In Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If roles are specified, check against authoritative profile role
  if (allowedRoles && allowedRoles.length > 0) {
    const isAuthorized = allowedRoles.includes(profile.role) || profile.role === 'admin';

    if (!isAuthorized) {
      // Role Mismatch: Display clear, non-redirecting Access Denied screen
      const userIsStudent = profile.role === 'student';
      const userIsRecruiter = profile.role === 'recruiter';

      const handleSwitchAccount = async () => {
        await signOut();
        navigate(isRecruiterPath ? '/recruiter/login' : '/student/login', { replace: true });
      };

      const handleSignOut = async () => {
        await signOut();
        navigate(userIsRecruiter ? '/recruiter/login' : '/student/login', { replace: true });
      };

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Access Restricted
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              {isRecruiterPath ? (
                <>
                  This section is restricted to authorized <strong>Recruiters</strong>.
                  {userIsStudent && (
                    <span>
                      {' '}You are currently signed in with a <strong>Student</strong> account.
                    </span>
                  )}
                </>
              ) : (
                <>
                  This section is reserved for <strong>Students & Candidates</strong>.
                  {userIsRecruiter && (
                    <span>
                      {' '}You are currently signed in with an enterprise <strong>Recruiter</strong> account.
                    </span>
                  )}
                </>
              )}
            </p>

            {/* Current Account Card */}
            <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200 text-left">
              <div className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">
                Active Account
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{profile.full_name}</p>
                  <p className="text-xs text-slate-500">{profile.email}</p>
                </div>
                <RoleBadge role={profile.role} />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              {userIsStudent ? (
                <Link
                  to="/student/dashboard"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <GraduationCap className="w-4 h-4" />
                  Go to Student Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              ) : userIsRecruiter ? (
                <Link
                  to="/recruiter/dashboard"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <Briefcase className="w-4 h-4" />
                  Go to Recruiter Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              ) : null}

              <button
                onClick={handleSwitchAccount}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <LogOut className="w-4 h-4 text-slate-500" />
                Sign in with {isRecruiterPath ? 'Recruiter' : 'Student'} Account
              </button>

              <button
                onClick={handleSignOut}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium text-rose-600 hover:text-rose-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
