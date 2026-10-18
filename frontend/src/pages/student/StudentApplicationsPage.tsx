import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api, ApiError } from '../../services/api';
import { ApplicationItem } from '../../types';
import { ApplicationStageBadge } from '../../components/ApplicationStageBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  Briefcase,
  Building,
  Calendar,
  Search,
  ArrowRight,
  Clock,
  RefreshCw,
  WifiOff,
  AlertTriangle,
  ShieldAlert,
  LogIn,
} from 'lucide-react';

export const StudentApplicationsPage: React.FC = () => {
  const { session } = useAuth();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [retrying, setRetrying] = useState<boolean>(false);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'hired' | 'rejected'>('all');

  const fetchApplications = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStudentApplications(session.access_token);
      setApplications(data);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleRetry = () => {
    setRetrying(true);
    fetchApplications();
  };

  const filteredApplications = applications.filter((app) => {
    if (filterTab === 'active') {
      return ['applied', 'screening', 'interview', 'offer'].includes(app.stage);
    }
    if (filterTab === 'hired') return app.stage === 'hired';
    if (filterTab === 'rejected') return app.stage === 'rejected';
    return true;
  });

  const isNetworkError =
    error instanceof ApiError
      ? error.isNetworkError || error.status === 0
      : (error?.message || '').toLowerCase().includes('failed to fetch') ||
        (error?.message || '').toLowerCase().includes('unable to connect');

  const isAuthExpired = error instanceof ApiError && error.status === 401;
  const isForbidden = error instanceof ApiError && error.status === 403;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
          <p className="text-sm text-slate-600 mt-1">
            Track real-time hiring pipeline updates and interview schedules.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {error && (
            <button
              onClick={handleRetry}
              disabled={loading || retrying}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
              Retry
            </button>
          )}
          <Link
            to="/student/jobs"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <Search className="w-3.5 h-3.5" /> Find More Positions
          </Link>
        </div>
      </div>

      {/* Error States: Network / Auth / Server */}
      {error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 shadow-sm text-center max-w-xl mx-auto">
          {isNetworkError ? (
            <div>
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                <WifiOff className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Backend Server Unavailable</h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Unable to connect to the HireFlow backend server at{' '}
                <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                  http://localhost:8000
                </code>
                . Please verify that the FastAPI backend server is running.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
                  {retrying ? 'Connecting...' : 'Retry Connection'}
                </button>
              </div>
            </div>
          ) : isAuthExpired ? (
            <div>
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Session Expired</h2>
              <p className="text-sm text-slate-600 mt-2">
                Your login session has expired or is invalid. Please sign in again to view your applications.
              </p>
              <div className="mt-6">
                <Link
                  to="/student/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <LogIn className="w-4 h-4" /> Sign In Again
                </Link>
              </div>
            </div>
          ) : isForbidden ? (
            <div>
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
              <p className="text-sm text-slate-600 mt-2">
                This portal is reserved for students. Your current account does not have student permissions.
              </p>
              <div className="mt-6">
                <Link
                  to="/recruiter/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
                >
                  Go to Recruiter Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Unable to Load Applications</h2>
              <p className="text-sm text-slate-600 mt-2">
                {error.message || 'An unexpected error occurred while loading your applications.'}
              </p>
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60"
                >
                  <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
                  {retrying ? 'Retrying...' : 'Try Again'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && !error && (
        <LoadingSpinner size="lg" message="Loading your applications..." className="py-20" />
      )}

      {/* Main Content: Displayed only when data retrieval succeeded */}
      {!loading && !error && (
        <>
          {/* Filter Tabs with real counts */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-xs overflow-x-auto">
            {[
              { key: 'all', label: 'All Submissions', count: applications.length },
              {
                key: 'active',
                label: 'Active Pipeline',
                count: applications.filter((a) =>
                  ['applied', 'screening', 'interview', 'offer'].includes(a.stage)
                ).length,
              },
              {
                key: 'hired',
                label: 'Hired Offers',
                count: applications.filter((a) => a.stage === 'hired').length,
              },
              {
                key: 'rejected',
                label: 'Closed / Not Selected',
                count: applications.filter((a) => a.stage === 'rejected').length,
              },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterTab(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  filterTab === tab.key
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    filterTab === tab.key ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Application List */}
          {filteredApplications.length > 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
              {filteredApplications.map((app) => (
                <div
                  key={app.id}
                  className="p-5 sm:p-6 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Link
                        to={`/student/applications/${app.id}`}
                        className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                      >
                        {app.job_title}
                      </Link>
                      <ApplicationStageBadge stage={app.stage} size="sm" />
                      {app.has_scheduled_interview && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Calendar className="w-3 h-3 text-emerald-600" /> Interview Scheduled
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 flex items-center gap-2 font-medium">
                      <Building className="w-3.5 h-3.5 text-slate-400" /> {app.company} &bull;{' '}
                      <span className="capitalize">{app.location}</span> ({app.work_mode})
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Applied{' '}
                        {new Date(app.applied_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Updated{' '}
                        {new Date(app.stage_changed_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                    <Link
                      to={`/student/applications/${app.id}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    >
                      View Timeline <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 mx-auto mb-3">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No applications in this category</h3>
              <p className="text-xs text-slate-500 mt-1">
                {filterTab === 'all'
                  ? 'You have not submitted any applications yet. Explore published jobs to get started!'
                  : `You have no applications currently in the "${filterTab}" category.`}
              </p>
              <div className="mt-4">
                <Link
                  to="/student/jobs"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Browse Open Jobs <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
