import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { getResumeDownloadUrl } from '../../services/storage';
import {
  RecruiterApplicant,
  RecruiterApplicantDetail,
  RecruiterJob,
  ApplicationStage,
  InterviewFormat,
} from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Alert } from '../../components/Alert';
import { MatchScoreBadge } from '../../components/MatchScoreBadge';
import {
  Users,
  Search,
  Briefcase,
  Calendar,
  Clock,
  ExternalLink,
  ChevronRight,
  Download,
  X,
  Loader2,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Award,
  FileText,
  AlertCircle,
  RefreshCw,
  Eye,
  Sparkles,
  User,
  Copy,
  Check,
} from 'lucide-react';

export const RecruiterApplicantsPage: React.FC = () => {
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialJobId = searchParams.get('jobId') || '';

  const [applicants, setApplicants] = useState<RecruiterApplicant[]>([]);
  const [jobs, setJobs] = useState<RecruiterJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Sorting
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId);
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('default');

  // Candidate Drawer / Detail Modal
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  const [applicantDetail, setApplicantDetail] = useState<RecruiterApplicantDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [updatingStage, setUpdatingStage] = useState(false);
  const [stageNote, setStageNote] = useState('');
  const [downloadingResume, setDownloadingResume] = useState(false);
  const [viewingResume, setViewingResume] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Quick Schedule Modal for Candidate
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('14:00');
  const [interviewFormat, setInterviewFormat] = useState<InterviewFormat>('video');
  const [interviewLink, setInterviewLink] = useState('https://meet.google.com/hfw-interview-round');
  const [scheduling, setScheduling] = useState(false);

  // Keyboard accessibility: Close modals on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (scheduleModalOpen) {
          setScheduleModalOpen(false);
        } else if (selectedApplicantId) {
          closeApplicantDetail();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scheduleModalOpen, selectedApplicantId]);

  const fetchJobs = async () => {
    if (!session?.access_token) return;
    try {
      const res = await api.getRecruiterJobs(session.access_token);
      setJobs(res.items || []);
    } catch (err: any) {
      console.warn('Could not load recruiter jobs for filter:', err);
    }
  };

  const fetchApplicants = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRecruiterApplicants(session.access_token, {
        jobId: selectedJobId || undefined,
        stage: selectedStage !== 'all' ? selectedStage : undefined,
        search: searchQuery || undefined,
        sortBy: sortBy !== 'default' ? sortBy : undefined,
      });
      setApplicants(res.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load applicants.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [session]);

  useEffect(() => {
    fetchApplicants();
  }, [session, selectedJobId, selectedStage, sortBy]);

  const openApplicantDetail = async (appId: string) => {
    if (!session?.access_token) return;
    setSelectedApplicantId(appId);
    setLoadingDetail(true);
    setDetailError(null);
    setStageNote('');
    try {
      const detail = await api.getRecruiterApplicantDetail(session.access_token, appId);
      setApplicantDetail(detail);
    } catch (err: any) {
      setDetailError(err.message || 'Failed to load candidate details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeApplicantDetail = () => {
    setSelectedApplicantId(null);
    setApplicantDetail(null);
    setDetailError(null);
    setCopiedEmail(false);
  };

  const copyEmail = (emailStr: string) => {
    if (!emailStr) return;
    navigator.clipboard.writeText(emailStr);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleStageTransition = async (newStage: ApplicationStage) => {
    if (!session?.access_token || !selectedApplicantId) return;
    setUpdatingStage(true);
    try {
      await api.updateApplicationStage(session.access_token, selectedApplicantId, newStage, stageNote);
      setSuccessMsg(`Applicant stage updated to ${newStage.toUpperCase()}.`);
      setStageNote('');
      // Refresh detail and list
      await openApplicantDetail(selectedApplicantId);
      fetchApplicants();
    } catch (err: any) {
      setError(err.message || 'Failed to update stage.');
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleViewResume = async () => {
    if (!applicantDetail?.candidate_profile?.resume_path) {
      setError('Candidate has not uploaded a resume yet.');
      return;
    }
    // If backend already generated a signed URL, open directly!
    if (applicantDetail.candidate_profile.resume_url) {
      window.open(applicantDetail.candidate_profile.resume_url, '_blank', 'noopener,noreferrer');
      return;
    }
    setViewingResume(true);
    try {
      if (session?.access_token && selectedApplicantId) {
        const res = await api.getRecruiterApplicantResumeUrl(session.access_token, selectedApplicantId);
        if (res.resume_url) {
          window.open(res.resume_url, '_blank', 'noopener,noreferrer');
          return;
        }
      }
      const signedUrl = await getResumeDownloadUrl(applicantDetail.candidate_profile.resume_path);
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setError(err.message || 'Unable to open candidate resume.');
    } finally {
      setViewingResume(false);
    }
  };

  const handleDownloadResume = async () => {
    if (!applicantDetail?.candidate_profile?.resume_path) {
      setError('Candidate has not uploaded a resume yet.');
      return;
    }
    setDownloadingResume(true);
    try {
      if (session?.access_token && selectedApplicantId) {
        const res = await api.getRecruiterApplicantResumeUrl(session.access_token, selectedApplicantId);
        if (res.resume_url) {
          const a = document.createElement('a');
          a.href = res.resume_url;
          a.download = res.filename || 'resume.pdf';
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return;
        }
      }
      const signedUrl = await getResumeDownloadUrl(applicantDetail.candidate_profile.resume_path);
      const a = document.createElement('a');
      a.href = signedUrl;
      a.download = 'resume.pdf';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Unable to download verified resume.');
    } finally {
      setDownloadingResume(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token || !selectedApplicantId) return;

    if (!interviewDate || !interviewTime) {
      setError('Please specify both interview date and time.');
      return;
    }

    setScheduling(true);
    try {
      const scheduledIso = new Date(`${interviewDate}T${interviewTime}:00`).toISOString();
      await api.scheduleInterview(session.access_token, {
        application_id: selectedApplicantId,
        scheduled_at: scheduledIso,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        interview_format: interviewFormat,
        meeting_link: interviewLink,
        advance_stage: true,
      });

      setSuccessMsg('Interview scheduled successfully and invitation sent to student.');
      setScheduleModalOpen(false);
      // Refresh detail and list
      await openApplicantDetail(selectedApplicantId);
      fetchApplicants();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule interview round.');
    } finally {
      setScheduling(false);
    }
  };

  const getStageBadge = (stage: ApplicationStage) => {
    const config: Record<ApplicationStage, { bg: string; text: string; border: string }> = {
      applied: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      screening: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
      interview: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
      offer: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
      hired: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
      rejected: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    };
    const c = config[stage] || config.applied;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${c.bg} ${c.text} ${c.border}`}>
        {stage}
      </span>
    );
  };

  const stagesList: ApplicationStage[] = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Applicant Pipeline
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Review candidate applications, inspect verified resumes, and advance candidates through hiring stages.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert type="error" title="Pipeline Error" message={error} onClose={() => setError(null)} />
      )}
      {successMsg && (
        <Alert type="success" title="Success" message={successMsg} onClose={() => setSuccessMsg(null)} />
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Job Filter Dropdown */}
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Briefcase className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <select
              id="job-filter-select"
              value={selectedJobId}
              onChange={(e) => {
                setSelectedJobId(e.target.value);
                setSearchParams(e.target.value ? { jobId: e.target.value } : {});
              }}
              className="w-full text-xs border border-slate-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all font-medium text-slate-700"
            >
              <option value="">All Job Postings ({jobs.length})</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.application_count} applicants)
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchApplicants();
            }}
            className="relative flex-1 max-w-md"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="applicant-search-input"
              type="text"
              placeholder="Search candidate name, skills, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-12 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-indigo-600 font-semibold px-2 py-0.5 rounded hover:bg-indigo-50"
            >
              Filter
            </button>
          </form>

          {/* Sort By Match Score or Date */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <select
              id="applicant-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs border border-indigo-200 rounded-lg py-2 px-3 bg-indigo-50/60 text-indigo-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              <option value="default">Sort: Default (Newest)</option>
              <option value="match_desc">Sort: Highest Match First</option>
              <option value="match_asc">Sort: Lowest Match First</option>
              <option value="applied_asc">Sort: Oldest Applications</option>
            </select>
          </div>
        </div>

        {/* Stage Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-100">
          <button
            onClick={() => setSelectedStage('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedStage === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Stages ({applicants.length})
          </button>
          {stagesList.map((st) => {
            const count = applicants.filter((a) => a.stage === st).length;
            return (
              <button
                key={st}
                onClick={() => setSelectedStage(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  selectedStage === st
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{st}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedStage === st ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-200 text-slate-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Applicant Cards List */}
      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <LoadingSpinner size="lg" message="Loading candidate pipeline..." />
        </div>
      ) : applicants.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No applicants in this view</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {selectedJobId || selectedStage !== 'all' || searchQuery
              ? 'No candidate applications match the selected job, stage, or search query.'
              : 'As students discover your published job listings and apply, their applications will populate this pipeline.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {applicants.map((app) => (
            <div
              key={app.id}
              onClick={() => openApplicantDetail(app.id)}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {app.student_name}
                      </h3>
                      {app.match && <MatchScoreBadge match={app.match} size="sm" />}
                    </div>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">{app.job_title}</p>
                  </div>
                  {getStageBadge(app.stage)}
                </div>

                {app.candidate_profile?.headline && (
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {app.candidate_profile.headline}
                  </p>
                )}

                {/* Candidate Skills */}
                {app.candidate_profile?.skills && app.candidate_profile.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {app.candidate_profile.skills.slice(0, 4).map((sk, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                        {sk}
                      </span>
                    ))}
                    {app.candidate_profile.skills.length > 4 && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        +{app.candidate_profile.skills.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(app.applied_at).toLocaleDateString()}
                </span>
                <span className="inline-flex items-center gap-1 text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                  View Profile <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Candidate Profile & Resume Drawer / Modal */}
      {selectedApplicantId && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="candidate-modal-title"
        >
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[92vh] overflow-y-auto space-y-6">
            <button
              onClick={closeApplicantDetail}
              aria-label="Close candidate modal"
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingDetail ? (
              <div className="py-24 flex items-center justify-center">
                <LoadingSpinner size="lg" message="Loading candidate's complete profile, skills, education, and resume..." />
              </div>
            ) : detailError ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Failed to Load Candidate Details</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{detailError}</p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => openApplicantDetail(selectedApplicantId)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Loading
                  </button>
                  <button
                    onClick={closeApplicantDetail}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : applicantDetail ? (
              <>
                {/* 1. Modal Header: Candidate Identification & Quick Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="flex items-start gap-4">
                    <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-indigo-100 flex-shrink-0">
                      {applicantDetail.student_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 id="candidate-modal-title" className="text-2xl font-bold text-slate-900">
                          {applicantDetail.student_name}
                        </h3>
                        {getStageBadge(applicantDetail.stage)}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-1.5">
                        <span>Applied for</span>
                        <span className="font-semibold text-slate-800">{applicantDetail.job_title}</span>
                        <span>at</span>
                        <span className="font-semibold text-slate-800">{applicantDetail.job_company}</span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" />
                          {new Date(applicantDetail.applied_at).toLocaleDateString()}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Top Actions: View/Download Resume & Schedule */}
                  <div className="flex flex-wrap items-center gap-2">
                    {applicantDetail.candidate_profile?.resume_path && (
                      <>
                        <button
                          onClick={handleViewResume}
                          disabled={viewingResume}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-60"
                        >
                          {viewingResume ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5 text-slate-600" />}
                          View Resume
                        </button>
                        <button
                          onClick={handleDownloadResume}
                          disabled={downloadingResume}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-60"
                        >
                          {downloadingResume ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          Download
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => setScheduleModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Schedule Interview
                    </button>
                  </div>
                </div>

                {/* 2. Candidate Match Analysis */}
                {applicantDetail.match && (
                  <MatchScoreBadge match={applicantDetail.match} size="detailed" />
                )}

                {/* 3. Personal & Contact Information Card */}
                <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200/80">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    Personal & Contact Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {/* Email */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/70">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                          <Mail className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-slate-400 font-medium leading-none">Email Address</p>
                          {applicantDetail.student_email ? (
                            <a
                              href={`mailto:${applicantDetail.student_email}`}
                              className="text-xs font-semibold text-slate-800 hover:text-indigo-600 truncate block mt-0.5"
                            >
                              {applicantDetail.student_email}
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Not available</span>
                          )}
                        </div>
                      </div>
                      {applicantDetail.student_email && (
                        <button
                          onClick={() => copyEmail(applicantDetail.student_email)}
                          title="Copy Email"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="flex items-center p-2.5 rounded-xl bg-white border border-slate-200/70">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mr-2.5">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 font-medium leading-none">Phone Number</p>
                        {applicantDetail.candidate_profile?.phone ? (
                          <a
                            href={`tel:${applicantDetail.candidate_profile.phone}`}
                            className="text-xs font-semibold text-slate-800 hover:text-emerald-600 truncate block mt-0.5"
                          >
                            {applicantDetail.candidate_profile.phone}
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not provided</span>
                        )}
                      </div>
                    </div>

                    {/* Preferred Location */}
                    <div className="flex items-center p-2.5 rounded-xl bg-white border border-slate-200/70">
                      <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0 mr-2.5">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 font-medium leading-none">Preferred Location</p>
                        <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                          {applicantDetail.candidate_profile?.preferred_location || 'Flexible / Any'}
                        </p>
                      </div>
                    </div>

                    {/* Preferred Role */}
                    <div className="flex items-center p-2.5 rounded-xl bg-white border border-slate-200/70">
                      <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0 mr-2.5">
                        <Briefcase className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 font-medium leading-none">Preferred Role</p>
                        <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                          {applicantDetail.candidate_profile?.preferred_role || applicantDetail.job_title}
                        </p>
                      </div>
                    </div>

                    {/* Graduation Year */}
                    <div className="flex items-center p-2.5 rounded-xl bg-white border border-slate-200/70">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 mr-2.5">
                        <GraduationCap className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 font-medium leading-none">Graduation Year</p>
                        <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                          {applicantDetail.candidate_profile?.graduation_year
                            ? `Class of ${applicantDetail.candidate_profile.graduation_year}`
                            : 'Not specified'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Professional Headline / Summary */}
                {applicantDetail.candidate_profile?.headline && (
                  <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/70">
                    <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Professional Summary
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed mt-1">
                      {applicantDetail.candidate_profile.headline}
                    </p>
                  </div>
                )}

                {/* 4. Complete Skills Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-indigo-500" />
                      Technical & Core Skills
                    </h4>
                    {applicantDetail.candidate_profile?.skills && applicantDetail.candidate_profile.skills.length > 0 && (
                      <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        {applicantDetail.candidate_profile.skills.length} skills listed
                      </span>
                    )}
                  </div>
                  {applicantDetail.candidate_profile?.skills && applicantDetail.candidate_profile.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {applicantDetail.candidate_profile.skills.map((sk, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-xl text-xs font-semibold bg-white text-indigo-700 border border-indigo-200/80 shadow-xs hover:border-indigo-400 transition-colors"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-500 italic">
                      No technical skills listed on candidate's profile yet.
                    </div>
                  )}
                </div>

                {/* 5. Work Experience Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                      Work Experience & Internships
                    </h4>
                    {applicantDetail.candidate_profile?.experience && applicantDetail.candidate_profile.experience.length > 0 && (
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        {applicantDetail.candidate_profile.experience.length} roles
                      </span>
                    )}
                  </div>

                  {applicantDetail.candidate_profile?.experience && applicantDetail.candidate_profile.experience.length > 0 ? (
                    <div className="space-y-3">
                      {applicantDetail.candidate_profile.experience.map((exp: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 transition-colors shadow-2xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div>
                              <h5 className="text-sm font-bold text-slate-900">{exp.title}</h5>
                              <p className="text-xs font-semibold text-indigo-600 mt-0.5">
                                {exp.company} {exp.location ? `• ${exp.location}` : ''}
                              </p>
                            </div>
                            <span className="text-xs text-slate-500 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 w-fit">
                              {exp.start_date || 'Past'} &mdash; {exp.current ? 'Present' : exp.end_date || 'Past'}
                            </span>
                          </div>
                          {exp.description && (
                            <p className="text-xs text-slate-600 mt-2.5 leading-relaxed whitespace-pre-line border-t border-slate-100 pt-2">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-500 italic">
                      No work experience records listed on candidate's profile.
                    </div>
                  )}
                </div>

                {/* 6. Education Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                      Education & Academics
                    </h4>
                    {applicantDetail.candidate_profile?.education && applicantDetail.candidate_profile.education.length > 0 && (
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        {applicantDetail.candidate_profile.education.length} degrees
                      </span>
                    )}
                  </div>

                  {applicantDetail.candidate_profile?.education && applicantDetail.candidate_profile.education.length > 0 ? (
                    <div className="space-y-2.5">
                      {applicantDetail.candidate_profile.education.map((edu: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                          <div>
                            <h5 className="text-sm font-bold text-slate-900">{edu.institution}</h5>
                            <p className="text-xs text-slate-600 mt-0.5">
                              <span className="font-semibold text-slate-700">{edu.degree}</span> in {edu.field_of_study}
                            </p>
                            {edu.grade && (
                              <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                                Grade / CGPA: {edu.grade}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 w-fit">
                            {edu.start_year || ''} &mdash; {edu.end_year || 'Current'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-500 italic">
                      No education records listed on candidate's profile.
                    </div>
                  )}
                </div>

                {/* 7. Resume Document Verification Card */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                    Verified Candidate Resume
                  </h4>

                  {applicantDetail.candidate_profile?.resume_path ? (
                    <div className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {applicantDetail.student_name}'s Resume (Verified PDF)
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Private Supabase Bucket &bull;{' '}
                            {applicantDetail.candidate_profile.resume_updated_at
                              ? `Uploaded ${new Date(applicantDetail.candidate_profile.resume_updated_at).toLocaleDateString()}`
                              : 'Secure verified attachment'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleViewResume}
                          disabled={viewingResume}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 transition-colors shadow-2xs disabled:opacity-60"
                        >
                          {viewingResume ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                          View in Tab
                        </button>
                        <button
                          onClick={handleDownloadResume}
                          disabled={downloadingResume}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-60"
                        >
                          {downloadingResume ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          Download PDF
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-amber-900">No Resume Uploaded</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          This candidate has not attached a PDF resume to their profile yet.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 8. Stage Progression Control */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Update Application Stage
                    </span>
                    <span className="text-xs text-slate-500">
                      Current Stage: <span className="font-bold text-slate-900 capitalize">{applicantDetail.stage}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {stagesList.map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStageTransition(st)}
                        disabled={updatingStage || applicantDetail.stage === st}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                          applicantDetail.stage === st
                            ? 'bg-slate-900 text-white cursor-default'
                            : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-400 hover:text-indigo-600'
                        } disabled:opacity-50`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Optional internal note regarding this candidate..."
                      value={stageNote}
                      onChange={(e) => setStageNote(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                </div>

                {/* 9. Scheduled Interviews */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      Scheduled Interview Rounds
                    </h4>
                    <button
                      onClick={() => setScheduleModalOpen(true)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      + Schedule New Round
                    </button>
                  </div>
                  {applicantDetail.interviews && applicantDetail.interviews.length > 0 ? (
                    <div className="space-y-2.5">
                      {applicantDetail.interviews.map((iv) => (
                        <div key={iv.id} className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 capitalize">{iv.interview_format} Interview</span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">
                                {iv.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600">
                              {new Date(iv.scheduled_at).toLocaleString()} ({iv.timezone})
                            </p>
                            {iv.meeting_link && (
                              <a
                                href={iv.meeting_link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                              >
                                Meeting Link <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          {iv.feedback && (
                            <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg max-w-sm border border-slate-100">
                              <span className="font-semibold text-slate-700">Feedback:</span> {iv.feedback}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-500 italic">
                      No interview rounds scheduled yet for this candidate.
                    </div>
                  )}
                </div>

                {/* 10. Application History & Audit Log */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    Application History & Audit Log
                  </h4>
                  {applicantDetail.activity_logs && applicantDetail.activity_logs.length > 0 ? (
                    <div className="space-y-2 border-l-2 border-slate-200 pl-4 ml-1">
                      {applicantDetail.activity_logs.map((log: any) => (
                        <div key={log.id} className="text-xs space-y-0.5 relative">
                          <div className="w-2 h-2 rounded-full bg-indigo-600 absolute -left-[21px] top-1" />
                          <span className="font-semibold text-slate-800 capitalize">
                            {log.event_type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-slate-400 text-[10px] ml-2">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                          {log.metadata && (
                            <div className="text-slate-500 text-[11px]">
                              {log.metadata.new_stage && (
                                <span>Stage changed to: <strong className="capitalize text-slate-700">{log.metadata.new_stage}</strong></span>
                              )}
                              {log.metadata.note && <span> &bull; Note: "{log.metadata.note}"</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No activity recorded yet.</p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Quick Schedule Interview Modal */}
      {scheduleModalOpen && applicantDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 relative">
            <button
              onClick={() => setScheduleModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">Schedule Interview</h3>
            <p className="text-xs text-slate-500 mb-5">
              Candidate: <strong className="text-slate-700">{applicantDetail.student_name}</strong> for{' '}
              <strong className="text-slate-700">{applicantDetail.job_title}</strong>
            </p>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Interview Format</label>
                <select
                  value={interviewFormat}
                  onChange={(e) => setInterviewFormat(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="video">Video Call</option>
                  <option value="phone">Phone Screen</option>
                  <option value="in_person">In-Person Round</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time *</label>
                  <input
                    type="time"
                    required
                    value={interviewTime}
                    onChange={(e) => setInterviewTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Meeting Link or Location</label>
                <input
                  type="text"
                  placeholder="https://meet.google.com/... or HQ Office Room 401"
                  value={interviewLink}
                  onChange={(e) => setInterviewLink(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  disabled={scheduling}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                >
                  {scheduling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Schedule Round
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
