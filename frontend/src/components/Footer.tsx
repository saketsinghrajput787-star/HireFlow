import React from 'react';
import { Shield, Lock, Database } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-600 text-sm">
            <span className="font-semibold text-slate-800">HireFlow ATS</span>
            <span>&bull;</span>
            <span>Phase 1 Architecture Foundation</span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              Role-Based Access Control
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              Private Storage
            </span>
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-sky-600" />
              PostgreSQL RLS
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
