'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { DateDisplay } from '@/components/shared/date-display';
import { FilterBar } from '@/components/shared/filter-bar';
import { MovementWithRelations } from '@/repositories/inventory.repository';
import {
  History,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  X,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MovementHistoryTableProps {
  movements: MovementWithRelations[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  searchParamsState: {
    search?: string;
    type?: string;
    productId?: string;
  };
  productNameFilter?: string;
}

export function MovementHistoryTable({
  movements,
  totalCount,
  page,
  pageSize,
  totalPages,
  searchParamsState,
  productNameFilter,
}: MovementHistoryTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateQuery = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    if (!updates.page) {
      params.delete('page');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const activeFilters =
    Boolean(searchParamsState.search) ||
    (Boolean(searchParamsState.type) && searchParamsState.type !== 'all') ||
    Boolean(searchParamsState.productId);

  return (
    <div className="space-y-4">
      {/* Product-specific filter banner */}
      {searchParamsState.productId && (
        <div className="flex items-center justify-between rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-2.5 text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-indigo-600" />
            <span>
              Showing movement ledger filtered for: <strong>{productNameFilter || searchParamsState.productId}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => updateQuery({ productId: null })}
            className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
          >
            <X className="h-3 w-3" />
            <span>Clear Product Filter</span>
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <FilterBar
        searchValue={searchParamsState.search || ''}
        onSearchChange={(val) => updateQuery({ search: val || null })}
        searchPlaceholder="Search ledger by product name, SKU, reason, or operator..."
        hasActiveFilters={activeFilters}
        onReset={() => {
          router.push(pathname);
        }}
        filters={
          <div className="flex items-center gap-2">
            <select
              value={searchParamsState.type || 'all'}
              onChange={(e) => updateQuery({ type: e.target.value })}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            >
              <option value="all">All Movement Types</option>
              <option value="PURCHASE">Purchase Intake</option>
              <option value="SALE">Sale Checkout</option>
              <option value="SALE_REVERSAL">Sale Reversal (Restock)</option>
              <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
              <option value="RETURN">Customer Return</option>
              <option value="RETURN_REVERSAL">Return Reversal</option>
            </select>
          </div>
        }
      />

      {/* Movements Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4 text-center">Type</th>
                <th className="py-3 px-4 text-center">Quantity Change</th>
                <th className="py-3 px-4 text-center">Stock Trajectory</th>
                <th className="py-3 px-4">Reason & Reference</th>
                <th className="py-3 px-4 text-right">Recorded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <History className="h-5 w-5" />
                      </div>
                      <p className="font-medium text-slate-700">No movement records found</p>
                      <p className="text-[11px] text-slate-500">
                        Try adjusting search keywords or clearing type filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isPositive = m.quantityChange > 0;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition">
                      {/* Timestamp */}
                      <td className="py-3 px-4 text-slate-700 font-mono text-[11px]">
                        <DateDisplay date={m.createdAt} formatVariant="dateTime" />
                      </td>

                      {/* Product */}
                      <td className="py-3 px-4">
                        <div>
                          <Link
                            href={`/products/${m.product.id}`}
                            className="font-semibold text-slate-900 hover:text-indigo-600 transition line-clamp-1"
                          >
                            {m.product.name}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-slate-400">
                            <span>SKU: {m.product.sku}</span>
                          </div>
                        </div>
                      </td>

                      {/* Movement Type */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                          {m.type}
                        </span>
                      </td>

                      {/* Delta */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono font-bold ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? `+${m.quantityChange}` : m.quantityChange} {m.product.unit}
                        </span>
                      </td>

                      {/* Trajectory */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold">
                          <span className="text-slate-500">{m.stockBefore}</span>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <span className="text-slate-900">{m.stockAfter}</span>
                        </div>
                      </td>

                      {/* Reason & Reference */}
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-slate-800 line-clamp-1">{m.reason}</p>
                          {m.referenceId && (
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                              Ref: {m.referenceId}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Operator */}
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        <div>
                          <p className="leading-tight">{m.user.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{m.user.role}</p>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 bg-slate-50/50 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => updateQuery({ pageSize: e.target.value })}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
            </select>
            <span>of {totalCount} total audit movements</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateQuery({ page: String(page - 1) })}
              className="h-8 w-8 p-0"
              title="Previous Page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-slate-700 px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateQuery({ page: String(page + 1) })}
              className="h-8 w-8 p-0"
              title="Next Page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
