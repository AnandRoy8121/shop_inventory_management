import { Decimal } from 'decimal.js';

// Standard financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export type NumericValue = number | string | Decimal;

export function toDecimal(val: NumericValue | null | undefined): Decimal {
  if (val === null || val === undefined || val === '') {
    return new Decimal(0);
  }
  return new Decimal(val);
}

export function formatCurrency(
  val: NumericValue | null | undefined,
  symbol = '₹',
  decimals = 2
): string {
  const num = toDecimal(val).toDecimalPlaces(decimals).toNumber();
  return `${symbol}${num.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function addCurrency(...values: NumericValue[]): Decimal {
  return values.reduce<Decimal>((acc, cur) => acc.plus(toDecimal(cur)), new Decimal(0));
}

export function subtractCurrency(a: NumericValue, b: NumericValue): Decimal {
  return toDecimal(a).minus(toDecimal(b));
}

export function multiplyCurrency(a: NumericValue, b: NumericValue): Decimal {
  return toDecimal(a).times(toDecimal(b));
}

export function divideCurrency(a: NumericValue, b: NumericValue): Decimal {
  const divisor = toDecimal(b);
  if (divisor.isZero()) return new Decimal(0);
  return toDecimal(a).dividedBy(divisor);
}
