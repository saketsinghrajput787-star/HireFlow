import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">404</h1>
        <p className="mt-2 text-lg font-semibold text-slate-700">Page not found</p>
        <p className="mt-2 text-sm text-slate-500">
          The requested route does not exist or you may not have authorization to view it.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Return to HireFlow Home
          </Link>
        </div>
      </div>
    </div>
  );
};
