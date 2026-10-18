import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import {
  ResumeAnalysisResponse,
  JobSpecificResumeAnalysisResponse,
  JobItem,
} from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Alert } from '../../components/Alert';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  GraduationCap,
  Award,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Info,
  Building,
  Target,
  FileCheck,
  Upload,
} from 'lucide-react';

export const StudentResumeAnalysisPage: React.FC = () => {
  const { session } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetJobId = searchParams.get('jobId') || '';

  // Mode: 'audit' (General Resume Audit) vs 'job' (Job-Specific Tailoring)
  const [activeTab, setActiveTab] = useState<'audit' | 'job'>(targetJobId ? 'job' : 'audit');

  // General Resume Analysis State
  const [generalAnalysis, setGeneralAnalysis] = useState<ResumeAnalysisResponse | null>(null);
  const [loadingGeneral, setLoadingGeneral] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Job-Specific Analysis State
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(targetJobId);
  const [jobAnalysis, setJobAnalysis] = useState<JobSpecificResumeAnalysisResponse | null>(null);
  const [loadingJob, setLoadingJob] = useState<boolean>(false);
  const [jobError, setJobError] = useState<string | null>(null);

  // Load published jobs for selection
  useEffect(() => {
    if (!session?.access_token) return;
    api
      .getJobs(session.access_token)
      .then((res) => setJobs(res.items || []))
      .catch((err) => console.warn('Could not load jobs for resume selector:', err));
  }, [session]);

  // Load general resume analysis
  const fetchGeneralAnalysis = async () => {
    if (!session?.access_token) return;
    setLoadingGeneral(true);
    setGeneralError(null);
    try {
      const data = await api.getResumeAnalysis(session.access_token);
      setGeneralAnalysis(data);
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to analyze resume document.');
    } finally {
      setLoadingGeneral(false);
    }
  };

  // Run job-specific resume analysis
  const runJobAnalysis = async (jobIdToAnalyze: string) => {
    if (!session?.access_token || !jobIdToAnalyze) return;
    setLoadingJob(true);
    setJobError(null);
    try {
      const data = await api.analyzeResumeAgainstJob(session.access_token, jobIdToAnalyze);
      setJobAnalysis(data);
    } catch (err: any) {
      setJobError(err.message || 'Failed to analyze resume against selected job.');
    } finally {
      setLoadingJob(false);
    }
  };

  useEffect(() => {
    fetchGeneralAnalysis();
  }, [session]);

  useEffect(() => {
    if (targetJobId) {
      setSelectedJobId(targetJobId);
      setActiveTab('job');
      runJobAnalysis(targetJobId);
    }
  }, [targetJobId, session]);

  const handleJobSelectChange = (newJobId: string) => {
    setSelectedJobId(newJobId);
    setSearchParams(newJobId ? { jobId: newJobId } : {});
    if (newJobId) {
      runJobAnalysis(newJobId);
    } else {
      setJobAnalysis(null);
    }
  };

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              to="/student/profile"
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Profile
            </Link>
            {targetJobId && (
              <>
                <span className="text-slate-300">/</span>
                <Link
                  to={`/student/jobs/${targetJobId}`}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                >
                  Return to Job Details
                </Link>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-indigo-600" />
            Resume Intelligence & Tailoring
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Automated text parsing, section health checks, and role-specific tailoring analysis for your uploaded PDF resume.
          </p>
        </div>

        {/* Global Refresh Button */}
        {activeTab === 'audit' && (
          <button
            onClick={fetchGeneralAnalysis}
            disabled={loadingGeneral}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 shadow-2xs transition-colors self-start sm:self-auto disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingGeneral ? 'animate-spin' : ''}`} />
            Re-Analyze Document
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
            activeTab === 'audit'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          General Resume Audit
        </button>

        <button
          onClick={() => setActiveTab('job')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
            activeTab === 'job'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Target className="w-4 h-4" />
          Job-Specific Tailoring
          {selectedJob && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] bg-indigo-800 text-indigo-100">
              {selectedJob.company}
            </span>
          )}
        </button>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: General Resume Audit */}
      {/* ===================================================================== */}
      {activeTab === 'audit' && (
        <div className="space-y-6 animate-in fade-in">
          {generalError && (
            <Alert
              type="error"
              title="Analysis Notice"
              message={generalError}
              action={
                generalError.includes('No resume') ? (
                  <Link
                    to="/student/profile"
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload Resume on Profile
                  </Link>
                ) : undefined
              }
            />
          )}

          {loadingGeneral ? (
            <div className="py-20 text-center">
              <LoadingSpinner size="lg" message="Extracting text and analyzing resume entities..." />
            </div>
          ) : generalAnalysis ? (
            <>
              {/* Document Overview Bar */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <FileCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{generalAnalysis.filename}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {generalAnalysis.page_count} page{generalAnalysis.page_count !== 1 ? 's' : ''} &bull;{' '}
                        {generalAnalysis.word_count.toLocaleString()} words &bull;{' '}
                        {(generalAnalysis.file_size_bytes / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>

                  {generalAnalysis.is_readable && !generalAnalysis.is_scanned_or_empty ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Text Layer Readable
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Scanned / Unreadable
                    </span>
                  )}
                </div>

                {/* Scanned/Empty Warning Notice if detected */}
                {generalAnalysis.limitation_notice && (
                  <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200/90 flex items-start gap-3">
                    <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-amber-900">Document Parsing Limitation</h4>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        {generalAnalysis.limitation_notice}
                      </p>
                    </div>
                  </div>
                )}

                {/* Section Presence Checklist */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Core Resume Sections
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
                    {[
                      { label: 'Contact', found: generalAnalysis.sections_detected.has_contact_info },
                      { label: 'Summary', found: generalAnalysis.sections_detected.has_summary },
                      { label: 'Skills', found: generalAnalysis.sections_detected.has_skills },
                      { label: 'Experience', found: generalAnalysis.sections_detected.has_experience },
                      { label: 'Education', found: generalAnalysis.sections_detected.has_education },
                      { label: 'Projects', found: generalAnalysis.sections_detected.has_projects },
                      { label: 'Certs', found: generalAnalysis.sections_detected.has_certifications },
                    ].map((sec, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-xl border text-center font-semibold transition-colors ${
                          sec.found
                            ? 'bg-emerald-50/70 text-emerald-800 border-emerald-200/80'
                            : 'bg-slate-50 text-slate-400 border-slate-200/60'
                        }`}
                      >
                        <span className="block text-xs">{sec.found ? '✓' : '—'}</span>
                        <span className="text-[11px] block mt-0.5">{sec.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Profile Discrepancies Alert (if any) */}
              {generalAnalysis.profile_discrepancies.length > 0 && (
                <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-indigo-900">
                      Profile vs. Resume Alignment Opportunities ({generalAnalysis.profile_discrepancies.length})
                    </h3>
                  </div>
                  <p className="text-xs text-indigo-800">
                    HireFlow detected differences between your saved profile and your uploaded PDF resume. Reviewing these ensures recruiters and automated matching evaluate your complete background.
                  </p>
                  <div className="space-y-2.5 pt-1">
                    {generalAnalysis.profile_discrepancies.map((disc, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-white border border-indigo-100 shadow-2xs space-y-1.5 text-xs">
                        <p className="font-bold text-slate-800">{disc.description}</p>
                        <p className="text-slate-600 leading-relaxed text-[11px]">{disc.recommendation}</p>
                      </div>
                    ))}
                  </div>
                  <div className="pt-1">
                    <Link
                      to="/student/profile"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900"
                    >
                      Update Student Profile &rarr;
                    </Link>
                  </div>
                </div>
              )}

              {/* Skills & Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Detected Skills */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-indigo-600" />
                      Detected Skills ({generalAnalysis.detected_skills.length})
                    </h3>
                  </div>
                  {generalAnalysis.detected_skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {generalAnalysis.detected_skills.map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50/80 text-indigo-700 border border-indigo-100 shadow-2xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No recognized technical skills found in text layer.</p>
                  )}
                </div>

                {/* Professional Summary */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    Professional Summary / Objective
                  </h3>
                  {generalAnalysis.professional_summary ? (
                    <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                      "{generalAnalysis.professional_summary}"
                    </p>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-500 italic">
                      No standalone professional summary detected. Adding a 2-3 line summary at the top helps recruiters immediately grasp your goals.
                    </div>
                  )}
                </div>
              </div>

              {/* Strengths & Improvement Suggestions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Document Strengths */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Document Strengths ({generalAnalysis.strengths.length})
                  </h3>
                  {generalAnalysis.strengths.length > 0 ? (
                    <ul className="space-y-2 text-xs text-slate-700">
                      {generalAnalysis.strengths.map((str, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No notable strengths identified.</p>
                  )}
                </div>

                {/* Areas for Improvement */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    General Improvement Recommendations ({generalAnalysis.areas_for_improvement.length})
                  </h3>
                  {generalAnalysis.areas_for_improvement.length > 0 ? (
                    <ul className="space-y-2 text-xs text-slate-700">
                      {generalAnalysis.areas_for_improvement.map((imp, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-500 font-bold">&bull;</span>
                          <span>{imp}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No immediate structural improvements needed.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Resume Uploaded</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Upload a verified PDF resume on your profile page to unlock automated resume text parsing, entity extraction, and health checks.
              </p>
              <Link
                to="/student/profile"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
              >
                Go to Profile &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: Job-Specific Tailoring Analysis */}
      {/* ===================================================================== */}
      {activeTab === 'job' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Job Selection Toolbar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <label htmlFor="job-selector" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Select Published Job to Analyze Against:
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <select
                id="job-selector"
                value={selectedJobId}
                onChange={(e) => handleJobSelectChange(e.target.value)}
                className="flex-1 text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800"
              >
                <option value="">-- Choose an open job position ({jobs.length} available) --</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} &mdash; {j.company} ({j.work_mode})
                  </option>
                ))}
              </select>

              {selectedJobId && (
                <button
                  onClick={() => runJobAnalysis(selectedJobId)}
                  disabled={loadingJob}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingJob ? 'animate-spin' : ''}`} />
                  Re-Analyze
                </button>
              )}
            </div>

            {selectedJob && (
              <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-slate-400" /> {selectedJob.company}
                </span>
                <span>&bull;</span>
                <span className="capitalize">{selectedJob.work_mode}</span>
                <span>&bull;</span>
                <span>{selectedJob.location}</span>
                <Link
                  to={`/student/jobs/${selectedJob.id}`}
                  className="text-indigo-600 hover:text-indigo-800 font-semibold ml-auto flex items-center gap-1"
                >
                  View Job Details <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>

          {jobError && <Alert type="error" title="Analysis Error" message={jobError} />}

          {loadingJob ? (
            <div className="py-20 text-center">
              <LoadingSpinner size="lg" message="Comparing resume text with job requirements..." />
            </div>
          ) : jobAnalysis ? (
            <div className="space-y-6">
              {/* Header Analysis Summary Banner */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                      Target Role Analysis
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">{jobAnalysis.job_title}</h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{jobAnalysis.job_company}</p>
                  </div>

                  {jobAnalysis.profile_match_score !== undefined && (
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Phase 4A Profile Match</p>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">
                          {jobAnalysis.profile_match_score}% Score
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 italic max-w-[120px] leading-tight">
                        (Profile attributes baseline)
                      </span>
                    </div>
                  )}
                </div>

                {/* Skills Comparison Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Skills Found in Resume */}
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Required Skills Found in Resume ({jobAnalysis.skills_found_in_resume.length})
                    </span>
                    {jobAnalysis.skills_found_in_resume.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {jobAnalysis.skills_found_in_resume.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-emerald-800 border border-emerald-300 shadow-2xs"
                          >
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-700 italic">No exact required skills detected in resume text.</p>
                    )}
                  </div>

                  {/* Skills Not Detected in Resume */}
                  <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-200/80 space-y-2">
                    <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      Required Skills Not Detected in Document ({jobAnalysis.skills_not_detected_in_resume.length})
                    </span>
                    {jobAnalysis.skills_not_detected_in_resume.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {jobAnalysis.skills_not_detected_in_resume.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-rose-800 border border-rose-300 shadow-2xs"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-rose-700 font-semibold">
                        All required technologies appear in your resume text!
                      </p>
                    )}
                    <p className="text-[10px] text-rose-600/90 italic pt-1">
                      Note: Absence from the document does not mean you lack the skill. Consider including it if you have relevant project or coursework experience.
                    </p>
                  </div>
                </div>
              </div>

              {/* Concrete Tailoring Recommendations */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Recommended Resume Tailoring Actions
                </h3>
                {jobAnalysis.tailoring_suggestions.length > 0 ? (
                  <div className="space-y-2.5 text-xs text-slate-700">
                    {jobAnalysis.tailoring_suggestions.map((sug, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="leading-relaxed font-medium text-slate-800">{sug}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Resume is already closely aligned with this posting.</p>
                )}
              </div>

              {/* Experience and Education Evidence */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                    Relevant Experience Evidence
                  </h4>
                  {jobAnalysis.relevant_experience_evidence.length > 0 ? (
                    <ul className="space-y-2 text-xs text-slate-600">
                      {jobAnalysis.relevant_experience_evidence.map((ev, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-indigo-500 font-bold">&bull;</span>
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No direct role title or domain keywords detected.</p>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                    Relevant Education Evidence
                  </h4>
                  {jobAnalysis.relevant_education_evidence.length > 0 ? (
                    <ul className="space-y-2 text-xs text-slate-600">
                      {jobAnalysis.relevant_education_evidence.map((ev, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-indigo-500 font-bold">&bull;</span>
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No specific educational overlap detected.</p>
                  )}
                </div>
              </div>

              {/* Discrepancy Note banner */}
              {jobAnalysis.profile_vs_resume_notes.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-1.5 text-xs text-amber-900">
                  <p className="font-bold">Profile vs. Resume Discrepancies for this Role:</p>
                  <ul className="list-disc pl-4 space-y-1 text-amber-800">
                    {jobAnalysis.profile_vs_resume_notes.map((note, idx) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Bar */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 italic text-[11px]">
                  {jobAnalysis.disclaimer}
                </span>
                <Link
                  to={`/student/jobs/${jobAnalysis.job_id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-2xs whitespace-nowrap transition-colors"
                >
                  Return to Job & Apply &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <Target className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Select a Job Opening</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Choose any active job opening from the dropdown above to analyze your resume text against its actual requirements and discover personalized tailoring suggestions.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
