import { Decimal } from 'decimal.js';

/**
 * Safe decimal arithmetic helper wrapping decimal.js and Prisma.Decimal
 * Guarantees zero floating-point imprecision for currency, tax, discount and profit calculations.
 */

// Configure precision and rounding mode (ROUND_HALF_UP is standard banking)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type Numeric = number | string | Decimal;

export function toDecimal(val: Numeric | null | undefined): Decimal {
  if (val === null || val === undefined || val === '') {
    return new Decimal(0);
  }
  return new Decimal(val);
}

export function addDecimals(...values: Numeric[]): Decimal {
  return values.reduce<Decimal>((acc, cur) => acc.plus(toDecimal(cur)), new Decimal(0));
}

export function subDecimals(a: Numeric, b: Numeric): Decimal {
  return toDecimal(a).minus(toDecimal(b));
}

export function mulDecimals(a: Numeric, b: Numeric): Decimal {
  return toDecimal(a).times(toDecimal(b));
}

export function divDecimals(a: Numeric, b: Numeric): Decimal {
  const divisor = toDecimal(b);
  if (divisor.isZero()) {
    return new Decimal(0);
  }
  return toDecimal(a).dividedBy(divisor);
}

export function roundDecimal(val: Numeric, places = 2): Decimal {
  return toDecimal(val).toDecimalPlaces(places);
}

export function toNumber(val: Numeric | null | undefined, places = 2): number {
  return roundDecimal(toDecimal(val), places).toNumber();
}

export function formatCurrency(val: Numeric | null | undefined, currencySymbol = '₹'): string {
  const num = toNumber(val);
  return `${currencySymbol}${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function calculateLineTotal(quantity: number, unitPrice: Numeric): Decimal {
  return roundDecimal(mulDecimals(quantity, unitPrice));
}

export function calculateTax(taxableAmount: Numeric, taxRatePercent: Numeric): Decimal {
  const rate = divDecimals(taxRatePercent, 100);
  return roundDecimal(mulDecimals(taxableAmount, rate));
}

export function calculateProfit(revenue: Numeric, cogs: Numeric): Decimal {
  return roundDecimal(subDecimals(revenue, cogs));
}

export function calculateMarginPercent(profit: Numeric, revenue: Numeric): number {
  const rev = toDecimal(revenue);
  if (rev.isZero()) return 0;
  const marginRatio = divDecimals(profit, rev);
  return roundDecimal(mulDecimals(marginRatio, 100), 1).toNumber();
}
