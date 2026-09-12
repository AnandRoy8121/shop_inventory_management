import { describe, it, expect } from 'vitest';
import {
  addDecimals,
  calculateLineTotal,
  calculateTax,
  calculateProfit,
  calculateMarginPercent,
  formatCurrency,
  toNumber,
} from '../src/lib/decimal';

describe('Decimal Precision & Financial Calculations', () => {
  it('eliminates standard IEEE-754 floating point imprecision', () => {
    // In plain JS: 0.1 + 0.2 = 0.30000000000000004
    const result = addDecimals(0.1, 0.2);
    expect(toNumber(result)).toBe(0.3);
  });

  it('accurately calculates line totals and rounds half up', () => {
    // 3 items @ $12.33 = $36.99
    const total = calculateLineTotal(3, 12.33);
    expect(toNumber(total)).toBe(36.99);

    // Fractional cent rounding check
    const total2 = calculateLineTotal(3, 1.335);
    expect(toNumber(total2)).toBe(4.01);
  });

  it('accurately calculates tax on taxable amounts', () => {
    // $100 taxable with 8.5% tax = $8.50
    const tax = calculateTax(100, 8.5);
    expect(toNumber(tax)).toBe(8.5);

    // $121.99 taxable with 8.5% tax = 10.36915 -> $10.37
    const tax2 = calculateTax(121.99, 8.5);
    expect(toNumber(tax2)).toBe(10.37);
  });

  it('accurately calculates gross profit and margins', () => {
    const revenue = 1000;
    const cogs = 650;
    const profit = calculateProfit(revenue, cogs);
    expect(toNumber(profit)).toBe(350);

    const margin = calculateMarginPercent(profit, revenue);
    expect(margin).toBe(35); // 35% margin
  });

  it('formats currency cleanly with symbol and 2 decimal places', () => {
    expect(formatCurrency(1250.5, '$')).toBe('$1,250.50');
    expect(formatCurrency(0, '$')).toBe('$0.00');
    expect(formatCurrency(null, '$')).toBe('$0.00');
  });
});
