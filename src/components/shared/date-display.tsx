import React from 'react';
import { format, formatDistanceToNow, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

export type DateFormatVariant = 'dateTime' | 'date' | 'time' | 'relative';

export interface DateDisplayProps {
  date: Date | string | number;
  formatVariant?: DateFormatVariant;
  className?: string;
}

export function DateDisplay({ date, formatVariant = 'dateTime', className }: DateDisplayProps) {
  const d = new Date(date);

  if (!isValid(d)) {
    return <span className={cn('text-slate-400 font-mono text-xs', className)}>—</span>;
  }

  let formatted = '';
  switch (formatVariant) {
    case 'date':
      formatted = format(d, 'MMM d, yyyy');
      break;
    case 'time':
      formatted = format(d, 'h:mm a');
      break;
    case 'relative':
      formatted = formatDistanceToNow(d, { addSuffix: true });
      break;
    case 'dateTime':
    default:
      formatted = format(d, 'MMM d, yyyy, h:mm a');
      break;
  }

  return (
    <time
      dateTime={d.toISOString()}
      title={format(d, 'yyyy-MM-dd HH:mm:ss')}
      className={cn('text-xs text-slate-600 font-medium', className)}
    >
      {formatted}
    </time>
  );
}
