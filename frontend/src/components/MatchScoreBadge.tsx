import React, { useState } from 'react';
import { JobMatchScore } from '../types';
import { Sparkles, CheckCircle2, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface MatchScoreBadgeProps {
  match?: JobMatchScore | null;
  size?: 'sm' | 'md' | 'detailed';
  showPopover?: boolean;
  className?: string;
}

export const MatchScoreBadge: React.FC<MatchScoreBadgeProps> = ({
  match,
  size = 'sm',
  showPopover = true,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!match) return null;

  const { score, is_partial_profile, matched_skills, missing_skills, match_reasons } = match;

  // Color schemes based on match tiers
  const getBadgeStyles = () => {
    if (is_partial_profile) {
      return {
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        ring: 'ring-slate-300',
        text: 'text-slate-700',
        bar: 'bg-slate-400',
        label: 'Incomplete Profile',
        icon: <Info className="w-3.5 h-3.5 text-slate-500" />,
      };
    }
    if (score >= 80) {
      return {
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
        ring: 'ring-emerald-400',
        text: 'text-emerald-700',
        bar: 'bg-emerald-500',
        label: 'Strong Match',
        icon: <Sparkles className="w-3.5 h-3.5 text-emerald-600" />,
      };
    }
    if (score >= 60) {
      return {
        bg: 'bg-indigo-50 text-indigo-800 border-indigo-200/90',
        ring: 'ring-indigo-400',
        text: 'text-indigo-700',
        bar: 'bg-indigo-500',
        label: 'Good Match',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />,
      };
    }
    if (score >= 40) {
      return {
        bg: 'bg-amber-50 text-amber-800 border-amber-200/90',
        ring: 'ring-amber-400',
        text: 'text-amber-700',
        bar: 'bg-amber-500',
        label: 'Partial Match',
        icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" />,
      };
    }
    return {
      bg: 'bg-rose-50 text-rose-800 border-rose-200/90',
      ring: 'ring-rose-400',
      text: 'text-rose-700',
      bar: 'bg-rose-500',
      label: 'Low Match',
      icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />,
    };
  };

  const style = getBadgeStyles();

  // Compact size for cards and lists
  if (size === 'sm') {
    return (
      <div className={`relative inline-block ${className}`}>
        <div
          onClick={(e) => {
            if (showPopover) {
              e.stopPropagation();
              setExpanded(!expanded);
            }
          }}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border shadow-2xs transition-all ${style.bg} ${showPopover ? 'cursor-pointer hover:shadow-xs' : ''}`}
          title={is_partial_profile ? 'Incomplete candidate profile' : `${score}% Job Fit`}
        >
          {style.icon}
          <span>{is_partial_profile ? 'Profile Incomplete' : `${score}% Match`}</span>
          {showPopover && (
            <span className="text-[10px] opacity-60">
              {expanded ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />}
            </span>
          )}
        </div>

        {/* Dropdown breakdown popover */}
        {expanded && showPopover && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-full mt-1.5 z-40 w-72 sm:w-80 p-4 bg-white rounded-2xl shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                {style.icon}
                <span className="text-xs font-bold text-slate-900">
                  {is_partial_profile ? 'Profile Incomplete' : `${score}% Alignment Score`}
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${style.bg}`}>
                {style.label}
              </span>
            </div>

            {/* Progress bar */}
            <div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>

            {/* Matched & Missing Skills Snapshot */}
            <div className="space-y-1.5 text-xs">
              {matched_skills.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Matched Skills</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {matched_skills.map((s, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded border border-emerald-100">
                        ✓ {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {missing_skills.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-rose-700 block mt-1">Missing Requirements</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {missing_skills.map((s, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-semibold rounded border border-rose-100">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Match Reasons preview */}
            {match_reasons.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-600">
                <p className="font-semibold text-slate-800">Scoring Factors:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
                  {match_reasons.slice(0, 3).map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-[9px] text-slate-400 italic pt-1 border-t border-slate-100">
              Decision support only; does not guarantee selection.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Medium badge
  if (size === 'md') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border font-semibold text-xs ${style.bg} ${className}`}>
        {style.icon}
        <span>{is_partial_profile ? 'Incomplete Profile' : `${score}% Match`}</span>
        <span className="text-slate-300">|</span>
        <span className="text-[11px] font-medium">{style.label}</span>
      </div>
    );
  }

  // Detailed panel for job details and applicant drawer
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border ${style.bg}`}>
            {is_partial_profile ? '!' : `${score}%`}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {is_partial_profile ? 'Incomplete Profile Match' : 'Job Match Analysis'}
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${style.bg}`}>
                {style.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {is_partial_profile
                ? 'Candidate profile has incomplete skills or experience history.'
                : `Calculated by comparing profile attributes against job specifications.`}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Overall Match Rating</span>
          <span>{score} / 100</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${style.bar}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Matched vs Missing Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Matched Skills */}
        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Matched Skills ({matched_skills.length})
            </span>
          </div>
          {matched_skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {matched_skills.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-emerald-800 border border-emerald-200/80 shadow-2xs"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-emerald-600 italic">No direct required skill overlap found.</p>
          )}
        </div>

        {/* Missing Requirements */}
        <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              Missing Requirements ({missing_skills.length})
            </span>
          </div>
          {missing_skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {missing_skills.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-rose-800 border border-rose-200/80 shadow-2xs"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-rose-600 font-medium">All required skills are present on profile!</p>
          )}
        </div>
      </div>

      {/* Transparent Reasons List */}
      {match_reasons.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Transparent Evaluation Factors
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-600">
            {match_reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
