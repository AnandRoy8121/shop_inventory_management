import React from 'react';
import { Boxes, DollarSign, AlertTriangle, AlertCircle } from 'lucide-react';
import { CurrencyDisplay } from '@/components/shared/currency-display';
import { InventoryOverviewMetrics } from '@/repositories/inventory.repository';

interface InventoryOverviewCardsProps {
  metrics: InventoryOverviewMetrics;
  currencySymbol?: string;
}

export function InventoryOverviewCards({
  metrics,
  currencySymbol = '$',
}: InventoryOverviewCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Stock Units */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Total Stock Units</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Boxes className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-black font-mono text-slate-900">
            {metrics.totalUnits.toLocaleString()}
          </span>
          <span className="text-xs font-medium text-slate-400">units</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Across {metrics.totalItems} active catalog products
        </p>
      </div>

      {/* Total Inventory Valuation */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Inventory Valuation</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <CurrencyDisplay
            amount={metrics.totalInventoryValue}
            currencySymbol={currencySymbol}
            className="text-2xl font-black font-mono text-slate-900"
          />
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Calculated at wholesale acquisition cost</p>
      </div>

      {/* Low Stock Alerts */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Low Stock Warnings</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span
            className={`text-2xl font-black font-mono ${
              metrics.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'
            }`}
          >
            {metrics.lowStockCount}
          </span>
          <span className="text-xs font-medium text-slate-400">items</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Stock at or below reorder threshold</p>
      </div>

      {/* Out of Stock Items */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Out of Stock</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <AlertCircle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span
            className={`text-2xl font-black font-mono ${
              metrics.outOfStockCount > 0 ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {metrics.outOfStockCount}
          </span>
          <span className="text-xs font-medium text-slate-400">items</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Zero available units remaining</p>
      </div>
    </div>
  );
}
