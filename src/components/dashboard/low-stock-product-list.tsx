'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Product, Category } from '@prisma/client';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/decimal';

interface LowStockProductListProps {
  outOfStock: Array<Product & { category?: Category | null }>;
  lowStock: Array<Product & { category?: Category | null }>;
  currencySymbol?: string;
}

export function LowStockProductList({
  outOfStock,
  lowStock,
  currencySymbol = '$',
}: LowStockProductListProps) {
  const [filter, setFilter] = useState<'ALL' | 'OUT_OF_STOCK' | 'LOW_STOCK'>('ALL');

  const allAlertProducts = [
    ...outOfStock.map((p) => ({ ...p, alertStatus: 'OUT_OF_STOCK' as const })),
    ...lowStock.map((p) => ({ ...p, alertStatus: 'LOW_STOCK' as const })),
  ];

  const displayedProducts = allAlertProducts.filter((p) => {
    if (filter === 'OUT_OF_STOCK') return p.alertStatus === 'OUT_OF_STOCK';
    if (filter === 'LOW_STOCK') return p.alertStatus === 'LOW_STOCK';
    return true;
  });

  const totalCount = allAlertProducts.length;

  return (
    <Card className="border border-slate-200 shadow-xs overflow-hidden">
      <CardHeader className="p-4 sm:p-5 border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">
              Low Stock & Out of Stock Watchlist
            </CardTitle>
            <p className="text-xs text-slate-500">
              {totalCount === 0
                ? 'All inventory items are above minimum thresholds'
                : `${totalCount} item${totalCount === 1 ? '' : 's'} require replenishment`}
            </p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs self-start sm:self-auto">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              filter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setFilter('OUT_OF_STOCK')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              filter === 'OUT_OF_STOCK'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Out ({outOfStock.length})
          </button>
          <button
            onClick={() => setFilter('LOW_STOCK')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              filter === 'LOW_STOCK'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Low ({lowStock.length})
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {displayedProducts.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">Healthy Stock Levels</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No products currently match this filter. Inventory levels are operating above minimum thresholds.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
            {displayedProducts.map((p) => {
              const isOut = p.alertStatus === 'OUT_OF_STOCK';
              return (
                <div
                  key={p.id}
                  className="p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          isOut
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isOut ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
                          }`}
                        />
                        {isOut ? 'Out of Stock' : 'Low Stock'}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-900 line-clamp-1">{p.name}</h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                      <span className="font-mono text-slate-600">SKU: {p.sku}</span>
                      <span>&bull;</span>
                      <span>Category: {p.category?.name || 'Uncategorized'}</span>
                      <span>&bull;</span>
                      <span>Price: {formatCurrency(Number(p.sellingPrice), currencySymbol)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    {/* Stock balance indicator */}
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <span
                          className={`text-sm font-bold ${
                            isOut ? 'text-rose-600' : 'text-amber-600'
                          }`}
                        >
                          {p.stock} {p.unit}
                        </span>
                        <span className="text-[11px] text-slate-400">/ min {p.minStockAlert}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        {isOut ? '0 units available' : `${p.stock} remaining`}
                      </p>
                    </div>

                    {/* Quick Restock Link */}
                    <Link href={`/inventory?search=${encodeURIComponent(p.sku)}`}>
                      <Button
                        size="sm"
                        variant={isOut ? 'default' : 'outline'}
                        className={`text-xs h-8 gap-1 ${
                          isOut
                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>Restock</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            {displayedProducts.length} of {totalCount} alert items shown
          </span>
          <Link
            href="/inventory?filter=low_stock"
            className="font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            View Full Inventory Ledger
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
