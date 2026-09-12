import React from 'react';
import { formatCurrency } from '@/utils/currency.utils';
import { cn } from '@/lib/utils';

export interface CurrencyDisplayProps {
  amount: number | string | object; // Supports Prisma.Decimal
  currencySymbol?: string;
  tone?: 'positive' | 'negative' | 'neutral';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function CurrencyDisplay({
  amount,
  currencySymbol = '$',
  tone = 'neutral',
  size = 'md',
  className,
}: CurrencyDisplayProps) {
  const numericValue =
    typeof amount === 'object' && amount !== null && 'toNumber' in amount
      ? (amount as { toNumber: () => number }).toNumber()
      : Number(amount);

  const formatted = formatCurrency(numericValue, currencySymbol);

  return (
    <span
      className={cn(
        'font-mono tracking-tight font-semibold',
        tone === 'positive' && 'text-emerald-700',
        tone === 'negative' && 'text-rose-700',
        tone === 'neutral' && 'text-slate-900',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        size === 'lg' && 'text-lg font-bold',
        size === 'xl' && 'text-2xl font-black',
        className
      )}
    >
      {formatted}
    </span>
  );
}
