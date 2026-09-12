'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'onChange'
> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  containerClassName?: string;
}

export function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  className,
  containerClassName,
  ...props
}: SearchInputProps) {
  const handleClear = () => {
    onChange('');
    if (onClear) onClear();
  };

  return (
    <div className={cn('relative flex items-center w-full max-w-sm', containerClassName)}>
      <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition shadow-2xs',
          className
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2.5 rounded-full p-0.5 text-slate-400 hover:text-slate-600 transition"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
