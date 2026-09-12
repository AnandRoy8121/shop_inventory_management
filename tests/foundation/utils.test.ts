import { describe, it, expect } from 'vitest';
import { cn } from '../../src/utils/tailwind.utils';
import {
  formatCurrency,
  addCurrency,
  subtractCurrency,
  multiplyCurrency,
  divideCurrency,
} from '../../src/utils/currency.utils';
import { formatDate, calculateDateRange } from '../../src/utils/date.utils';

describe('Common Utilities Foundation', () => {
  describe('Tailwind Utils (cn)', () => {
    it('merges class names and resolves tailwind conflicts', () => {
      const merged = cn('px-2 py-1', 'bg-red-500', 'px-4');
      expect(merged).toBe('py-1 bg-red-500 px-4');
    });

    it('handles falsy and conditional values correctly', () => {
      const isActive = false;
      const merged = cn('base-class', isActive && 'active-class', null, undefined);
      expect(merged).toBe('base-class');
    });
  });

  describe('Currency & Safe Decimal Utils', () => {
    it('eliminates floating point math errors', () => {
      const sum = addCurrency(0.1, 0.2);
      expect(sum.toNumber()).toBe(0.3);
    });

    it('formats currencies with proper symbols and commas', () => {
      expect(formatCurrency(1234567.89, '$')).toBe('$1,234,567.89');
      expect(formatCurrency(0, '$')).toBe('$0.00');
      expect(formatCurrency(null, '$')).toBe('$0.00');
    });

    it('performs subtraction, multiplication, and division safely', () => {
      const sub = subtractCurrency(10, 4.5);
      expect(sub.toNumber()).toBe(5.5);

      const mul = multiplyCurrency(5, 1.25);
      expect(mul.toNumber()).toBe(6.25);

      const div = divideCurrency(10, 4);
      expect(div.toNumber()).toBe(2.5);

      const divZero = divideCurrency(10, 0);
      expect(divZero.toNumber()).toBe(0);
    });
  });

  describe('Date Utils', () => {
    it('formats dates consistently', () => {
      const d = new Date('2026-09-12T12:00:00Z');
      expect(formatDate(d, 'yyyy-MM-dd')).toBe('2026-09-12');
    });

    it('computes boundary ranges for date presets', () => {
      const todayRange = calculateDateRange('today');
      expect(todayRange.startDate.getTime()).toBeLessThanOrEqual(todayRange.endDate.getTime());

      const weekRange = calculateDateRange('this_week');
      expect(weekRange.startDate.getTime()).toBeLessThanOrEqual(weekRange.endDate.getTime());
    });
  });
});
