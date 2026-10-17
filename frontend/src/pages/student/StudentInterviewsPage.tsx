import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { InterviewItem } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Alert } from '../../components/Alert';
import { Calendar, Video, ArrowRight } from 'lucide-react';

export const StudentInterviewsPage: React.FC = () => {
  const { session } = useAuth();
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (session?.access_token) {
      setLoading(true);
      setError(null);
      api
        .getStudentInterviews(session.access_token)
        .then((data) => {
          if (mounted) setInterviews(data || []);
        })
        .catch((err) => {
          if (mounted) setError(err.message || 'Unable to retrieve interview schedule.');
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    }
    return () => {
      mounted = false;
    };
  }, [session]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Interviews & Meetings</h1>
        <p className="text-sm text-slate-600 mt-1">
          Coordinated video, phone, and in-person interviews scheduled with hiring teams.
        </p>
      </div>

      {error && <Alert type="error" title="Notice" message={error} />}

      {loading ? (
        <LoadingSpinner size="lg" message="Loading interview schedule..." className="py-20" />
      ) : interviews.length > 0 ? (
        <div className="space-y-4">
          {interviews.map((item) => (
            <div
              key={item.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                    {item.interview_format} interview
                  </span>
                  <span className="text-xs font-medium text-slate-500 capitalize">
                    &bull; Status: {item.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    {new Date(item.scheduled_at).toLocaleString()} ({item.timezone})
                  </p>
                  {item.feedback && (
                    <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                      Feedback: {item.feedback}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                {item.meeting_link && (
                  <a
                    href={item.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition-colors"
                  >
                    <Video className="w-3.5 h-3.5" /> Join Meeting
                  </a>
                )}
                <Link
                  to={`/student/applications/${item.application_id}`}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  View Application <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No interviews scheduled yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            When recruiters progress your applications to the interview round, meeting coordinates and dates will be listed here.
          </p>
          <div className="mt-4">
            <Link
              to="/student/applications"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Check Application Status <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
