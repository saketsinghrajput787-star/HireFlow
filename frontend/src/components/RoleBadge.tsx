import React from 'react';
import { UserRole } from '../types';
import { ShieldCheck, GraduationCap, Briefcase } from 'lucide-react';

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className = '' }) => {
  const configs = {
    student: {
      label: 'Student',
      style: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: <GraduationCap className="w-3.5 h-3.5 mr-1 text-blue-600" />,
    },
    recruiter: {
      label: 'Recruiter',
      style: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: <Briefcase className="w-3.5 h-3.5 mr-1 text-indigo-600" />,
    },
    admin: {
      label: 'Administrator',
      style: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: <ShieldCheck className="w-3.5 h-3.5 mr-1 text-purple-600" />,
    },
  };

  const config = configs[role] || configs.student;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.style} ${className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
};
