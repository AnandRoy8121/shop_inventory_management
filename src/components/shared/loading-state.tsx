import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingStateProps {
  label?: string;
  variant?: 'spinner' | 'table-skeleton' | 'card-skeleton';
  rows?: number;
  className?: string;
}

export function LoadingState({
  label = 'Loading data...',
  variant = 'spinner',
  rows = 5,
  className,
}: LoadingStateProps) {
  if (variant === 'table-skeleton') {
    return (
      <div
        className={cn(
          'w-full space-y-2.5 p-4 bg-white rounded-xl border border-slate-200 animate-pulse',
          className
        )}
      >
        <div className="h-8 bg-slate-100 rounded-lg w-full mb-4" />
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 py-2 border-b border-slate-100 last:border-none"
          >
            <div className="h-4 bg-slate-100 rounded-md w-1/4" />
            <div className="h-4 bg-slate-100 rounded-md w-1/4" />
            <div className="h-4 bg-slate-100 rounded-md w-1/4" />
            <div className="h-4 bg-slate-100 rounded-md w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'card-skeleton') {
    return (
      <div
        className={cn(
          'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse',
          className
        )}
      >
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-white border border-slate-200 p-4 space-y-3">
            <div className="h-3 bg-slate-100 rounded-md w-1/2" />
            <div className="h-6 bg-slate-100 rounded-md w-3/4" />
            <div className="h-2 bg-slate-100 rounded-md w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        'flex flex-col items-center justify-center py-12 text-center text-slate-500',
        className
      )}
    >
      <Loader2 className="h-7 w-7 animate-spin text-indigo-600 mb-2" />
      <span className="text-xs font-medium tracking-wide">{label}</span>
    </div>
  );
}
