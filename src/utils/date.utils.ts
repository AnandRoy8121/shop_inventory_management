import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
} from 'date-fns';

export function formatDate(date: Date | string | number, pattern = 'yyyy-MM-dd HH:mm:ss'): string {
  return format(new Date(date), pattern);
}

export function formatShortDate(date: Date | string | number): string {
  return format(new Date(date), 'MMM d, yyyy');
}

export type PresetRange =
  'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom';

export function calculateDateRange(
  preset: PresetRange,
  customStart?: Date | string | null,
  customEnd?: Date | string | null
): { startDate: Date; endDate: Date } {
  const now = new Date();

  switch (preset) {
    case 'today':
      return { startDate: startOfDay(now), endDate: endOfDay(now) };
    case 'yesterday': {
      const y = subDays(now, 1);
      return { startDate: startOfDay(y), endDate: endOfDay(y) };
    }
    case 'this_week':
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }),
        endDate: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case 'this_month':
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    case 'last_month': {
      const prev = subMonths(now, 1);
      return { startDate: startOfMonth(prev), endDate: endOfMonth(prev) };
    }
    case 'custom':
      return {
        startDate: customStart ? startOfDay(new Date(customStart)) : startOfDay(subDays(now, 30)),
        endDate: customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now),
      };
    default:
      return { startDate: startOfDay(now), endDate: endOfDay(now) };
  }
}
