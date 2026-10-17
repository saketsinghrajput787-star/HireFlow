import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { ApplicationItem } from '../../types';
import { ApplicationStageBadge } from '../../components/ApplicationStageBadge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Alert } from '../../components/Alert';
import {
  Briefcase,
  Building,
  Calendar,
  Search,
  ArrowRight,
  Clock,
} from 'lucide-react';

export const StudentApplicationsPage: React.FC = () => {
  const { session } = useAuth();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'hired' | 'rejected'>('all');

  useEffect(() => {
    let mounted = true;
    if (session?.access_token) {
      setLoading(true);
      api
        .getStudentApplications(session.access_token)
        .then((data) => {
          if (mounted) setApplications(data);
        })
        .catch((err) => {
          if (mounted) setError(err.message || 'Unable to retrieve applications.');
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, [session]);

  const filteredApplications = applications.filter((app) => {
    if (filterTab === 'active') {
      return ['applied', 'screening', 'interview', 'offer'].includes(app.stage);
    }
    if (filterTab === 'hired') return app.stage === 'hired';
    if (filterTab === 'rejected') return app.stage === 'rejected';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
          <p className="text-sm text-slate-600 mt-1">
            Track real-time hiring pipeline updates and interview schedules.
          </p>
        </div>
        <Link
          to="/student/jobs"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors self-start sm:self-auto"
        >
          <Search className="w-3.5 h-3.5" /> Find More Positions
        </Link>
      </div>

      {error && <Alert type="error" title="Notice" message={error} />}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-xs">
        {[
          { key: 'all', label: 'All Submissions', count: applications.length },
          {
            key: 'active',
            label: 'Active Pipeline',
            count: applications.filter((a) => ['applied', 'screening', 'interview', 'offer'].includes(a.stage)).length,
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
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
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
      {loading ? (
        <LoadingSpinner size="lg" message="Loading your applications..." className="py-20" />
      ) : filteredApplications.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {filteredApplications.map((app) => (
            <div
              key={app.id}
              className="p-5 sm:p-6 hover:bg-slate-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <Link
                    to={`/student/applications/${app.id}`}
                    className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                  >
                    {app.job_title}
                  </Link>
                  <ApplicationStageBadge stage={app.stage} size="sm" />
                </div>
                <p className="text-xs text-slate-600 flex items-center gap-2 font-medium">
                  <Building className="w-3.5 h-3.5 text-slate-400" /> {app.company} &bull;{' '}
                  <span className="capitalize">{app.location}</span> ({app.work_mode})
                </p>
                <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Applied {new Date(app.applied_at).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Updated{' '}
                    {new Date(app.stage_changed_at).toLocaleDateString()}
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
    </div>
  );
};
