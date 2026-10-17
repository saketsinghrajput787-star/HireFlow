import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { RoleBadge } from '../../components/RoleBadge';
import { api } from '../../services/api';
import {
  GraduationCap,
  FileText,
  Briefcase,
  CheckCircle2,
  Shield,
  Upload,
} from 'lucide-react';

export const StudentDashboardPage: React.FC = () => {
  const { profile, session } = useAuth();
  const [backendVerification, setBackendVerification] = useState<{
    verified: boolean;
    role: string;
    loading: boolean;
    error: string | null;
  }>({
    verified: false,
    role: '',
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;
    if (session?.access_token) {
      api
        .getMe(session.access_token)
        .then((data) => {
          if (mounted) {
            setBackendVerification({
              verified: true,
              role: data.role,
              loading: false,
              error: null,
            });
          }
        })
        .catch((err) => {
          if (mounted) {
            setBackendVerification({
              verified: false,
              role: '',
              loading: false,
              error: err.message,
            });
          }
        });
    } else {
      setBackendVerification((prev) => ({ ...prev, loading: false }));
    }
    return () => {
      mounted = false;
    };
  }, [session]);

  return (
    <div className="space-y-8">
      {/* Security Status Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Authoritative Identity
          </span>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">{profile?.full_name}</h2>
            {profile && <RoleBadge role={profile.role} />}
          </div>
          <p className="mt-1 text-sm text-slate-600 font-mono text-xs">{profile?.id}</p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
          <Shield className="w-5 h-5 text-indigo-600" />
          <div className="text-xs">
            <p className="font-semibold text-slate-800">Backend Token Verification</p>
            {backendVerification.loading ? (
              <span className="text-slate-500">Verifying JWT signature with FastAPI...</span>
            ) : backendVerification.verified ? (
              <span className="text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Verified Active Role: <strong>{backendVerification.role}</strong>
              </span>
            ) : (
              <span className="text-amber-600 font-medium">Local Session Active</span>
            )}
          </div>
        </div>
      </div>

      {/* Feature Placeholders for Phase 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Candidate Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Candidate Profile</h3>
          <p className="mt-2 text-sm text-slate-600">
            PostgreSQL <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">candidate_profiles</code> record initialized with RLS isolation.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Status: Phase 1 Schema Ready</span>
            <span className="text-emerald-600 font-medium">Protected by RLS</span>
          </div>
        </div>

        {/* Private Resume Storage Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Private Resume Vault</h3>
          <p className="mt-2 text-sm text-slate-600">
            Configured with Supabase Storage bucket <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">resumes</code> (non-public, PDF only, max 5MB).
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>MIME: application/pdf</span>
            <span className="text-indigo-600 font-medium flex items-center gap-1">
              <Upload className="w-3.5 h-3.5" /> Phase 2 Upload
            </span>
          </div>
        </div>

        {/* Job Applications Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
            <Briefcase className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Application Pipeline</h3>
          <p className="mt-2 text-sm text-slate-600">
            Database stage constraints: <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">applied &rarr; screening &rarr; interview &rarr; offer &rarr; hired / rejected</code>.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Unique: (job_id, student_id)</span>
            <span className="text-slate-600 font-medium">0 active applications</span>
          </div>
        </div>
      </div>

      {/* Phase 1 Completion Checklist Banner */}
      <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100">
        <h3 className="text-base font-bold text-indigo-950 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-indigo-600" />
          Phase 1 Foundation Operational
        </h3>
        <p className="mt-1 text-sm text-indigo-900/80">
          Your student session is authenticated via Supabase Auth and verified against the FastAPI backend. Full candidate editing, resume parsing, and application submission will be implemented in Phase 2.
        </p>
      </div>
    </div>
  );
};
