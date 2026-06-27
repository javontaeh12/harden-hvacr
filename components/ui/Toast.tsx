'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const borderColorMap = {
  success: 'border-l-green-500',
  error: 'border-l-red-500',
  info: 'border-l-blue-500',
  warning: 'border-l-amber-500',
};

const iconColorMap = {
  success: 'text-green-500',
  error: 'text-red-500',
  info: 'text-blue-500',
  warning: 'text-amber-500',
};

const progressColorMap = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const duration = toast.duration ?? 4000;
  const Icon = iconMap[toast.type];

  useEffect(() => {
    // Trigger enter animation on next frame
    const frame = requestAnimationFrame(() => {
      setVisible(true);
    });

    // Start progress countdown
    startTimeRef.current = Date.now();
    const animateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(animateProgress);
      }
    };
    rafRef.current = requestAnimationFrame(animateProgress);

    // Auto-dismiss
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDismiss() {
    setExiting(true);
    cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 200);
  }

  return (
    <div
      className={cn(
        'relative w-full max-w-sm bg-white rounded-lg shadow-lg border-l-[3px] overflow-hidden',
        'transition-all duration-200 ease-out',
        borderColorMap[toast.type],
        visible && !exiting ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3 p-4 pr-10">
        <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', iconColorMap[toast.type])} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy">{toast.title}</p>
          {toast.description && (
            <p className="mt-1 text-xs text-steel">{toast.description}</p>
          )}
        </div>
      </div>

      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-md text-steel hover:text-navy hover:bg-ice transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100">
        <div
          className={cn('h-full transition-none', progressColorMap[toast.type])}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
