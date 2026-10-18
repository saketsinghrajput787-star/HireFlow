import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { ApplicationDetail } from '../../types';
import { ApplicationStageBadge } from '../../components/ApplicationStageBadge';
import { ApplicationProgressStepper } from '../../components/ApplicationProgressStepper';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Alert } from '../../components/Alert';
import {
  ArrowLeft,
  Building,
  Calendar,
  Video,
  Activity,
  ExternalLink,
} from 'lucide-react';

export const StudentApplicationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = React.useCallback(() => {
    if (!id || !session?.access_token) return;
    setLoading(true);
    setError(null);
    api
      .getStudentApplicationDetail(session.access_token, id)
      .then((data) => {
        setApplication(data);
      })
      .catch((err) => {
        setError(err.message || 'Unable to load application details.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, session?.access_token]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return <LoadingSpinner size="lg" message="Loading application timeline..." className="py-20" />;
  }

  if (error || !application) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <Alert type="error" title="Notice" message={error || 'This application record was not found.'} />
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={fetchDetail}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            Retry Loading
          </button>
          <Link
            to="/student/applications"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 border border-slate-200 px-3 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" /> Return to applications
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Back button */}
      <div>
        <Link
          to="/student/applications"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to all applications
        </Link>
      </div>

      {/* Header Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{application.job_title}</h1>
              <ApplicationStageBadge stage={application.stage} />
            </div>
            <p className="text-sm font-semibold text-slate-700 mt-1 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-slate-400" />
              {application.company} &bull; <span className="capitalize text-slate-500 font-normal">{application.location}</span>
            </p>
          </div>

          <Link
            to={`/student/jobs/${application.job_id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
          >
            View Job Details <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Progress Stepper */}
        <div className="py-2">
          <ApplicationProgressStepper currentStage={application.stage} />
        </div>

        {/* Timestamps Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Applied On</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">
              {new Date(application.applied_at).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Last Status Change</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">
              {new Date(application.stage_changed_at).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Current Status</span>
            <span className="font-bold text-indigo-600 capitalize mt-0.5 block">
              {application.stage}
            </span>
          </div>
        </div>
      </div>

      {/* Scheduled Interviews Card (if any exist) */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Interview Schedule & Rounds</h2>
            <p className="text-xs text-slate-500">Coordinated interviews and meeting links</p>
          </div>
        </div>

        {application.interviews && application.interviews.length > 0 ? (
          <div className="space-y-3">
            {application.interviews.map((interview) => (
              <div
                key={interview.id}
                className="p-4 rounded-xl border border-purple-100 bg-purple-50/40 space-y-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                      {interview.interview_format} interview
                    </span>
                    <span className="text-xs text-slate-500 capitalize">&bull; Status: {interview.status}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 flex items-center gap-1.5 pt-1">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    {new Date(interview.scheduled_at).toLocaleString()} ({interview.timezone})
                  </p>
                </div>

                {interview.meeting_link && (
                  <a
                    href={interview.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors self-start sm:self-center"
                  >
                    <Video className="w-3.5 h-3.5" /> Join Meeting Link
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-500 italic">
            No interviews currently scheduled. You will receive an alert as soon as the recruiter coordinates an interview round.
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Application Activity History</h2>
            <p className="text-xs text-slate-500">Immutable audit log of all submission milestones</p>
          </div>
        </div>

        {application.activity_logs && application.activity_logs.length > 0 ? (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {application.activity_logs.map((log) => (
              <div key={log.id} className="relative">
                <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-slate-800 capitalize">
                    {log.event_type.replace('_', ' ')}
                  </p>
                  {log.metadata?.message && (
                    <p className="text-slate-600">{log.metadata.message}</p>
                  )}
                  {log.metadata?.old_stage && log.metadata?.new_stage && (
                    <p className="text-slate-600 font-mono text-[11px]">
                      {log.metadata.old_stage} &rarr; <strong>{log.metadata.new_stage}</strong>
                    </p>
                  )}
                  {log.metadata?.note && (
                    <p className="text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                      &ldquo;{log.metadata.note}&rdquo;
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400">
                    {new Date(log.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic py-4">No logged activity events recorded yet.</div>
        )}
      </div>
    </div>
  );
};
