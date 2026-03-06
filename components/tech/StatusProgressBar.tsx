'use client';

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
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        {steps.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`h-2 w-full rounded-full ${
                  isCompleted
                    ? 'bg-green-500'
                    : isCurrent
                    ? 'bg-accent'
                    : 'bg-ice'
                }`}
              />
              <span
                className={`text-[10px] font-medium ${
                  isCompleted
                    ? 'text-green-600'
                    : isCurrent
                    ? 'text-accent'
                    : 'text-steel'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      {nextStep && onAdvance && (
        <button
          onClick={() => onAdvance(nextStep.key)}
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-ember text-white text-sm font-medium hover:bg-ember-dark active:bg-ember-dark/90 disabled:opacity-50 flex items-center justify-center gap-2"
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
