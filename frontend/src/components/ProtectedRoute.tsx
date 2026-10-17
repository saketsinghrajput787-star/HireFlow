import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from './LoadingSpinner';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" message="Authenticating session and permissions..." />
      </div>
    );
  }

  // If no active session, redirect to the appropriate portal login
  if (!session) {
    const isRecruiterPath = location.pathname.startsWith('/recruiter');
    const redirectPath = isRecruiterPath ? '/recruiter/login' : '/student/login';
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // If roles are specified, check against authoritative profile role
  if (allowedRoles && profile) {
    const isAuthorized = allowedRoles.includes(profile.role) || profile.role === 'admin';

    if (!isAuthorized) {
      // Role mismatch: redirect user to their authorized portal
      if (profile.role === 'recruiter') {
        return <Navigate to="/recruiter/dashboard" replace />;
      }
      return <Navigate to="/student/dashboard" replace />;
    }
  }

  return <>{children}</>;
};
