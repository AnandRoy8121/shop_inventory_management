'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { FilterBar } from '@/components/shared/filter-bar';
import { StatusBadge } from '@/components/shared/status-badge';
import { CurrencyDisplay } from '@/components/shared/currency-display';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ProductFormModal, CategoryOption } from './product-form-modal';
import { useToast } from '@/components/shared/toast';
import { toggleProductStatusAction } from '@/app/actions/product.actions';
import {
  Package,
  Plus,
  Pencil,
  Power,
  Eye,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductWithCategory } from '@/repositories/product.repository';

interface ProductTableProps {
  products: ProductWithCategory[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  categories: CategoryOption[];
  canManage: boolean;
  currencySymbol?: string;
  searchParamsState: {
    search?: string;
    categoryId?: string;
    status?: string;
    stockStatus?: string;
  };
}

export function ProductTable({
  products,
  totalCount,
  page,
  pageSize,
  totalPages,
  categories,
  canManage,
  currencySymbol = '$',
  searchParamsState,
}: ProductTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<ProductWithCategory | null>(null);

  // Confirm dialog state for deactivation / reactivation
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    product: ProductWithCategory | null;
  }>({
    isOpen: false,
    product: null,
  });

  const [isPending, startTransition] = useTransition();

  // Helper to push updated query parameters
  const updateQuery = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'all') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    // Reset to page 1 if changing filters
    if (!updates.page) {
      params.delete('page');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleOpenCreate = () => {
    setProductToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (product: ProductWithCategory) => {
    setProductToEdit(product);
    setIsFormModalOpen(true);
  };

  const handleToggleActiveClick = (product: ProductWithCategory) => {
    setConfirmDialog({
      isOpen: true,
      product,
    });
  };

  const handleConfirmToggleActive = () => {
    const { product } = confirmDialog;
    if (!product) return;

    startTransition(async () => {
      const nextStatus = !product.isActive;
      const res = await toggleProductStatusAction(product.id, nextStatus);

      if (!res.success) {
        toast.error(res.error, 'Operation Failed');
      } else {
        toast.success(
          `Product "${product.name}" is now ${nextStatus ? 'active' : 'deactivated'}.`,
          nextStatus ? 'Product Activated' : 'Product Deactivated'
        );
        setConfirmDialog({ isOpen: false, product: null });
        router.refresh();
      }
    });
  };

  const activeFilters =
    Boolean(searchParamsState.search) ||
    (Boolean(searchParamsState.categoryId) && searchParamsState.categoryId !== 'all') ||
    (Boolean(searchParamsState.status) && searchParamsState.status !== 'all') ||
    (Boolean(searchParamsState.stockStatus) && searchParamsState.stockStatus !== 'all');

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Product Inventory Catalog"
        description="Comprehensive directory of retail merchandise, pricing tiers, and stock alert levels"
        badge={
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
            {totalCount} Products
          </span>
        }
        actions={
          canManage && (
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 shadow-xs h-9 text-xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>Register Product</span>
            </Button>
          )
        }
      />

      {/* Filter and Search Bar */}
      <FilterBar
        searchValue={searchParamsState.search || ''}
        onSearchChange={(val) => updateQuery({ search: val || null })}
        searchPlaceholder="Search by title, SKU, or barcode..."
        hasActiveFilters={activeFilters}
        onReset={() => {
          router.push(pathname);
        }}
        filters={
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
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

            {/* Status Filter */}
            <select
              value={searchParamsState.status || 'all'}
              onChange={(e) => updateQuery({ status: e.target.value })}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Deactivated Only</option>
            </select>

            {/* Stock Level Filter */}
            <select
              value={searchParamsState.stockStatus || 'all'}
              onChange={(e) => updateQuery({ stockStatus: e.target.value })}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            >
              <option value="all">All Stock Levels</option>
              <option value="in-stock">In Stock (&gt; Threshold)</option>
              <option value="low-stock">Low Stock (≤ Alert)</option>
              <option value="out-of-stock">Out of Stock (0)</option>
            </select>
          </div>
        }
      />

      {/* Main Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Product Identity</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost Price</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Package className="h-5 w-5" />
                      </div>
                      <p className="font-medium text-slate-700">No products match your criteria</p>
                      <p className="text-[11px] text-slate-500">
                        Try clearing filter parameters or register a new product.
                      </p>
                      {canManage && (
                        <Button
                          size="sm"
                          onClick={handleOpenCreate}
                          className="mt-2 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Register First Product</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isOutOfStock = p.stock <= 0;
                  const isLowStock = p.stock <= p.minStockAlert && !isOutOfStock;
                  const cost = Number(p.costPrice);
                  const selling = Number(p.sellingPrice);
                  const marginPct =
                    selling > 0 ? (((selling - cost) / selling) * 100).toFixed(0) : '0';

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/50 transition ${
                        !p.isActive ? 'bg-slate-50/70 opacity-60' : ''
                      }`}
                    >
                      {/* Identity */}
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
                          {p.category?.name || 'Uncategorized'}
                        </span>
                      </td>

                      {/* Cost Price */}
                      <td className="py-3 px-4 text-right">
                        <CurrencyDisplay amount={cost} currencySymbol={currencySymbol} />
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <CurrencyDisplay
                            amount={selling}
                            currencySymbol={currencySymbol}
                            className="font-bold text-slate-900"
                          />
                          <span className="text-[10px] font-medium text-emerald-600">
                            {marginPct}% margin
                          </span>
                        </div>
                      </td>

                      {/* Stock Level */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <div
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
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

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={p.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View Detail Link */}
                          <Link
                            href={`/products/${p.id}`}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
                            title="View Product Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>

                          {canManage && (
                            <>
                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(p)}
                                title="Edit Product Catalog Details"
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>

                              {/* Toggle Active Status */}
                              <button
                                type="button"
                                onClick={() => handleToggleActiveClick(p)}
                                title={p.isActive ? 'Deactivate Product' : 'Reactivate Product'}
                                className={`rounded-lg p-1.5 transition ${
                                  p.isActive
                                    ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-700'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                              >
                                <Power className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
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
            <span>of {totalCount} total merchandise entries</span>
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

      {/* Product Form Modal */}
      <ProductFormModal
        open={isFormModalOpen}
        onOpenChange={setIsFormModalOpen}
        categories={categories}
        productToEdit={productToEdit}
        onSuccess={() => router.refresh()}
      />

      {/* Confirm Deactivation / Reactivation Dialog */}
      {confirmDialog.product && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ isOpen: false, product: null })}
          onConfirm={handleConfirmToggleActive}
          isPending={isPending}
          variant={confirmDialog.product.isActive ? 'destructive' : 'default'}
          title={
            confirmDialog.product.isActive
              ? `Deactivate "${confirmDialog.product.name}"?`
              : `Reactivate "${confirmDialog.product.name}"?`
          }
          description={
            confirmDialog.product.isActive
              ? 'Deactivating this product will immediately block it from being selected during POS checkout and inventory intake. Historical sales and movements will be preserved.'
              : 'Reactivating this product will restore its availability for sales and catalog management.'
          }
          confirmText={confirmDialog.product.isActive ? 'Deactivate' : 'Reactivate'}
        />
      )}
    </div>
  );
}
