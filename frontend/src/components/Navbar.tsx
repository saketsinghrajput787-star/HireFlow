import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { RoleBadge } from './RoleBadge';
import { Briefcase, LogOut, Menu, X, User, Shield } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

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
                Phase 1 ATS
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-4">
            {session && profile ? (
              <div className="flex items-center gap-4">
                <Link
                  to={profile.role === 'recruiter' ? '/recruiter/dashboard' : '/student/dashboard'}
                  className="text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors"
                >
                  Dashboard
                </Link>

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
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
              <Link
                to={profile.role === 'recruiter' ? '/recruiter/dashboard' : '/student/dashboard'}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-sm font-medium text-indigo-600 hover:text-indigo-800 py-1"
              >
                Go to Dashboard
              </Link>
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
