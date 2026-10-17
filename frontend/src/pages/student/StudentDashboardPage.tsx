import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { StudentDashboardStats, ApplicationStage } from '../../types';
import { ApplicationStageBadge } from '../../components/ApplicationStageBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Alert } from '../../components/Alert';
import {
  Briefcase,
  FileText,
  UserCheck,
  Calendar,
  ArrowRight,
  Sparkles,
  Search,
  Bell,
  ExternalLink,
} from 'lucide-react';

export const StudentDashboardPage: React.FC = () => {
  const { profile, session } = useAuth();
  const [stats, setStats] = useState<StudentDashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (session?.access_token) {
      setLoading(true);
      api
        .getStudentDashboardStats(session.access_token)
        .then((data) => {
          if (mounted) {
            setStats(data);
            setError(null);
          }
        })
        .catch((err) => {
          if (mounted) {
            console.error('Dashboard load error:', err);
            setError(err.message || 'Unable to load dashboard data.');
          }
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, [session]);

  if (loading) {
    return <LoadingSpinner size="lg" message="Loading your student dashboard..." className="py-20" />;
  }

  const completion = stats?.profile_completion_percentage || 0;

  return (
    <div className="space-y-8">
      {error && <Alert type="error" title="Dashboard Notice" message={error} />}

      {/* Profile Completeness Callout */}
      <div className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-indigo-700 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome back, {profile?.full_name || 'Candidate'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            {completion === 100
              ? 'Your profile is fully completed!'
              : `${completion}% Profile Complete`}
          </h2>
          <p className="text-indigo-100 text-xs sm:text-sm leading-relaxed">
            {completion < 100
              ? 'Complete your education details, skills, and upload your verified PDF resume to boost recruiter discovery.'
              : 'Your candidate profile and verified resume are ready for 1-click applications.'}
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-3 min-w-[200px]">
          <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>
          <Link
            to="/student/profile"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-white text-indigo-700 hover:bg-indigo-50 shadow transition-colors"
          >
            {completion < 100 ? 'Complete Profile' : 'View / Edit Profile'}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Applications */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Applications</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.total_applications ?? 0}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>

        {/* Interviews */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming Interviews</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.upcoming_interviews_count ?? 0}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Active Pipeline (Screening + Interview + Offer) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {(stats?.applications_by_stage?.screening || 0) +
                (stats?.applications_by_stage?.interview || 0) +
                (stats?.applications_by_stage?.offer || 0)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Unread Notifications */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unread Alerts</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats?.unread_notifications_count ?? 0}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Bell className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Applications Pipeline Breakdown & Recent Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Applications (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Applications</h3>
              <p className="text-xs text-slate-500">Track and view updates on your active submissions</p>
            </div>
            <Link
              to="/student/applications"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {stats?.recent_applications && stats.recent_applications.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {stats.recent_applications.map((app) => (
                <div key={app.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      to={`/student/applications/${app.id}`}
                      className="text-sm font-semibold text-slate-900 hover:text-indigo-600 truncate block"
                    >
                      {app.job_title}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {app.company} &bull; Applied {new Date(app.applied_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <ApplicationStageBadge stage={app.stage} size="sm" />
                    <Link
                      to={`/student/applications/${app.id}`}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                      title="View application timeline"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 mx-auto mb-3">
                <Briefcase className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">No applications submitted yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Explore open positions across leading companies and submit applications directly from your portal.
              </p>
              <div className="mt-4">
                <Link
                  to="/student/jobs"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Search className="w-3.5 h-3.5" /> Browse Open Positions
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Pipeline Stage Distribution & Quick Actions (1 col) */}
        <div className="space-y-6">
          {/* Stage breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Application Stages</h3>
            <div className="space-y-2.5 text-xs">
              {[
                { label: 'Applied', key: 'applied', color: 'bg-blue-500' },
                { label: 'Screening', key: 'screening', color: 'bg-sky-500' },
                { label: 'Interview', key: 'interview', color: 'bg-indigo-500' },
                { label: 'Offer', key: 'offer', color: 'bg-amber-500' },
                { label: 'Hired', key: 'hired', color: 'bg-emerald-500' },
                { label: 'Rejected', key: 'rejected', color: 'bg-rose-400' },
              ].map(({ label, key, color }) => {
                const count = stats?.applications_by_stage?.[key as ApplicationStage] || 0;
                return (
                  <div key={key} className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className={`w-2 h-2 rounded-full ${color}`} />
                      {label}
                    </span>
                    <span className="font-semibold text-slate-800">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                to="/student/jobs"
                className="w-full flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-indigo-600" /> Discover Jobs
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                to="/student/profile"
                className="w-full flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" /> Upload / Replace Resume
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>

              <Link
                to="/student/notifications"
                className="w-full flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm"
              >
                <span className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-600" /> Status Notifications
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
