'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Failed to load content',
  message = 'An error occurred while loading this section. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50/50 p-8 text-center text-rose-900',
        className
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-3 shadow-2xs">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-bold tracking-tight">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-rose-700/80 leading-relaxed">{message}</p>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-4 gap-1.5 border-rose-200 bg-white text-xs font-semibold text-rose-700 hover:bg-rose-50 shadow-2xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Try Again</span>
        </Button>
      )}
    </div>
  );
}
