'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { CurrencyDisplay } from '@/components/shared/currency-display';
import { DateDisplay } from '@/components/shared/date-display';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ProductFormModal, CategoryOption } from './product-form-modal';
import { useToast } from '@/components/shared/toast';
import { toggleProductStatusAction } from '@/app/actions/product.actions';
import { ProductDetail } from '@/repositories/product.repository';
import {
  ArrowLeft,
  Pencil,
  Power,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  History,
  DollarSign,
  Boxes,
  Calendar,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductDetailViewProps {
  product: ProductDetail;
  categories: CategoryOption[];
  canManage: boolean;
  currencySymbol?: string;
}

export function ProductDetailView({
  product,
  categories,
  canManage,
  currencySymbol = '$',
}: ProductDetailViewProps) {
  const router = useRouter();
  const toast = useToast();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock <= product.minStockAlert && !isOutOfStock;

  const cost = Number(product.costPrice);
  const selling = Number(product.sellingPrice);
  const unitProfit = selling - cost;
  const marginPct = selling > 0 ? ((unitProfit / selling) * 100).toFixed(1) : '0';
  const totalStockValue = product.stock * cost;

  const handleConfirmToggle = () => {
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
        setIsConfirmOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Products Directory</span>
        </Link>
      </div>

      {/* Main Header */}
      <PageHeader
        title={product.name}
        description={`SKU: ${product.sku} ${product.barcode ? `• Barcode: ${product.barcode}` : ''}`}
        badge={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
              {product.category?.name || 'Uncategorized'}
            </span>
            <StatusBadge status={product.isActive ? 'ACTIVE' : 'INACTIVE'} />
          </div>
        }
        actions={
          canManage && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmOpen(true)}
                className={`gap-1.5 text-xs font-semibold ${
                  product.isActive
                    ? 'text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <Power className="h-3.5 w-3.5" />
                <span>{product.isActive ? 'Deactivate' : 'Reactivate'}</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Product</span>
              </Button>
            </div>
          )
        }
      />

      {/* Stock Health Alert Banner */}
      {isOutOfStock && (
        <div className="flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-200 p-4 text-rose-800">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <div>
            <p className="text-xs font-bold">Out of Stock Alert</p>
            <p className="text-xs text-rose-700 mt-0.5">
              This item has zero units remaining in inventory. Counter sales will be blocked until a supplier purchase intake is recorded.
            </p>
          </div>
        </div>
      )}

      {isLowStock && (
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-xs font-bold">Low Stock Warning</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Current balance ({product.stock} {product.unit}) has dropped to or below the designated reorder threshold ({product.minStockAlert} {product.unit}).
            </p>
          </div>
        </div>
      )}

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Current Stock */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Current Stock</span>
            <Boxes className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-black font-mono ${
                isOutOfStock
                  ? 'text-rose-600'
                  : isLowStock
                    ? 'text-amber-600'
                    : 'text-slate-900'
              }`}
            >
              {product.stock}
            </span>
            <span className="text-xs font-medium text-slate-500">{product.unit}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Alert threshold: {product.minStockAlert} {product.unit}
          </p>
        </div>

        {/* Retail Selling Price */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Retail Price</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <CurrencyDisplay
              amount={selling}
              currencySymbol={currencySymbol}
              className="text-2xl font-black font-mono text-slate-900"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Wholesale cost: {currencySymbol}{cost.toFixed(2)}
          </p>
        </div>

        {/* Profit Margin */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Unit Profit</span>
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-700">
              +{currencySymbol}{unitProfit.toFixed(2)}
            </span>
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
              {marginPct}%
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Gross margin per item sold</p>
        </div>

        {/* Total Stock Valuation */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Stock Valuation</span>
            <Layers className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2">
            <CurrencyDisplay
              amount={totalStockValue}
              currencySymbol={currencySymbol}
              className="text-2xl font-black font-mono text-slate-900"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">At acquisition cost value</p>
        </div>
      </div>

      {/* Product Details Overview Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          Product Specifications & Metadata
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Assigned Category</span>
            <p className="font-semibold text-slate-800">
              {product.category?.name || 'Unassigned / General'}
            </p>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Unit of Measurement</span>
            <p className="font-semibold text-slate-800">{product.unit}</p>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Sales Recorded</span>
            <p className="font-semibold text-slate-800">
              {product._count.saleItems} invoice transactions
            </p>
          </div>

          <div className="md:col-span-3">
            <span className="text-slate-400 block mb-0.5">Description & Catalog Notes</span>
            <p className="text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100 leading-relaxed">
              {product.description || 'No description or specifications recorded for this merchandise.'}
            </p>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Registered In System</span>
            <div className="flex items-center gap-1.5 text-slate-700">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <DateDisplay date={product.createdAt} formatVariant="dateTime" />
            </div>
          </div>

          <div>
            <span className="text-slate-400 block mb-0.5">Last Catalog Update</span>
            <div className="flex items-center gap-1.5 text-slate-700">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <DateDisplay date={product.updatedAt} formatVariant="dateTime" />
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Movement Ledger */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3.5 flex items-center justify-between bg-slate-50/75">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recent Inventory Movement History
            </h3>
          </div>
          <span className="text-[11px] text-slate-500">Last 25 transactions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Date & Time</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4 text-center">Change</th>
                <th className="py-2.5 px-4 text-center">Stock Trajectory</th>
                <th className="py-2.5 px-4">Reason / Reference</th>
                <th className="py-2.5 px-4 text-right">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {product.movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No stock movements recorded yet for this item.
                  </td>
                </tr>
              ) : (
                product.movements.map((m) => {
                  const isPositive = m.quantityChange > 0;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-2.5 px-4">
                        <DateDisplay date={m.createdAt} formatVariant="dateTime" />
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                          {m.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`font-mono font-bold ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? `+${m.quantityChange}` : m.quantityChange}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono text-[11px] text-slate-500">
                        {m.stockBefore} &rarr;{' '}
                        <strong className="text-slate-800">{m.stockAfter}</strong>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">
                        {m.reason || m.referenceType || 'Stock movement'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-slate-800">
                        {m.user?.name || m.user?.email || 'System'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Modal */}
      <ProductFormModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        categories={categories}
        productToEdit={product}
        onSuccess={() => router.refresh()}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmToggle}
        isPending={isPending}
        variant={product.isActive ? 'destructive' : 'default'}
        title={
          product.isActive
            ? `Deactivate Product "${product.name}"?`
            : `Reactivate Product "${product.name}"?`
        }
        description={
          product.isActive
            ? 'Deactivating this product hides it from sales and inventory operations while preserving all historical audit records.'
            : 'Reactivating this product will immediately make it active for POS sales.'
        }
        confirmText={product.isActive ? 'Deactivate Product' : 'Reactivate Product'}
      />
    </div>
  );
}
