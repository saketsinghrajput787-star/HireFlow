import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { RoleBadge } from '../components/RoleBadge';
import { LayoutDashboard, Briefcase, Users, Calendar } from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { profile } = useAuth();

  const navItems = [
    { label: 'Overview', to: '/recruiter/dashboard', icon: LayoutDashboard },
    { label: 'Job Postings', to: '/recruiter/jobs', icon: Briefcase },
    { label: 'Applicant Pipeline', to: '/recruiter/applicants', icon: Users },
    { label: 'Interviews', to: '/recruiter/interviews', icon: Calendar },
  ];

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Dashboard Top Banner */}
      <div className="mb-6 pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome back, {profile?.full_name || 'Recruiter'}
            </h1>
            {profile && <RoleBadge role={profile.role} />}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            HireFlow Recruiter Workspace &bull; Enterprise Hiring Pipeline
          </p>
        </div>

        {/* Secondary Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/recruiter/dashboard'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Main Dashboard Content */}
      <Outlet />
    </div>
  );
};

