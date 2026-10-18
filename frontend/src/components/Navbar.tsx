import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { RoleBadge } from './RoleBadge';
import { api } from '../services/api';
import {
  Briefcase,
  LogOut,
  Menu,
  X,
  User,
  Shield,
  Bell,
  Sparkles,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (session?.access_token && profile?.role === 'student') {
      api
        .getStudentNotifications(session.access_token)
        .then((items) => {
          setUnreadCount(items.filter((n) => !n.read_at).length);
        })
        .catch(() => {});
    }
  }, [session, profile, location.pathname]);

  const handleSignOut = async () => {
    const isRecruiter = location.pathname.startsWith('/recruiter') || profile?.role === 'recruiter';
    await signOut();
    navigate(isRecruiter ? '/recruiter/login' : '/student/login', { replace: true });
  };

  const isStudent = profile?.role === 'student';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:bg-indigo-700 transition-colors">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                HireFlow
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                ATS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-5">
            {session && profile ? (
              <div className="flex items-center gap-5">
                {isStudent ? (
                  <>
                    <Link
                      to="/student/dashboard"
                      className={`text-sm font-medium transition-colors ${
                        location.pathname === '/student/dashboard'
                          ? 'text-indigo-600 font-bold'
                          : 'text-slate-600 hover:text-indigo-600'
                      }`}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/student/jobs"
                      className={`text-sm font-medium transition-colors ${
                        location.pathname.startsWith('/student/jobs')
                          ? 'text-indigo-600 font-bold'
                          : 'text-slate-600 hover:text-indigo-600'
                      }`}
                    >
                      Browse Jobs
                    </Link>
                    <Link
                      to="/student/applications"
                      className={`text-sm font-medium transition-colors ${
                        location.pathname.startsWith('/student/applications')
                          ? 'text-indigo-600 font-bold'
                          : 'text-slate-600 hover:text-indigo-600'
                      }`}
                    >
                      My Applications
                    </Link>
                    <Link
                      to="/student/interviews"
                      className={`text-sm font-medium transition-colors ${
                        location.pathname === '/student/interviews'
                          ? 'text-indigo-600 font-bold'
                          : 'text-slate-600 hover:text-indigo-600'
                      }`}
                    >
                      Interviews
                    </Link>
                    <Link
                      to="/student/profile"
                      className={`text-sm font-medium transition-colors ${
                        location.pathname === '/student/profile'
                          ? 'text-indigo-600 font-bold'
                          : 'text-slate-600 hover:text-indigo-600'
                      }`}
                    >
                      Profile
                    </Link>
                    <Link
                      to="/student/resume-analysis"
                      className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                        location.pathname === '/student/resume-analysis'
                          ? 'text-indigo-600 font-bold'
                          : 'text-slate-600 hover:text-indigo-600'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      Resume Intelligence
                    </Link>

                    {/* Notification Bell */}
                    <Link
                      to="/student/notifications"
                      className="relative p-2 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Notifications"
                    >
                      <Bell className="w-4 h-4" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                      )}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/recruiter/dashboard"
                      className={`text-sm font-medium transition-colors ${
                        location.pathname === '/recruiter/dashboard'
                          ? 'text-indigo-600 font-bold'
                          : 'text-slate-600 hover:text-indigo-600'
                      }`}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/recruiter/jobs"
                      className={`text-sm font-medium transition-colors ${
                        location.pathname.startsWith('/recruiter/jobs')
                          ? 'text-indigo-600 font-bold'
                          : 'text-slate-600 hover:text-indigo-600'
                      }`}
                    >
                      Job Postings
                    </Link>
                    <Link
                      to="/recruiter/applicants"
                      className={`text-sm font-medium transition-colors ${
                        location.pathname.startsWith('/recruiter/applicants')
                          ? 'text-indigo-600 font-bold'
                          : 'text-slate-600 hover:text-indigo-600'
                      }`}
                    >
                      Applicants
                    </Link>
                    <Link
                      to="/recruiter/interviews"
                      className={`text-sm font-medium transition-colors ${
                        location.pathname.startsWith('/recruiter/interviews')
                          ? 'text-indigo-600 font-bold'
                          : 'text-slate-600 hover:text-indigo-600'
                      }`}
                    >
                      Interviews
                    </Link>
                  </>
                )}

                <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold text-slate-800 leading-tight">
                      {profile.full_name}
                    </span>
                    <span className="text-xs text-slate-500">{profile.email}</span>
                  </div>
                  <RoleBadge role={profile.role} />
                  <button
                    onClick={handleSignOut}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/student/login"
                  className="text-sm font-medium text-slate-700 hover:text-indigo-600 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Student Sign In
                </Link>
                <Link
                  to="/student/signup"
                  className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg shadow-sm transition-colors"
                >
                  Student Sign Up
                </Link>
                <div className="h-6 w-px bg-slate-200 mx-1"></div>
                <Link
                  to="/recruiter/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-700 hover:bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 transition-colors"
                >
                  <Shield className="w-4 h-4 text-indigo-600" />
                  Recruiter Portal
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2 shadow-lg">
          {session && profile ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{profile.full_name}</p>
                    <p className="text-xs text-slate-500">{profile.email}</p>
                  </div>
                </div>
                <RoleBadge role={profile.role} />
              </div>

              {isStudent ? (
                <div className="space-y-1">
                  <Link
                    to="/student/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm font-medium text-slate-700 hover:text-indigo-600 py-1.5"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/student/jobs"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm font-medium text-slate-700 hover:text-indigo-600 py-1.5"
                  >
                    Browse Jobs
                  </Link>
                  <Link
                    to="/student/applications"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm font-medium text-slate-700 hover:text-indigo-600 py-1.5"
                  >
                    My Applications
                  </Link>
                  <Link
                    to="/student/interviews"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm font-medium text-slate-700 hover:text-indigo-600 py-1.5"
                  >
                    Interviews
                  </Link>
                  <Link
                    to="/student/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm font-medium text-slate-700 hover:text-indigo-600 py-1.5"
                  >
                    Candidate Profile
                  </Link>
                  <Link
                    to="/student/resume-analysis"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm font-medium text-indigo-600 hover:text-indigo-800 py-1.5"
                  >
                    Resume Intelligence & Tailoring
                  </Link>
                  <Link
                    to="/student/notifications"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm font-medium text-slate-700 hover:text-indigo-600 py-1.5"
                  >
                    Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  <Link
                    to="/recruiter/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm font-medium text-slate-700 hover:text-indigo-600 py-1.5"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/recruiter/jobs"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm font-medium text-slate-700 hover:text-indigo-600 py-1.5"
                  >
                    Job Postings
                  </Link>
                  <Link
                    to="/recruiter/applicants"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm font-medium text-slate-700 hover:text-indigo-600 py-1.5"
                  >
                    Applicant Pipeline
                  </Link>
                  <Link
                    to="/recruiter/interviews"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm font-medium text-slate-700 hover:text-indigo-600 py-1.5"
                  >
                    Interview Coordination
                  </Link>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full text-left text-sm font-medium text-rose-600 hover:text-rose-700 py-1"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pt-2">
              <Link
                to="/student/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-slate-700 py-2"
              >
                Student Sign In
              </Link>
              <Link
                to="/student/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 py-2 rounded-lg"
              >
                Student Sign Up
              </Link>
              <Link
                to="/recruiter/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 text-sm font-medium text-slate-700 border border-slate-200 py-2 rounded-lg"
              >
                <Shield className="w-4 h-4 text-indigo-600" />
                Recruiter Portal
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
