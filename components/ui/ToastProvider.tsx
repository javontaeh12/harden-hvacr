'use client';

import { createContext, useCallback, useState, type ReactNode } from 'react';
import { Toast, type ToastData } from './Toast';

interface ToastContextType {
  toasts: ToastData[];
  toast: {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
    warning: (title: string, description?: string) => void;
  };
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);

const MAX_TOASTS = 3;

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastData['type'], title: string, description?: string, duration?: number) => {
      const id = `toast-${++toastCounter}-${Date.now()}`;
      const newToast: ToastData = { id, type, title, description, duration };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        // Keep only the most recent MAX_TOASTS
        if (updated.length > MAX_TOASTS) {
          return updated.slice(updated.length - MAX_TOASTS);
        }
        return updated;
      });
    },
    []
  );

  const toast = {
    success: useCallback(
      (title: string, description?: string) => addToast('success', title, description),
      [addToast]
    ),
    error: useCallback(
      (title: string, description?: string) => addToast('error', title, description),
      [addToast]
    ),
    info: useCallback(
      (title: string, description?: string) => addToast('info', title, description),
      [addToast]
    ),
    warning: useCallback(
      (title: string, description?: string) => addToast('warning', title, description),
      [addToast]
    ),
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}

      {/* Toast container - bottom-right on desktop, top-center on mobile */}
      {toasts.length > 0 && (
        <>
          {/* Desktop: bottom-right */}
          <div
            className="hidden md:flex fixed bottom-4 right-4 z-50 flex-col-reverse gap-2 pointer-events-auto"
            aria-label="Notifications"
          >
            {toasts.map((t) => (
              <Toast key={t.id} toast={t} onDismiss={dismiss} />
            ))}
          </div>

          {/* Mobile: top-center */}
          <div
            className="flex md:hidden fixed top-4 inset-x-4 z-50 flex-col gap-2 pointer-events-auto"
            aria-label="Notifications"
          >
            {toasts.map((t) => (
              <Toast key={t.id} toast={t} onDismiss={dismiss} />
            ))}
          </div>
        </>
      )}
    </ToastContext.Provider>
  );
}
