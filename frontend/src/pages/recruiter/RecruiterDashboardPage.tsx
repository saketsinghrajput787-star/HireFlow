import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { RoleBadge } from '../../components/RoleBadge';
import { api } from '../../services/api';
import {
  Briefcase,
  Users,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Lock,
  AlertTriangle,
} from 'lucide-react';

export const RecruiterDashboardPage: React.FC = () => {
  const { profile, session } = useAuth();
  const [recruiterVerification, setRecruiterVerification] = useState<{
    verified: boolean;
    loading: boolean;
    error: string | null;
  }>({
    verified: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;
    if (session?.access_token) {
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
    } else {
      setRecruiterVerification((prev) => ({ ...prev, loading: false }));
    }
    return () => {
      mounted = false;
    };
  }, [session]);

  return (
    <div className="space-y-8">
      {/* Enterprise Recruiter Identity Banner */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            <span>Authorized Enterprise Workspace</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <h2 className="text-2xl font-bold">{profile?.full_name}</h2>
            {profile && <RoleBadge role={profile.role} />}
          </div>
          <p className="mt-1 text-sm text-slate-400">{profile?.email}</p>
        </div>

        <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-700">
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

      {/* Recruiter Management Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Job Openings Module */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Briefcase className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Job Postings Management</h3>
            <p className="mt-2 text-sm text-slate-600">
              Create and manage job listings. Row-level security restricts modifications strictly to jobs created by your recruiter ID.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Table: <code className="bg-slate-100 px-1 py-0.5 rounded">jobs</code></span>
            <span className="text-indigo-600 font-medium">Phase 2 CRUD</span>
          </div>
        </div>

        {/* Applicant Review Pipeline */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Applicant Pipeline</h3>
            <p className="mt-2 text-sm text-slate-600">
              View student applications, download authorized candidate resumes, and transition candidates through pipeline stages.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Table: <code className="bg-slate-100 px-1 py-0.5 rounded">applications</code></span>
            <span className="text-blue-600 font-medium">Phase 2 Workflow</span>
          </div>
        </div>

        {/* Interview Coordination */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Interview Scheduling</h3>
            <p className="mt-2 text-sm text-slate-600">
              Schedule video, phone, or in-person interview rounds and submit internal feedback with timestamps.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Table: <code className="bg-slate-100 px-1 py-0.5 rounded">interviews</code></span>
            <span className="text-purple-600 font-medium">Phase 2 Calendar</span>
          </div>
        </div>
      </div>

      {/* Recruiter Policy & Provisioning Info Box */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-sm text-slate-700">
        <h3 className="font-semibold text-slate-900 mb-2">Recruiter Access Architecture</h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          HireFlow enforces zero-trust role verification. Recruiter access cannot be granted via client-side metadata or self-registration.
          All recruiter permissions are verified on the backend by querying the authoritative PostgreSQL <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-mono">public.profiles</code> table
          and checked on every storage and database operation through PostgreSQL Row-Level Security policies.
        </p>
      </div>
    </div>
  );
};
