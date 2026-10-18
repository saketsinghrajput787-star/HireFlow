import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import {
  RecruiterInterview,
  RecruiterApplicant,
  InterviewFormat,
  InterviewStatus,
  ScheduleInterviewPayload,
  UpdateInterviewPayload,
} from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Alert } from '../../components/Alert';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Plus,
  Edit2,
  ExternalLink,
  MessageSquare,
  X,
  Loader2,
} from 'lucide-react';

export const RecruiterInterviewsPage: React.FC = () => {
  const { session } = useAuth();
  const [interviews, setInterviews] = useState<RecruiterInterview[]>([]);
  const [applicants, setApplicants] = useState<RecruiterApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState<'upcoming' | 'completed' | 'cancelled' | 'all'>('upcoming');

  // Schedule Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('14:00');
  const [interviewFormat, setInterviewFormat] = useState<InterviewFormat>('video');
  const [meetingLink, setMeetingLink] = useState('https://meet.google.com/hfw-interview-round');
  const [feedback, setFeedback] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Edit / Feedback Modal
  const [editingInterview, setEditingInterview] = useState<RecruiterInterview | null>(null);
  const [editStatus, setEditStatus] = useState<InterviewStatus>('scheduled');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('14:00');
  const [editMeetingLink, setEditMeetingLink] = useState('');
  const [editFeedback, setEditFeedback] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchInterviews = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRecruiterInterviews(session.access_token);
      setInterviews(res.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load interviews.');
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicantsForDropdown = async () => {
    if (!session?.access_token) return;
    try {
      const res = await api.getRecruiterApplicants(session.access_token);
      setApplicants(res.items || []);
      if (res.items && res.items.length > 0 && !selectedAppId) {
        setSelectedAppId(res.items[0].id);
      }
    } catch (err: any) {
      console.warn('Could not load applicants for dropdown:', err);
    }
  };

  useEffect(() => {
    fetchInterviews();
    fetchApplicantsForDropdown();
  }, [session]);

  const handleCreateInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError(null);

    if (!selectedAppId || !scheduledDate || !scheduledTime) {
      setScheduleError('Please select a candidate, date, and time.');
      return;
    }

    if (!session?.access_token) return;
    setSavingSchedule(true);

    try {
      const iso = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
      const payload: ScheduleInterviewPayload = {
        application_id: selectedAppId,
        scheduled_at: iso,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        interview_format: interviewFormat,
        meeting_link: meetingLink.trim() || undefined,
        feedback: feedback.trim() || undefined,
        advance_stage: true,
      };

      await api.scheduleInterview(session.access_token, payload);
      setSuccessMsg('Interview round scheduled and candidate notified.');
      setScheduleModalOpen(false);
      fetchInterviews();
    } catch (err: any) {
      setScheduleError(err.message || 'Failed to schedule interview.');
    } finally {
      setSavingSchedule(false);
    }
  };

  const openEditModal = (iv: RecruiterInterview) => {
    setEditingInterview(iv);
    setEditStatus(iv.status);
    if (iv.scheduled_at) {
      const d = new Date(iv.scheduled_at);
      setEditDate(d.toISOString().split('T')[0]);
      setEditTime(d.toTimeString().slice(0, 5));
    }
    setEditMeetingLink(iv.meeting_link || '');
    setEditFeedback(iv.feedback || '');
  };

  const handleUpdateInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token || !editingInterview) return;
    setSavingEdit(true);

    try {
      const iso = editDate && editTime ? new Date(`${editDate}T${editTime}:00`).toISOString() : undefined;
      const payload: UpdateInterviewPayload = {
        scheduled_at: iso,
        status: editStatus,
        meeting_link: editMeetingLink.trim() || undefined,
        feedback: editFeedback.trim() || undefined,
      };

      await api.updateInterview(session.access_token, editingInterview.id, payload);
      setSuccessMsg('Interview details and feedback saved successfully.');
      setEditingInterview(null);
      fetchInterviews();
    } catch (err: any) {
      setError(err.message || 'Failed to update interview.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleQuickStatus = async (interviewId: string, newStatus: InterviewStatus) => {
    if (!session?.access_token) return;
    try {
      await api.updateInterview(session.access_token, interviewId, { status: newStatus });
      setSuccessMsg(`Interview marked as ${newStatus}.`);
      fetchInterviews();
    } catch (err: any) {
      setError(err.message || 'Failed to update interview status.');
    }
  };

  const filteredInterviews = interviews.filter((iv) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'upcoming') return iv.status === 'scheduled' || iv.status === 'rescheduled';
    if (statusFilter === 'completed') return iv.status === 'completed';
    if (statusFilter === 'cancelled') return iv.status === 'cancelled';
    return true;
  });

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'video':
        return <Video className="w-4 h-4 text-purple-600" />;
      case 'phone':
        return <Phone className="w-4 h-4 text-blue-600" />;
      default:
        return <MapPin className="w-4 h-4 text-emerald-600" />;
    }
  };

  const getStatusBadge = (status: InterviewStatus) => {
    switch (status) {
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
            Scheduled
          </span>
        );
      case 'rescheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Rescheduled
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Interview Coordination
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Schedule interview rounds, provide meeting links, and record evaluation feedback.
          </p>
        </div>

        <button
          id="schedule-interview-btn"
          onClick={() => {
            setScheduleModalOpen(true);
            setScheduleError(null);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Schedule Interview
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert type="error" title="Interview Error" message={error} onClose={() => setError(null)} />
      )}
      {successMsg && (
        <Alert type="success" title="Success" message={successMsg} onClose={() => setSuccessMsg(null)} />
      )}

      {/* Filter Tabs */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto">
        {[
          { key: 'upcoming', label: 'Upcoming', count: interviews.filter((i) => i.status === 'scheduled' || i.status === 'rescheduled').length },
          { key: 'completed', label: 'Completed', count: interviews.filter((i) => i.status === 'completed').length },
          { key: 'cancelled', label: 'Cancelled', count: interviews.filter((i) => i.status === 'cancelled').length },
          { key: 'all', label: 'All Rounds', count: interviews.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              statusFilter === tab.key
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${statusFilter === tab.key ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-200 text-slate-700'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Interviews List */}
      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <LoadingSpinner size="lg" message="Loading scheduled interviews..." />
        </div>
      ) : filteredInterviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {statusFilter !== 'all' ? `No ${statusFilter} interviews found` : 'No interviews scheduled yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Coordinate video or phone interview rounds with qualified candidates from your applicant pipeline.
          </p>
          <button
            onClick={() => setScheduleModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Schedule an Interview
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInterviews.map((iv) => (
            <div
              key={iv.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    {getFormatIcon(iv.interview_format)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{iv.student_name}</h3>
                    <p className="text-xs font-medium text-slate-500">
                      {iv.job_title} &bull; <span className="text-slate-700">{iv.job_company}</span>
                    </p>
                  </div>
                  {getStatusBadge(iv.status as any)}
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-semibold text-slate-800">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    {new Date(iv.scheduled_at).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}{' '}
                    ({iv.timezone})
                  </span>
                  <span className="capitalize font-medium text-slate-500">
                    Format: {iv.interview_format}
                  </span>
                  {iv.meeting_link && (
                    <a
                      href={iv.meeting_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-semibold"
                    >
                      Join Meeting Link <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {iv.feedback && (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-100 flex items-start gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-slate-800">Evaluation Feedback:</strong> {iv.feedback}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 justify-end">
                <button
                  onClick={() => openEditModal(iv)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit / Feedback
                </button>

                {iv.status !== 'completed' && (
                  <button
                    onClick={() => handleQuickStatus(iv.id, 'completed')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  >
                    Complete
                  </button>
                )}

                {iv.status !== 'cancelled' && (
                  <button
                    onClick={() => handleQuickStatus(iv.id, 'cancelled')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Interview Modal */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-slate-200 relative">
            <button
              onClick={() => setScheduleModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1">Schedule Candidate Interview</h3>
            <p className="text-xs text-slate-500 mb-5">
              Select a candidate from your active applications to schedule a video, phone, or in-person round.
            </p>

            {scheduleError && (
              <div className="mb-4">
                <Alert type="error" title="Validation Error" message={scheduleError} onClose={() => setScheduleError(null)} />
              </div>
            )}

            <form onSubmit={handleCreateInterview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Candidate *</label>
                {applicants.length > 0 ? (
                  <select
                    value={selectedAppId}
                    onChange={(e) => setSelectedAppId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {applicants.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.student_name} — {a.job_title} (Stage: {a.stage})
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-slate-500 italic p-2 bg-slate-50 rounded-lg">
                    No active applicants available. Post a job or await student applications.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Interview Format</label>
                <select
                  value={interviewFormat}
                  onChange={(e) => setInterviewFormat(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="video">Video Call (Google Meet, Zoom)</option>
                  <option value="phone">Phone Screening</option>
                  <option value="in_person">In-Person Interview</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time *</label>
                  <input
                    type="time"
                    required
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Meeting Link or Location</label>
                <input
                  type="text"
                  placeholder="https://meet.google.com/... or Office Room"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Optional Candidate Instructions / Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please prepare to discuss your React and FastAPI experience..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSchedule || applicants.length === 0}
                  className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                >
                  {savingSchedule && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Feedback Modal */}
      {editingInterview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-slate-200 relative">
            <button
              onClick={() => setEditingInterview(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1">Interview Round Details</h3>
            <p className="text-xs text-slate-500 mb-5">
              Candidate: <strong className="text-slate-700">{editingInterview.student_name}</strong> &bull;{' '}
              {editingInterview.job_title}
            </p>

            <form onSubmit={handleUpdateInterview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['scheduled', 'rescheduled', 'completed', 'cancelled'] as InterviewStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditStatus(st)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all ${
                        editStatus === st
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Meeting Link</label>
                <input
                  type="text"
                  value={editMeetingLink}
                  onChange={(e) => setEditMeetingLink(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Feedback & Assessment</label>
                <textarea
                  rows={4}
                  placeholder="Record assessment notes, technical score, cultural alignment, or next step recommendations..."
                  value={editFeedback}
                  onChange={(e) => setEditFeedback(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingInterview(null)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                >
                  {savingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
