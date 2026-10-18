import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import { NotificationItem } from '../../types';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Alert } from '../../components/Alert';
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Calendar,
  Briefcase,
  Sparkles,
  MessageSquare,
  Clock,
  XCircle,
  RefreshCw,
} from 'lucide-react';

export const StudentNotificationsPage: React.FC = () => {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

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

  const handleMarkAllRead = async () => {
    if (!session?.access_token) return;
    setMarkingAll(true);
    try {
      await api.markAllNotificationsRead(session.access_token);
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to mark all notifications as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const displayedNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.read_at) : notifications;

  const renderIcon = (type: string, isRead: boolean) => {
    const baseColor = isRead ? 'bg-slate-100 text-slate-500' : 'bg-indigo-600 text-white shadow-sm';
    switch (type) {
      case 'application_submitted':
        return (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${baseColor}`}>
            <Briefcase className="w-4 h-4" />
          </div>
        );
      case 'interview_scheduled':
      case 'interview_reminder':
        return (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${isRead ? 'bg-slate-100 text-slate-500' : 'bg-purple-600 text-white shadow-sm'}`}>
            <Calendar className="w-4 h-4" />
          </div>
        );
      case 'interview_rescheduled':
        return (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${isRead ? 'bg-slate-100 text-slate-500' : 'bg-amber-500 text-white shadow-sm'}`}>
            <Clock className="w-4 h-4" />
          </div>
        );
      case 'interview_cancelled':
        return (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${isRead ? 'bg-slate-100 text-slate-500' : 'bg-rose-500 text-white shadow-sm'}`}>
            <XCircle className="w-4 h-4" />
          </div>
        );
      case 'interview_completed':
      case 'interview_feedback':
        return (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${isRead ? 'bg-slate-100 text-slate-500' : 'bg-emerald-600 text-white shadow-sm'}`}>
            <MessageSquare className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${baseColor}`}>
            <Sparkles className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">Notifications & Alerts</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-indigo-100 text-indigo-700">
                {unreadCount} new
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Real-time updates regarding your job applications, coordinated interviews, and reminders.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors shadow-xs disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5 text-indigo-600" />
              {markingAll ? 'Marking...' : 'Mark all as read'}
            </button>
          )}

          <button
            type="button"
            onClick={fetchNotifications}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors shadow-xs disabled:opacity-50"
            title="Refresh notifications"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-indigo-50 text-indigo-700 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            filter === 'unread'
              ? 'bg-indigo-50 text-indigo-700 font-bold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
          )}
          ({unreadCount})
        </button>
      </div>

      {error && (
        <Alert
          type="error"
          title="Notice"
          message={error}
          action={
            <button
              type="button"
              onClick={fetchNotifications}
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 underline hover:no-underline mt-1"
            >
              <RefreshCw className="w-3 h-3" /> Retry Loading
            </button>
          }
        />
      )}

      {loading ? (
        <LoadingSpinner size="lg" message="Loading notifications..." className="py-20" />
      ) : displayedNotifications.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {displayedNotifications.map((item) => {
            const isRead = Boolean(item.read_at);
            return (
              <div
                key={item.id}
                className={`p-5 flex items-start justify-between gap-4 transition-colors ${
                  !isRead ? 'bg-indigo-50/30' : 'hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {renderIcon(item.notification_type, isRead)}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-bold ${isRead ? 'text-slate-800' : 'text-slate-950'}`}>
                        {item.title}
                      </h3>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{item.message}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <span>{new Date(item.created_at).toLocaleString()}</span>
                      {item.related_application_id && (
                        <Link
                          to={`/student/applications/${item.related_application_id}`}
                          className="text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                        >
                          View application details <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {!isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(item.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg border border-slate-200 transition-colors flex-shrink-0 shadow-2xs"
                    title="Mark as read"
                  >
                    <Check className="w-3.5 h-3.5" /> Read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            {filter === 'unread'
              ? 'You are all caught up! You have reviewed all application and interview alerts.'
              : 'When recruiters review your applications or schedule interviews, alerts will appear here.'}
          </p>
          {filter === 'unread' && notifications.length > 0 && (
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="mt-4 text-xs font-semibold text-indigo-600 hover:underline"
            >
              View all notifications ({notifications.length}) &rarr;
            </button>
          )}
        </div>
      )}
    </div>
  );
};
