import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { RecruiterJob, RecruiterJobStatus, CreateJobPayload, UpdateJobPayload } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Alert } from '../../components/Alert';
import {
  Briefcase,
  Plus,
  Search,
  MapPin,
  Clock,
  DollarSign,
  Users,
  Calendar,
  Edit2,
  Archive,
  X,
  Loader2,
  ChevronRight,
} from 'lucide-react';

export const RecruiterJobsPage: React.FC = () => {
  const { session } = useAuth();
  const [jobs, setJobs] = useState<RecruiterJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<RecruiterJob | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formWorkMode, setFormWorkMode] = useState<'remote' | 'hybrid' | 'onsite'>('remote');
  const [formEmploymentType, setFormEmploymentType] = useState<'full_time' | 'part_time' | 'contract' | 'internship'>('full_time');
  const [formExperienceLevel, setFormExperienceLevel] = useState('entry_level');
  const [formSalaryRange, setFormSalaryRange] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formStatus, setFormStatus] = useState<RecruiterJobStatus>('published');
  const [formSkills, setFormSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchJobs = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRecruiterJobs(session.access_token);
      setJobs(res.items || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load job postings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [session]);

  const openCreateModal = () => {
    setEditingJob(null);
    setFormTitle('');
    setFormCompany('TechNova Solutions');
    setFormLocation('San Francisco, CA');
    setFormWorkMode('remote');
    setFormEmploymentType('full_time');
    setFormExperienceLevel('entry_level');
    setFormSalaryRange('$95,000 - $125,000');
    setFormDeadline('');
    setFormStatus('published');
    setFormSkills(['React', 'TypeScript', 'Python']);
    setSkillInput('');
    setFormDescription('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (job: RecruiterJob) => {
    setEditingJob(job);
    setFormTitle(job.title);
    setFormCompany(job.company);
    setFormLocation(job.location);
    setFormWorkMode(job.work_mode);
    setFormEmploymentType(job.employment_type);
    setFormExperienceLevel(job.experience_level);
    setFormSalaryRange(job.salary_range || '');
    setFormDeadline(job.deadline ? job.deadline.split('T')[0] : '');
    setFormStatus(job.status);
    setFormSkills(job.required_skills || []);
    setSkillInput('');
    setFormDescription(job.description);
    setFormError(null);
    setModalOpen(true);
  };

  const handleAddSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();
    const clean = skillInput.trim().replace(/^,+|,+$/g, '');
    if (clean && !formSkills.includes(clean)) {
      setFormSkills([...formSkills, clean]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormSkills(formSkills.filter((s) => s !== skill));
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim() || !formCompany.trim() || !formLocation.trim() || !formDescription.trim()) {
      setFormError('Please fill in all required fields (Title, Company, Location, Description).');
      return;
    }

    if (!session?.access_token) return;
    setSaving(true);

    try {
      if (editingJob) {
        const payload: UpdateJobPayload = {
          title: formTitle.trim(),
          company: formCompany.trim(),
          location: formLocation.trim(),
          work_mode: formWorkMode,
          employment_type: formEmploymentType,
          experience_level: formExperienceLevel,
          salary_range: formSalaryRange.trim() || undefined,
          deadline: formDeadline ? new Date(formDeadline).toISOString() : undefined,
          status: formStatus,
          required_skills: formSkills,
          description: formDescription.trim(),
        };
        await api.updateRecruiterJob(session.access_token, editingJob.id, payload);
        setSuccessMsg(`Job posting "${formTitle}" updated successfully.`);
      } else {
        const payload: CreateJobPayload = {
          title: formTitle.trim(),
          company: formCompany.trim(),
          location: formLocation.trim(),
          work_mode: formWorkMode,
          employment_type: formEmploymentType,
          experience_level: formExperienceLevel,
          salary_range: formSalaryRange.trim() || undefined,
          deadline: formDeadline ? new Date(formDeadline).toISOString() : undefined,
          status: formStatus,
          required_skills: formSkills,
          description: formDescription.trim(),
        };
        await api.createRecruiterJob(session.access_token, payload);
        setSuccessMsg(`Job posting "${formTitle}" created and published successfully.`);
      }

      setModalOpen(false);
      fetchJobs();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save job posting.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatusChange = async (jobId: string, newStatus: RecruiterJobStatus) => {
    if (!session?.access_token) return;
    try {
      await api.updateRecruiterJob(session.access_token, jobId, { status: newStatus });
      setSuccessMsg(`Job status updated to ${newStatus}.`);
      fetchJobs();
    } catch (err: any) {
      setError(err.message || 'Failed to update job status.');
    }
  };

  const filteredJobs = jobs.filter((job) => {
    if (statusFilter !== 'all' && job.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = job.title.toLowerCase().includes(q);
      const matchComp = job.company.toLowerCase().includes(q);
      const matchLoc = job.location.toLowerCase().includes(q);
      const matchSkill = job.required_skills?.some((s) => s.toLowerCase().includes(q));
      if (!matchTitle && !matchComp && !matchLoc && !matchSkill) return false;
    }
    return true;
  });

  const getStatusBadge = (status: RecruiterJobStatus) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Published
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Draft
          </span>
        );
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            Closed
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Archived
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-indigo-600" />
            Job Postings Management
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Create, publish, edit, and archive job openings managed under your recruiter account.
          </p>
        </div>

        <button
          id="create-job-btn"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Job Posting
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert
          type="error"
          title="Error Loading Jobs"
          message={error}
          onClose={() => setError(null)}
        />
      )}
      {successMsg && (
        <Alert
          type="success"
          title="Operation Successful"
          message={successMsg}
          onClose={() => setSuccessMsg(null)}
        />
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0">
          {[
            { key: 'all', label: 'All Jobs', count: jobs.length },
            { key: 'published', label: 'Published', count: jobs.filter((j) => j.status === 'published').length },
            { key: 'draft', label: 'Drafts', count: jobs.filter((j) => j.status === 'draft').length },
            { key: 'closed', label: 'Closed', count: jobs.filter((j) => j.status === 'closed').length },
            { key: 'archived', label: 'Archived', count: jobs.filter((j) => j.status === 'archived').length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                statusFilter === tab.key
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  statusFilter === tab.key ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by title, skill, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Jobs Content List */}
      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <LoadingSpinner size="lg" message="Loading your enterprise job postings..." />
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {searchQuery || statusFilter !== 'all' ? 'No matching job postings found' : 'No job postings yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? 'Try modifying your search criteria or switching status tabs.'
              : 'Create your first job listing to start receiving student applications and managing your hiring pipeline.'}
          </p>
          <button
            id="create-first-job-btn"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Your First Job
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
                  {getStatusBadge(job.status)}
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full capitalize">
                    {job.work_mode}
                  </span>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full capitalize">
                    {job.employment_type.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{job.company}</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {job.location}
                  </span>
                  {job.salary_range && (
                    <span className="flex items-center gap-1 text-emerald-700 font-medium">
                      <DollarSign className="w-3.5 h-3.5" />
                      {job.salary_range}
                    </span>
                  )}
                  {job.deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Deadline: {new Date(job.deadline).toLocaleDateString()}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    Posted {new Date(job.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Skills Chips */}
                {job.required_skills && job.required_skills.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {job.required_skills.slice(0, 6).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600"
                      >
                        {skill}
                      </span>
                    ))}
                    {job.required_skills.length > 6 && (
                      <span className="text-[11px] font-medium text-slate-400">
                        +{job.required_skills.length - 6} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions & Applicant Count */}
              <div className="flex md:flex-col items-center md:items-end justify-between gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                <Link
                  to={`/recruiter/applicants?jobId=${job.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {job.application_count} {job.application_count === 1 ? 'Applicant' : 'Applicants'}
                  </span>
                  <ChevronRight className="w-3 h-3" />
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(job)}
                    className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit Job"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {job.status === 'published' ? (
                    <button
                      onClick={() => handleQuickStatusChange(job.id, 'closed')}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Close Job to Applications"
                    >
                      Close
                    </button>
                  ) : (
                    <button
                      onClick={() => handleQuickStatusChange(job.id, 'published')}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Publish Job"
                    >
                      Publish
                    </button>
                  )}

                  {job.status !== 'archived' && (
                    <button
                      onClick={() => handleQuickStatusChange(job.id, 'archived')}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Archive Job"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Job Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 mb-1">
              {editingJob ? 'Edit Job Posting' : 'Create New Job Posting'}
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Recruiter ownership is enforced. Only you will be authorized to manage this job listing and its applicants.
            </p>

            {formError && (
              <div className="mb-5">
                <Alert type="error" title="Validation Error" message={formError} onClose={() => setFormError(null)} />
              </div>
            )}

            <form onSubmit={handleSaveJob} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title *</label>
                  <input
                    id="job-title-input"
                    type="text"
                    required
                    placeholder="e.g. Senior Backend Engineer"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
                  <input
                    id="job-company-input"
                    type="text"
                    required
                    placeholder="e.g. TechCorp Solutions"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location *</label>
                  <input
                    id="job-location-input"
                    type="text"
                    required
                    placeholder="e.g. San Francisco, CA"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Work Mode</label>
                  <select
                    value={formWorkMode}
                    onChange={(e) => setFormWorkMode(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">Onsite</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Employment Type</label>
                  <select
                    value={formEmploymentType}
                    onChange={(e) => setFormEmploymentType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Experience Level</label>
                  <select
                    value={formExperienceLevel}
                    onChange={(e) => setFormExperienceLevel(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="entry_level">Entry Level</option>
                    <option value="mid_level">Mid Level</option>
                    <option value="senior_level">Senior Level</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Salary Range</label>
                  <input
                    type="text"
                    placeholder="e.g. $110,000 - $140,000"
                    value={formSalaryRange}
                    onChange={(e) => setFormSalaryRange(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Application Deadline</label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Publish Status</label>
                <div className="flex gap-4">
                  {(['published', 'draft', 'closed'] as RecruiterJobStatus[]).map((st) => (
                    <label key={st} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer capitalize">
                      <input
                        type="radio"
                        name="job_status"
                        value={st}
                        checked={formStatus === st}
                        onChange={() => setFormStatus(st)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      {st}
                    </label>
                  ))}
                </div>
              </div>

              {/* Skills Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Required Skills (Type and press Enter or comma)
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. React, Docker, Python..."
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={handleAddSkill}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {formSkills.map((sk) => (
                    <span
                      key={sk}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
                    >
                      {sk}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(sk)}
                        className="text-indigo-400 hover:text-indigo-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Job Description *</label>
                <textarea
                  id="job-description-textarea"
                  required
                  rows={5}
                  placeholder="Detail the role responsibilities, team structure, qualifications, and expectations..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="submit-job-btn"
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingJob ? 'Save Changes' : 'Publish Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
