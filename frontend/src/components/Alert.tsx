import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

interface AlertProps {
  type?: 'error' | 'success' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'error',
  title,
  message,
  onClose,
  className = '',
}) => {
  const styles = {
    error: 'bg-rose-50 border-rose-200 text-rose-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    info: 'bg-indigo-50 border-indigo-200 text-indigo-800',
  };

  const icons = {
    error: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-600 flex-shrink-0" />,
  };

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-lg border shadow-sm ${styles[type]} ${className}`}
    >
      {icons[type]}
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <p className="leading-relaxed">{message}</p>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss alert"
          className="text-slate-400 hover:text-slate-600 transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
