'use client';

import React from 'react';
import { Breadcrumbs, BreadcrumbItem } from './breadcrumbs';

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  badge,
  children,
}: PageHeaderProps) {
  return (
    <div className="mb-6 space-y-3">
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbs} className="mb-2" />

      {/* Main header bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            {badge}
          </div>
          {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
        </div>

        {/* Actions slot */}
        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>

      {children}
    </div>
  );
}
