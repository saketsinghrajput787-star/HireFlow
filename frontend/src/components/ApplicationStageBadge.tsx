import React from 'react';
import { ApplicationStage } from '../types';
import { Clock, Search, Video, Award, CheckCircle2, XCircle } from 'lucide-react';

interface StageBadgeProps {
  stage: ApplicationStage;
  className?: string;
  size?: 'sm' | 'md';
}

export const ApplicationStageBadge: React.FC<StageBadgeProps> = ({
  stage,
  className = '',
  size = 'md',
}) => {
  const configs: Record<
    ApplicationStage,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    applied: {
      label: 'Applied',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: <Clock className="w-3.5 h-3.5 mr-1" />,
    },
    screening: {
      label: 'Under Review',
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200',
      icon: <Search className="w-3.5 h-3.5 mr-1" />,
    },
    interview: {
      label: 'Interviewing',
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      icon: <Video className="w-3.5 h-3.5 mr-1" />,
    },
    offer: {
      label: 'Offer Received',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: <Award className="w-3.5 h-3.5 mr-1" />,
    },
    hired: {
      label: 'Hired',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1" />,
    },
    rejected: {
      label: 'Not Selected',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      icon: <XCircle className="w-3.5 h-3.5 mr-1" />,
    },
  };

  const config = configs[stage] || configs.applied;
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
};
