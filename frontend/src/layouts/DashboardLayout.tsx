import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { RoleBadge } from '../components/RoleBadge';

export const DashboardLayout: React.FC = () => {
  const { profile } = useAuth();

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Dashboard Top Banner */}
      <div className="mb-8 pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome back, {profile?.full_name || 'User'}
            </h1>
            {profile && <RoleBadge role={profile.role} />}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            HireFlow Applicant Tracking System &bull; Authorized Session Active
          </p>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <Outlet />
    </div>
  );
};
