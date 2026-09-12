import React from 'react';
import { cn } from '@/lib/utils';

export type StatusCategory =
  'sale' | 'payment' | 'stock' | 'role' | 'movement' | 'active' | 'custom';

export interface StatusBadgeProps {
  status: string;
  category?: StatusCategory;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = status.toUpperCase().trim();

  // Color mappings
  let variantClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = status;

  switch (normalized) {
    // Active / Inactive
    case 'ACTIVE':
    case 'TRUE':
      variantClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      label = 'Active';
      break;
    case 'INACTIVE':
    case 'FALSE':
      variantClasses = 'bg-slate-100 text-slate-600 border-slate-200';
      label = 'Inactive';
      break;

    // Sales Status
    case 'COMPLETED':
      variantClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      label = 'Completed';
      break;
    case 'CANCELLED':
      variantClasses = 'bg-rose-50 text-rose-700 border-rose-200';
      label = 'Cancelled';
      break;
    case 'PARTIALLY_REFUNDED':
      variantClasses = 'bg-amber-50 text-amber-700 border-amber-200';
      label = 'Partial Refund';
      break;

    // Payment Status
    case 'PAID':
      variantClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      label = 'Paid';
      break;
    case 'PENDING':
      variantClasses = 'bg-amber-50 text-amber-700 border-amber-200';
      label = 'Pending';
      break;
    case 'REFUNDED':
      variantClasses = 'bg-rose-50 text-rose-700 border-rose-200';
      label = 'Refunded';
      break;
    case 'FAILED':
      variantClasses = 'bg-rose-100 text-rose-800 border-rose-300';
      label = 'Failed';
      break;

    // Stock Warnings
    case 'IN_STOCK':
      variantClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      label = 'In Stock';
      break;
    case 'LOW_STOCK':
      variantClasses = 'bg-amber-50 text-amber-800 border-amber-300';
      label = 'Low Stock';
      break;
    case 'OUT_OF_STOCK':
      variantClasses = 'bg-rose-50 text-rose-700 border-rose-200';
      label = 'Out of Stock';
      break;

    // Roles
    case 'ADMIN':
      variantClasses = 'bg-purple-50 text-purple-700 border-purple-200';
      label = 'Admin';
      break;
    case 'STAFF':
      variantClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      label = 'Staff';
      break;
    case 'MANAGER':
      variantClasses = 'bg-blue-50 text-blue-700 border-blue-200';
      label = 'Manager';
      break;
    case 'CASHIER':
      variantClasses = 'bg-cyan-50 text-cyan-700 border-cyan-200';
      label = 'Cashier';
      break;

    // Movements
    case 'PURCHASE':
      variantClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      label = 'Purchase (In)';
      break;
    case 'SALE':
      variantClasses = 'bg-blue-50 text-blue-700 border-blue-200';
      label = 'Sale (Out)';
      break;
    case 'SALE_REVERSAL':
      variantClasses = 'bg-amber-50 text-amber-700 border-amber-200';
      label = 'Reversal (Restock)';
      break;
    case 'MANUAL_ADJUSTMENT':
      variantClasses = 'bg-orange-50 text-orange-700 border-orange-200';
      label = 'Adjustment';
      break;
    case 'RETURN':
      variantClasses = 'bg-teal-50 text-teal-700 border-teal-200';
      label = 'Customer Return';
      break;
    case 'RETURN_REVERSAL':
      variantClasses = 'bg-rose-50 text-rose-700 border-rose-200';
      label = 'Return Cancelled';
      break;

    default:
      label = status;
      break;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide shadow-2xs',
        variantClasses,
        className
      )}
    >
      {label}
    </span>
  );
}
