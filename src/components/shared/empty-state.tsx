'use client';

import React from 'react';
import { PackageOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-3 shadow-2xs">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
