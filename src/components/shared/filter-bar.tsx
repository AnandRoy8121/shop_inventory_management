'use client';

import React from 'react';
import { SearchInput } from './search-input';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filters?: React.ReactNode;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search items...',
  filters,
  onReset,
  hasActiveFilters = false,
  className,
  children,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs mb-4',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
        {onSearchChange && (
          <SearchInput
            value={searchValue || ''}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        )}
        {filters}
        {children}
      </div>

      {hasActiveFilters && onReset && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          className="gap-1.5 text-xs text-slate-600 hover:text-slate-900 shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
          <span>Reset Filters</span>
        </Button>
      )}
    </div>
  );
}
