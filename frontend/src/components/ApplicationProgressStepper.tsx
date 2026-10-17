import React from 'react';
import { ApplicationStage } from '../types';
import { Check, XCircle, Clock } from 'lucide-react';

interface StepperProps {
  currentStage: ApplicationStage;
  className?: string;
}

const STAGES: { key: ApplicationStage; label: string }[] = [
  { key: 'applied', label: 'Applied' },
  { key: 'screening', label: 'Screening' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'hired', label: 'Hired' },
];

export const ApplicationProgressStepper: React.FC<StepperProps> = ({
  currentStage,
  className = '',
}) => {
  const isRejected = currentStage === 'rejected';

  const stageOrder: Record<string, number> = {
    applied: 0,
    screening: 1,
    interview: 2,
    offer: 3,
    hired: 4,
    rejected: -1,
  };

  const currentIndex = stageOrder[currentStage] ?? 0;

  return (
    <div className={`w-full ${className}`}>
      {isRejected ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-900">Application Closed — Not Selected</p>
            <p className="text-xs text-rose-700 mt-0.5">
              Thank you for applying. The hiring team has decided to proceed with other candidates at this time.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Progress Bar Line */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0" />
          <div
            className="absolute top-4 left-6 h-0.5 bg-indigo-600 -z-0 transition-all duration-300"
            style={{
              width: `${Math.min(100, Math.max(0, (currentIndex / (STAGES.length - 1)) * 100))}%`,
            }}
          />

          {/* Steps */}
          <div className="flex items-center justify-between relative z-10">
            {STAGES.map((step, idx) => {
              const isPast = idx < currentIndex;
              const isCurrent = idx === currentIndex;

              return (
                <div key={step.key} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      isPast
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : isCurrent
                        ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow'
                        : 'bg-white border-2 border-slate-300 text-slate-400'
                    }`}
                  >
                    {isPast ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : isCurrent ? (
                      <Clock className="w-4 h-4 animate-pulse" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      isCurrent
                        ? 'text-indigo-600 font-bold'
                        : isPast
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
