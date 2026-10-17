import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { JobItem } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Alert } from '../../components/Alert';
import {
  Building,
  MapPin,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Send,
  Loader2,
} from 'lucide-react';

export const JobDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { session, profile } = useAuth();

  const [job, setJob] = useState<JobItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Application Modal state
  const [showApplyModal, setShowApplyModal] = useState<boolean>(false);
  const [candidateNotes, setCandidateNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (id) {
      setLoading(true);
      setError(null);
      api
        .getJobDetail(id, session?.access_token)
        .then((data) => {
          if (mounted) setJob(data);
        })
        .catch((err) => {
          if (mounted) setError(err.message || 'Job opening not found.');
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, [id, session]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !session?.access_token) return;

    setSubmitting(true);
    setApplyError(null);
    try {
      const res = await api.applyToJob(session.access_token, id, candidateNotes);
      setApplySuccess(res.message);
      setShowApplyModal(false);
      // Refresh job state to reflect application
      setJob((prev) => (prev ? { ...prev, has_applied: true, application_id: res.application_id } : null));
    } catch (err: any) {
      console.error('Apply error:', err);
      setApplyError(err.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" message="Loading job opening..." className="py-20" />;
  }

  if (error || !job) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <Alert type="error" title="Position Unavailable" message={error || 'This job is no longer available.'} />
        <Link
          to="/student/jobs"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" /> Return to all positions
        </Link>
      </div>
    );
  }

  const deadlinePassed = job.deadline ? new Date(job.deadline) < new Date() : false;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Back button */}
      <div>
        <Link
          to="/student/jobs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to job search
        </Link>
      </div>

      {applySuccess && (
        <Alert
          type="success"
          title="Application Received"
          message={applySuccess}
          onClose={() => setApplySuccess(null)}
        />
      )}

      {/* Main Job Card Header */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{job.title}</h1>
            <p className="text-base text-slate-700 font-semibold flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-400" />
              {job.company}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.location}
              </span>
              <span className="capitalize px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600">
                {job.work_mode}
              </span>
              <span className="capitalize px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600">
                {job.employment_type.replace('_', ' ')}
              </span>
              <span className="capitalize px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600">
                {job.experience_level.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Action Button Area */}
          <div className="flex-shrink-0">
            {job.has_applied ? (
              <div className="space-y-2 text-right">
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Application Submitted
                </span>
                {job.application_id && (
                  <p className="text-[11px] text-slate-500">
                    <Link
                      to={`/student/applications/${job.application_id}`}
                      className="text-indigo-600 font-semibold underline hover:text-indigo-700"
                    >
                      Track application &rarr;
                    </Link>
                  </p>
                )}
              </div>
            ) : deadlinePassed ? (
              <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <Clock className="w-3.5 h-3.5" /> Deadline Passed
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowApplyModal(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
              >
                Apply for Position <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Job Details Meta */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 block font-medium">Posted Date</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">
              {new Date(job.created_at).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Application Deadline</span>
            <span className="font-semibold text-slate-800 mt-0.5 block">
              {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Continuous'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Location Mode</span>
            <span className="font-semibold text-slate-800 capitalize mt-0.5 block">{job.work_mode}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Employment</span>
            <span className="font-semibold text-slate-800 capitalize mt-0.5 block">
              {job.employment_type.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Required Skills Section */}
      {job.required_skills && job.required_skills.length > 0 && (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="text-base font-bold text-slate-900">Required Skills & Technologies</h2>
          <div className="flex flex-wrap gap-2 pt-1">
            {job.required_skills.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Job Description */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900">Job Description & Responsibilities</h2>
        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line space-y-4">
          {job.description}
        </div>
      </div>

      {/* Confirmation & Application Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Submit Application</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm your application for <strong>{job.title}</strong> at <strong>{job.company}</strong>
                </p>
              </div>
            </div>

            {applyError && <Alert type="error" title="Submission Error" message={applyError} />}

            <form onSubmit={handleApply} className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Verified Candidate Details Transmitted:</p>
                <p>&bull; Name: {profile?.full_name}</p>
                <p>&bull; Email: {profile?.email}</p>
                <p>&bull; Resume: Linked to candidate profile PDF vault</p>
              </div>

              <div>
                <label htmlFor="candidate-notes" className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Optional Note to Hiring Manager
                </label>
                <textarea
                  id="candidate-notes"
                  rows={3}
                  value={candidateNotes}
                  onChange={(e) => setCandidateNotes(e.target.value)}
                  placeholder="Share any brief context, portfolio links, or enthusiasm for this position..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" /> Confirm Application
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
