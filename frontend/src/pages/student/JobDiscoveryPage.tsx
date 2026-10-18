import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { JobItem } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Alert } from '../../components/Alert';
import { MatchScoreBadge } from '../../components/MatchScoreBadge';
import {
  Search,
  Briefcase,
  MapPin,
  Clock,
  Filter,
  X,
  CheckCircle2,
  Building,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const JobDiscoveryPage: React.FC = () => {
  const { session } = useAuth();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'match_desc' | 'date_desc'>('default');

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getJobs(session?.access_token, {
        search: searchTerm.trim() || undefined,
        work_mode: workMode || undefined,
        employment_type: employmentType || undefined,
        experience_level: experienceLevel || undefined,
      });
      setJobs(res.items || []);
    } catch (err: any) {
      console.error('Failed to load jobs:', err);
      setError(err.message || 'Unable to load open jobs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [session, workMode, employmentType, experienceLevel]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchJobs();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setWorkMode('');
    setEmploymentType('');
    setExperienceLevel('');
    setSortBy('default');
  };

  const hasActiveFilters = Boolean(searchTerm || workMode || employmentType || experienceLevel || sortBy !== 'default');

  const displayJobs = [...jobs].sort((a, b) => {
    if (sortBy === 'match_desc') {
      return (b.match?.score ?? 0) - (a.match?.score ?? 0);
    }
    if (sortBy === 'date_desc') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return 0;
  });

  const hasIncompleteProfileNotice = jobs.some((j) => j.match?.is_partial_profile);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Explore Open Positions</h1>
        <p className="text-sm text-slate-600 mt-1">
          Discover verified opportunities matching your skills and career ambitions.
        </p>
      </div>

      {error && <Alert type="error" title="Notice" message={error} />}

      {/* Incomplete profile guidance banner */}
      {hasIncompleteProfileNotice && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100/80 text-amber-700 flex-shrink-0">
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">Enhance Your Job Matching Accuracy</h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Your profile is missing technical skills or experience history. Add them to receive accurate match percentages and tailored recommendations.
              </p>
            </div>
          </div>
          <Link
            to="/student/profile"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-2xs whitespace-nowrap"
          >
            Complete Profile &rarr;
          </Link>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by job title, company name, or technology skill (e.g. React, Python)..."
              className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg input-focus-ring bg-white"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            Search
          </button>
        </form>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold mr-1">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </div>

          <select
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium input-focus-ring"
          >
            <option value="">Work Mode (All)</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>

          <select
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium input-focus-ring"
          >
            <option value="">Employment Type (All)</option>
            <option value="full_time">Full Time</option>
            <option value="internship">Internship</option>
            <option value="part_time">Part Time</option>
            <option value="contract">Contract</option>
          </select>

          <select
            value={experienceLevel}
            onChange={(e) => setExperienceLevel(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium input-focus-ring"
          >
            <option value="">Experience Level (All)</option>
            <option value="internship">Internship</option>
            <option value="entry_level">Entry Level</option>
            <option value="mid_level">Mid Level</option>
            <option value="senior_level">Senior Level</option>
          </select>

          {/* Sort Option */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/60 text-indigo-800 font-semibold input-focus-ring ml-auto"
          >
            <option value="default">Sort: Default</option>
            <option value="match_desc">Sort: Highest Match Score</option>
            <option value="date_desc">Sort: Newest First</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-rose-600 transition-colors text-xs"
            >
              <X className="w-3.5 h-3.5" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Jobs Listing */}
      {loading ? (
        <LoadingSpinner size="lg" message="Searching active opportunities..." className="py-20" />
      ) : displayJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      <Link to={`/student/jobs/${job.id}`}>{job.title}</Link>
                    </h3>
                    <p className="text-xs text-slate-600 font-medium mt-0.5 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {job.company}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {job.match && <MatchScoreBadge match={job.match} size="sm" />}
                    {job.has_applied ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Applied
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600">
                        Open
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.location}
                  </span>
                  <span className="capitalize px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600">
                    {job.work_mode}
                  </span>
                  <span className="capitalize px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600">
                    {job.employment_type.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {job.description}
                </p>

                {/* Required Skills Chips with Match Highlighting */}
                {job.required_skills && job.required_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {job.required_skills.slice(0, 5).map((skill, sIdx) => {
                      const isMatched = job.match?.matched_skills?.some(
                        (ms) => ms.toLowerCase() === skill.toLowerCase()
                      );
                      return (
                        <span
                          key={sIdx}
                          className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors ${
                            isMatched
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-semibold'
                              : 'bg-indigo-50/70 text-indigo-700'
                          }`}
                        >
                          {isMatched ? `✓ ${skill}` : skill}
                        </span>
                      );
                    })}
                    {job.required_skills.length > 5 && (
                      <span className="text-[11px] text-slate-400 self-center">
                        +{job.required_skills.length - 5} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {job.deadline ? `Deadline: ${new Date(job.deadline).toLocaleDateString()}` : 'Rolling Basis'}
                </span>
                <Link
                  to={`/student/jobs/${job.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  View Details & Match <ArrowRight className="w-3.5 h-3.5" />
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
          <h3 className="text-sm font-bold text-slate-800">No positions matched your query</h3>
          <p className="text-xs text-slate-500 mt-1">
            {hasActiveFilters
              ? 'Try clearing some filters or searching for different keywords.'
              : 'There are currently no published job openings. Check back soon!'}
          </p>
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};
