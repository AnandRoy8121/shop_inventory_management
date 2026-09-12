'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, message };

      setToasts((prev) => [...prev, newToast]);

      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        dismiss(id);
      }, 4000);
    },
    [dismiss]
  );

  const success = useCallback(
    (message: string, title?: string) => showToast(message, 'success', title),
    [showToast]
  );
  const error = useCallback(
    (message: string, title?: string) => showToast(message, 'error', title),
    [showToast]
  );
  const info = useCallback(
    (message: string, title?: string) => showToast(message, 'info', title),
    [showToast]
  );
  const warning = useCallback(
    (message: string, title?: string) => showToast(message, 'warning', title),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning, dismiss }}>
      {children}
      {/* Toast Render Viewport */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none p-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5',
              toast.type === 'success' && 'bg-emerald-50/95 border-emerald-200 text-emerald-900',
              toast.type === 'error' && 'bg-rose-50/95 border-rose-200 text-rose-900',
              toast.type === 'warning' && 'bg-amber-50/95 border-amber-200 text-amber-900',
              toast.type === 'info' && 'bg-indigo-50/95 border-indigo-200 text-indigo-900'
            )}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-600" />}
              {toast.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
              {toast.type === 'info' && <Info className="h-5 w-5 text-indigo-600" />}
            </div>

            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className="text-xs font-bold leading-none mb-1">{toast.title}</h4>
              )}
              <p className="text-xs leading-relaxed opacity-90">{toast.message}</p>
            </div>

            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 rounded-md p-1 opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
