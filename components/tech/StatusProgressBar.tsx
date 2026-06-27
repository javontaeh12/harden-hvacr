'use client';

import { Check } from 'lucide-react';

const steps = [
  { key: 'assigned', label: 'Assigned' },
  { key: 'en_route', label: 'En Route' },
  { key: 'in_progress', label: 'On Site' },
  { key: 'completed', label: 'Completed' },
];

interface StatusProgressBarProps {
  currentStatus: string;
  onAdvance?: (nextStatus: string) => void;
  loading?: boolean;
}

export default function StatusProgressBar({ currentStatus, onAdvance, loading }: StatusProgressBarProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStatus);
  const nextStep = currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;

  return (
    <div className="space-y-4">
      {/* Progress circles with connecting lines */}
      <div className="flex items-center">
        {steps.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isLast = i === steps.length - 1;

          return (
            <div key={step.key} className="flex-1 flex items-center">
              <div className="flex flex-col items-center relative">
                {/* Circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isCurrent
                      ? 'bg-[#e55b2b] text-white animate-pulse'
                      : 'bg-[#c8d8ea] text-[#4a6580]'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                {/* Label */}
                <span
                  className={`text-[10px] font-medium mt-1.5 whitespace-nowrap ${
                    isCompleted
                      ? 'text-emerald-600'
                      : isCurrent
                      ? 'text-[#e55b2b]'
                      : 'text-[#4a6580]'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {/* Connecting line */}
              {!isLast && (
                <div className="flex-1 mx-1">
                  <div
                    className={`h-0.5 w-full rounded-full ${
                      i < currentIndex
                        ? 'bg-emerald-500'
                        : 'bg-[#0a1f3f]/10'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Advance button */}
      {nextStep && onAdvance && (
        <button
          onClick={() => onAdvance(nextStep.key)}
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-[#e55b2b] text-white text-sm font-medium hover:bg-[#d14e22] active:bg-[#c04520] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Updating...
            </>
          ) : (
            `Move to ${nextStep.label}`
          )}
        </button>
      )}
    </div>
  );
}
