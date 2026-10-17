import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { BackendHealth } from '../types';
import {
  GraduationCap,
  Briefcase,
  ShieldCheck,
  Server,
  Database,
  ArrowRight,
  FileCheck,
  Lock,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [checkingHealth, setCheckingHealth] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    api
      .getHealth()
      .then((data) => {
        if (mounted) {
          setBackendHealth(data);
          setHealthError(null);
        }
      })
      .catch((err) => {
        if (mounted) {
          setHealthError(err.message || 'Backend unreachable');
        }
      })
      .finally(() => {
        if (mounted) setCheckingHealth(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/60 via-white to-slate-50 py-16 sm:py-24 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Health Status Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-slate-200 shadow-sm mb-6">
            <Server className="w-3.5 h-3.5 text-indigo-600" />
            <span>FastAPI Backend:</span>
            {checkingHealth ? (
              <span className="text-slate-400 animate-pulse">Checking status...</span>
            ) : backendHealth ? (
              <span className="inline-flex items-center text-emerald-700 font-semibold gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Operational (v{backendHealth.version})
              </span>
            ) : (
              <span className="text-amber-600 font-semibold" title={healthError || undefined}>
                {healthError ? `Offline (${healthError})` : 'Offline / Local Dev Mode'}
              </span>
            )}
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            The Secure, Modern <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
              Applicant Tracking System
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            HireFlow unifies student career discovery and recruiter pipeline management on top of
            hardened Row-Level Security and verified authentication.
          </p>

          {/* Quick CTA Portal Cards */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto text-left">
            {/* Student Card */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Student Portal</h2>
              <p className="mt-2 text-sm text-slate-600">
                Discover job opportunities, upload your verified PDF resume, submit applications, and track interview schedules.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Link
                  to="/student/signup"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Create Account <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/student/login"
                  className="text-sm font-medium text-slate-700 hover:text-indigo-600 px-3 py-2"
                >
                  Sign In
                </Link>
              </div>
            </div>

            {/* Recruiter Card */}
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <Briefcase className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Recruiter Portal</h2>
              <p className="mt-2 text-sm text-slate-600">
                Authorized recruiter access only. Publish positions, review candidate profiles, schedule interviews, and update pipeline stages.
              </p>
              <div className="mt-6">
                <Link
                  to="/recruiter/login"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 px-4 py-2 rounded-lg transition-colors"
                >
                  <Lock className="w-4 h-4 text-slate-600" />
                  Recruiter Sign In <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="mt-2 text-xs text-slate-400">
                  Recruiter accounts are provisioned via enterprise admin.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Architecture Highlights */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Phase 1 Security & Architecture
            </h2>
            <p className="mt-2 text-slate-600 text-sm">
              Strict access controls, non-repudiation, and defense-in-depth implemented across all layers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Authoritative Role Model</h3>
              <p className="mt-2 text-sm text-slate-600">
                Roles (student, recruiter, admin) are securely resolved from PostgreSQL. Public signups are strictly constrained to student accounts.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">PostgreSQL Row-Level Security</h3>
              <p className="mt-2 text-sm text-slate-600">
                All 7 core database tables are protected with granular RLS policies. Students and recruiters can only read and manipulate authorized records.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center mb-4">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-base">Private Resume Storage</h3>
              <p className="mt-2 text-sm text-slate-600">
                Resumes are stored in a private Supabase bucket with MIME type enforcement (PDF only) and 5MB limits. Access requires verified authorization.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
