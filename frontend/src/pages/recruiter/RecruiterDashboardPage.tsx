import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { RoleBadge } from '../../components/RoleBadge';
import { api } from '../../services/api';
import {
  RecruiterDashboardStats,
  FollowUpCategory,
} from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  Briefcase,
  Users,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Lock,
  AlertTriangle,
  ArrowRight,
  Plus,
  BellRing,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export const RecruiterDashboardPage: React.FC = () => {
  const { profile, session } = useAuth();
  const [stats, setStats] = useState<RecruiterDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recruiterVerification, setRecruiterVerification] = useState<{
    verified: boolean;
    loading: boolean;
    error: string | null;
  }>({
    verified: false,
    loading: true,
    error: null,
  });

  // Follow-up Center State
  const [followUpCategory, setFollowUpCategory] = useState<FollowUpCategory | 'all'>('all');
  const [processingReminders, setProcessingReminders] = useState<boolean>(false);
  const [reminderNotice, setReminderNotice] = useState<string | null>(null);

  const loadDashboardData = () => {
    if (!session?.access_token) return;
    setLoading(true);
    api
      .getRecruiterDashboard(session.access_token)
      .then((res) => {
        setStats(res);
      })
      .catch((err) => {
        console.warn('Could not load recruiter dashboard metrics:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let mounted = true;
    if (session?.access_token) {
      // 1. Verify FastAPI Recruiter Role Endpoint
      api
        .checkRecruiterAccess(session.access_token)
        .then(() => {
          if (mounted) {
            setRecruiterVerification({
              verified: true,
              loading: false,
              error: null,
            });
          }
        })
        .catch((err) => {
          if (mounted) {
            setRecruiterVerification({
              verified: false,
              loading: false,
              error: err.message,
            });
          }
        });

      // 2. Fetch Recruiter Metrics & Activity
      loadDashboardData();
    } else {
      setLoading(false);
      setRecruiterVerification((prev) => ({ ...prev, loading: false }));
    }

    return () => {
      mounted = false;
    };
  }, [session]);

  const handleProcessReminders = async () => {
    if (!session?.access_token) return;
    setProcessingReminders(true);
    setReminderNotice(null);
    try {
      const res = await api.processInterviewReminders(session.access_token);
      setReminderNotice(res.message);
      loadDashboardData();
    } catch (err: any) {
      setReminderNotice(err.message || 'Failed to process reminders.');
    } finally {
      setProcessingReminders(false);
    }
  };

  const followUpItems = stats?.top_follow_ups || [];
  const filteredFollowUps =
    followUpCategory === 'all'
      ? followUpItems
      : followUpItems.filter((i) => i.category === followUpCategory);

  const stageDist = stats?.stage_distribution || {};
  const stageKeys = [
    { key: 'applied', label: 'Applied', color: 'bg-blue-500' },
    { key: 'screening', label: 'Screening', color: 'bg-sky-500' },
    { key: 'interview', label: 'Interview', color: 'bg-indigo-500' },
    { key: 'offer', label: 'Offer', color: 'bg-amber-500' },
    { key: 'hired', label: 'Hired', color: 'bg-emerald-500' },
    { key: 'rejected', label: 'Rejected', color: 'bg-rose-400' },
  ];

  return (
    <div className="space-y-8">
      {/* Enterprise Recruiter Identity Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            <span>Authorized Enterprise Workspace</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold">{profile?.full_name || 'Recruiter'}</h2>
            {profile && <RoleBadge role={profile.role} />}
          </div>
          <p className="mt-1 text-sm text-slate-400">{profile?.email}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 relative z-10">
          <Link
            to="/recruiter/jobs"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Post New Job
          </Link>

          <div className="flex items-center gap-3 bg-slate-800/90 px-4 py-2.5 rounded-xl border border-slate-700">
            <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-slate-200">FastAPI Recruiter RBAC</p>
              {recruiterVerification.loading ? (
                <span className="text-slate-400">Verifying authorization...</span>
              ) : recruiterVerification.verified ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Backend RBAC Verified
                </span>
              ) : (
                <span className="text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {recruiterVerification.error || 'Verification Pending'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Counter Row (6 metrics) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Active Jobs</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900">{stats?.active_jobs ?? 0}</span>
            <span className="text-xs text-slate-400">{stats?.total_jobs ?? 0} Total</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Applicants</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-indigo-600">{stats?.total_applicants ?? 0}</span>
            <span className="text-xs text-emerald-600 font-semibold">In Pipeline</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Pending Review</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600">{stats?.pending_reviews ?? 0}</span>
            <span className="text-xs text-slate-400">Screening</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Scheduled Rounds</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-purple-600">{stats?.scheduled_interviews ?? 0}</span>
            <span className="text-xs text-slate-400">Upcoming</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Pending Feedback</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-rose-600">{stats?.interviews_awaiting_feedback ?? 0}</span>
            <span className="text-xs text-rose-500 font-semibold">Action Needed</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Stale Reviews</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-700">{stats?.stale_applications_count ?? 0}</span>
            <span className="text-xs text-slate-400">&gt;3-5 Days</span>
          </div>
        </div>
      </div>

      {/* Recruiter Workspace Interactive Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Job Openings Module */}
        <Link
          to="/recruiter/jobs"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-400 hover:shadow-md transition-all group"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Briefcase className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Job Postings Management
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Create, edit, close, or archive job postings. RLS enforces strict recruiter isolation so only you can modify your jobs.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-indigo-600">Open Job Workspace &rarr;</span>
            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-slate-700">
              {stats?.total_jobs ?? 0} Jobs
            </span>
          </div>
        </Link>

        {/* Applicant Review Pipeline */}
        <Link
          to="/recruiter/applicants"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-400 hover:shadow-md transition-all group"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              Applicant Pipeline & Matching
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Filter student applications, inspect verified resumes, inspect match scores, and transition candidates across hiring stages.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-blue-600">View Candidates &rarr;</span>
            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-slate-700">
              {stats?.total_applicants ?? 0} Applicants
            </span>
          </div>
        </Link>

        {/* Interview Coordination */}
        <Link
          to="/recruiter/interviews"
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-purple-400 hover:shadow-md transition-all group"
        >
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
              Interview Coordination
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Schedule video, phone, or in-person rounds with candidates. Automatic notifications and reminders alert candidates in real-time.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-purple-600">Manage Schedule &rarr;</span>
            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-slate-700">
              {stats?.scheduled_interviews ?? 0} Rounds
            </span>
          </div>
        </Link>
      </div>

      {/* Phase 4C: Recruiter Follow-up & Reminder Action Center */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <BellRing className="w-5 h-5 text-indigo-600" />
                Follow-Up Intelligence Center
              </h3>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Phase 4C
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Actionable reminders for stale applications, upcoming interviews within 48h, missing feedback, and low-traffic job postings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleProcessReminders}
              disabled={processingReminders}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors shadow-2xs disabled:opacity-50"
              title="Dispatches automated reminders for scheduled interviews happening in the next 48h"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${processingReminders ? 'animate-spin' : ''}`} />
              {processingReminders ? 'Processing...' : 'Run Reminder Scan'}
            </button>
          </div>
        </div>

        {reminderNotice && (
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-800 flex items-center justify-between">
            <span>{reminderNotice}</span>
            <button
              type="button"
              onClick={() => setReminderNotice(null)}
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filter categories */}
        <div className="flex flex-wrap gap-2 pt-1 text-xs">
          {[
            { key: 'all', label: `All Action Items (${followUpItems.length})` },
            { key: 'upcoming_interview', label: 'Upcoming Interviews' },
            { key: 'interview_feedback_pending', label: 'Feedback Pending' },
            { key: 'stale_application', label: 'Stale Pipeline' },
            { key: 'new_application', label: 'New Reviews' },
            { key: 'low_applicant_job', label: 'Low Volume Jobs' },
          ].map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setFollowUpCategory(cat.key as any)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                followUpCategory === cat.key
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Follow-up Items Cards List */}
        {filteredFollowUps.length > 0 ? (
          <div className="space-y-3 pt-2">
            {filteredFollowUps.map((item) => {
              const isHigh = item.severity === 'high';
              const isMedium = item.severity === 'medium';
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isHigh
                      ? 'bg-rose-50/40 border-rose-200/80 hover:border-rose-300'
                      : isMedium
                      ? 'bg-amber-50/40 border-amber-200/80 hover:border-amber-300'
                      : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isHigh
                            ? 'bg-rose-100 text-rose-800'
                            : isMedium
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {item.severity} Priority
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">{item.title}</h4>
                      {item.job_title && (
                        <span className="text-[11px] text-slate-500 hidden sm:inline">
                          &bull; {item.job_title}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.reason}</p>
                    <p className="text-[11px] font-medium text-indigo-700 flex items-center gap-1 pt-0.5">
                      <Sparkles className="w-3 h-3 text-indigo-500" /> Suggested Action: {item.suggested_action}
                    </p>
                  </div>

                  <Link
                    to={item.target_link}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-all whitespace-nowrap self-start sm:self-auto"
                  >
                    Take Action <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500 space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No pending follow-ups in this category.</p>
            <p>Your hiring pipeline and scheduled rounds are currently on track.</p>
          </div>
        )}
      </div>

      {/* Pipeline Stage Distribution & Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage Distribution Breakdown (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Stage Distribution
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              {stats?.total_applicants ?? 0} Total
            </span>
          </div>

          <div className="space-y-3">
            {stageKeys.map(({ key, label, color }) => {
              const count = stageDist[key] || 0;
              const total = stats?.total_applicants || 1;
              const pct = stats?.total_applicants ? Math.round((count / total) * 100) : 0;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${color}`} />
                      {label}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`${color} h-1.5 rounded-full transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Applications (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              Recent Applicants
            </h3>
            <Link to="/recruiter/applicants" className="text-xs font-semibold text-indigo-600 hover:underline">
              View Pipeline &rarr;
            </Link>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner size="sm" />
            </div>
          ) : !stats?.recent_applications || stats.recent_applications.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 space-y-1">
              <p className="font-medium">No applications received yet.</p>
              <p>Publish job postings to start receiving candidate submissions.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.recent_applications.slice(0, 5).map((app) => (
                <div
                  key={app.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between hover:bg-slate-100 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{app.student_name}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{app.job_title}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {app.stage}
                    </span>
                    <Link
                      to={`/recruiter/applicants?jobId=${app.job_id}`}
                      className="p-1 text-slate-400 hover:text-indigo-600"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Scheduled Interviews (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              Upcoming Interviews
            </h3>
            <Link to="/recruiter/interviews" className="text-xs font-semibold text-indigo-600 hover:underline">
              View Schedule &rarr;
            </Link>
          </div>

          {loading ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner size="sm" />
            </div>
          ) : !stats?.upcoming_interviews || stats.upcoming_interviews.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 space-y-1">
              <p className="font-medium">No upcoming interviews scheduled.</p>
              <p>Review qualified candidates in your pipeline and schedule interview rounds.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {stats.upcoming_interviews.slice(0, 5).map((iv) => (
                <div
                  key={iv.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between hover:bg-slate-100 transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{iv.student_name}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {new Date(iv.scheduled_at).toLocaleDateString()} &bull; {new Date(iv.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({iv.interview_format})
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-purple-50 text-purple-700 border border-purple-200">
                      {iv.status}
                    </span>
                    <Link to="/recruiter/interviews" className="p-1 text-slate-400 hover:text-indigo-600">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
