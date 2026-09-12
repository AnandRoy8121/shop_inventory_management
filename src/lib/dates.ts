import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
} from 'date-fns';

export type DateFilterPreset =
  'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset: DateFilterPreset;
}

export function getDateRangeFromPreset(
  preset: DateFilterPreset,
  customStart?: string | Date | null,
  customEnd?: string | Date | null
): DateRange {
  const now = new Date();

  switch (preset) {
    case 'today':
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
        preset,
      };

    case 'yesterday': {
      const yesterday = subDays(now, 1);
      return {
        startDate: startOfDay(yesterday),
        endDate: endOfDay(yesterday),
        preset,
      };
    }

    case 'this_week':
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }), // Monday start
        endDate: endOfWeek(now, { weekStartsOn: 1 }),
        preset,
      };

    case 'this_month':
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
        preset,
      };

    case 'last_month': {
      const prevMonth = subMonths(now, 1);
      return {
        startDate: startOfMonth(prevMonth),
        endDate: endOfMonth(prevMonth),
        preset,
      };
    }

    case 'custom': {
      const start = customStart ? startOfDay(new Date(customStart)) : startOfDay(subDays(now, 30));
      const end = customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now);
      return {
        startDate: start,
        endDate: end,
        preset: 'custom',
      };
    }

    default:
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now),
        preset: 'today',
      };
  }
}
