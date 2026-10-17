import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { NotificationItem } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Alert } from '../../components/Alert';
import { Bell, Check, ExternalLink } from 'lucide-react';

export const StudentNotificationsPage: React.FC = () => {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStudentNotifications(session.access_token);
      setNotifications(data || []);
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [session]);

  const handleMarkRead = async (id: string) => {
    if (!session?.access_token) return;
    try {
      await api.markNotificationRead(session.access_token, id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notifications & Alerts</h1>
        <p className="text-sm text-slate-600 mt-1">
          Real-time updates regarding your job applications and coordinated interviews.
        </p>
      </div>

      {error && <Alert type="error" title="Notice" message={error} />}

      {loading ? (
        <LoadingSpinner size="lg" message="Loading notifications..." className="py-20" />
      ) : notifications.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`p-5 flex items-start justify-between gap-4 transition-colors ${
                !item.read_at ? 'bg-indigo-50/30' : 'hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    !item.read_at
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    {!item.read_at && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                    <span>{new Date(item.created_at).toLocaleString()}</span>
                    {item.related_application_id && (
                      <Link
                        to={`/student/applications/${item.related_application_id}`}
                        className="text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        View application <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {!item.read_at && (
                <button
                  type="button"
                  onClick={() => handleMarkRead(item.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-slate-200 transition-colors flex-shrink-0"
                  title="Mark as read"
                >
                  <Check className="w-3.5 h-3.5" /> Read
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No notifications yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            When recruiters review your applications or schedule interviews, alerts will appear here.
          </p>
        </div>
      )}
    </div>
  );
};
