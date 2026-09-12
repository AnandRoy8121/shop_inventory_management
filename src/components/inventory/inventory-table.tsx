'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FilterBar } from '@/components/shared/filter-bar';
import { CurrencyDisplay } from '@/components/shared/currency-display';
import { StockAdjustmentModal, ProductToAdjust } from './stock-adjustment-modal';
import {
  Package,
  SlidersHorizontal,
  History,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InventoryStockItem } from '@/repositories/inventory.repository';

interface CategoryOption {
  id: string;
  name: string;
}

interface InventoryTableProps {
  products: InventoryStockItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categories: CategoryOption[];
  currencySymbol?: string;
  canManage: boolean;
  searchParamsState: {
    search?: string;
    categoryId?: string;
    stockStatus?: string;
  };
}

export function InventoryTable({
  products,
  totalCount,
  page,
  pageSize,
  totalPages,
  categories,
  currencySymbol = '$',
  canManage,
  searchParamsState,
}: InventoryTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedProduct, setSelectedProduct] = useState<ProductToAdjust | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

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

  const handleOpenAdjust = (product: InventoryStockItem) => {
    setSelectedProduct({
      id: product.id,
      name: product.name,
      sku: product.sku,
      stock: product.stock,
      unit: product.unit,
    });
    setIsAdjustModalOpen(true);
  };

  const activeFilters =
    Boolean(searchParamsState.search) ||
    (Boolean(searchParamsState.categoryId) && searchParamsState.categoryId !== 'all') ||
    (Boolean(searchParamsState.stockStatus) && searchParamsState.stockStatus !== 'all');

  return (
    <div className="space-y-4">
      {/* Search & Category Filter Toolbar */}
      <FilterBar
        searchValue={searchParamsState.search || ''}
        onSearchChange={(val) => updateQuery({ search: val || null })}
        searchPlaceholder="Filter inventory by title, SKU, or barcode..."
        hasActiveFilters={activeFilters}
        onReset={() => {
          router.push(pathname);
        }}
        filters={
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Select */}
            <select
              value={searchParamsState.categoryId || 'all'}
              onChange={(e) => updateQuery({ categoryId: e.target.value })}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Quick Status Tabs */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => updateQuery({ stockStatus: 'all' })}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  !searchParamsState.stockStatus || searchParamsState.stockStatus === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => updateQuery({ stockStatus: 'in_stock' })}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  searchParamsState.stockStatus === 'in_stock'
                    ? 'bg-white text-emerald-800 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                In Stock
              </button>
              <button
                type="button"
                onClick={() => updateQuery({ stockStatus: 'low_stock' })}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  searchParamsState.stockStatus === 'low_stock'
                    ? 'bg-white text-amber-800 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Low Stock
              </button>
              <button
                type="button"
                onClick={() => updateQuery({ stockStatus: 'out_of_stock' })}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  searchParamsState.stockStatus === 'out_of_stock'
                    ? 'bg-white text-rose-800 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Out of Stock
              </button>
            </div>
          </div>
        }
      />

      {/* Main Stock Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost Price</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 text-right">Inventory Valuation</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Package className="h-5 w-5" />
                      </div>
                      <p className="font-medium text-slate-700">No stock records found</p>
                      <p className="text-[11px] text-slate-500">
                        Try modifying search keywords or clearing filter parameters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isOutOfStock = p.stock <= 0;
                  const isLowStock = p.stock <= p.minStockAlert && !isOutOfStock;
                  const cost = Number(p.costPrice);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition">
                      {/* Product identity */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold shadow-2xs">
                            <Package className="h-4 w-4" />
                          </div>
                          <div>
                            <Link
                              href={`/products/${p.id}`}
                              className="font-semibold text-slate-900 hover:text-indigo-600 transition leading-tight line-clamp-1"
                            >
                              {p.name}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-400">
                              <span>SKU: {p.sku}</span>
                              {p.barcode && <span>• {p.barcode}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                          {p.category?.name || 'Unassigned'}
                        </span>
                      </td>

                      {/* Cost Price */}
                      <td className="py-3 px-4 text-right font-mono">
                        <CurrencyDisplay amount={cost} currencySymbol={currencySymbol} />
                      </td>

                      {/* Stock Level Badge */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <div
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-800'
                                : isLowStock
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isOutOfStock ? (
                              <AlertCircle className="h-3 w-3" />
                            ) : isLowStock ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            <span>
                              {p.stock} {p.unit}
                            </span>
                          </div>
                          {isLowStock && (
                            <span className="text-[10px] text-amber-600 mt-0.5 font-medium">
                              Alert &le; {p.minStockAlert}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stock Value */}
                      <td className="py-3 px-4 text-right">
                        <CurrencyDisplay
                          amount={p.stockValue}
                          currencySymbol={currencySymbol}
                          className="font-bold text-slate-900 font-mono"
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAdjust(p)}
                              className="h-8 gap-1 text-xs font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5" />
                              <span>Adjust</span>
                            </Button>
                          )}

                          <Link
                            href={`/inventory/movements?productId=${p.id}`}
                            className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                            title="View Product Movement History"
                          >
                            <History className="h-4 w-4" />
                          </Link>
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
            <span>of {totalCount} total inventory records</span>
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

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        open={isAdjustModalOpen}
        onOpenChange={setIsAdjustModalOpen}
        product={selectedProduct}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
