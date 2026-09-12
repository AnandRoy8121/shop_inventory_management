'use client';

import React, { useState, useTransition } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adjustStockAction } from '@/app/actions/inventory.actions';
import { useToast } from '@/components/shared/toast';
import { AlertCircle, PlusCircle, MinusCircle, ArrowRight } from 'lucide-react';
import { ReasonCategory } from '@/schemas/inventory.schema';

export interface ProductToAdjust {
  id: string;
  name: string;
  sku: string;
  stock: number;
  unit: string;
}

interface StockAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductToAdjust | null;
  onSuccess?: () => void;
}

interface FormContentProps {
  product: ProductToAdjust;
  onClose: () => void;
  onSuccess?: () => void;
}

function StockAdjustmentFormContent({ product, onClose, onSuccess }: FormContentProps) {
  const toast = useToast();
  const [operation, setOperation] = useState<'INCREASE' | 'DECREASE'>('INCREASE');
  const [quantity, setQuantity] = useState<number>(1);
  const [reasonCategory, setReasonCategory] = useState<ReasonCategory>('stock_correction');
  const [reason, setReason] = useState<string>('');
  const [referenceId, setReferenceId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isIncrease = operation === 'INCREASE';
  const qtyNumber = Number(quantity) || 0;
  const projectedStock = isIncrease ? product.stock + qtyNumber : product.stock - qtyNumber;
  const isNegativeProjection = projectedStock < 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (qtyNumber <= 0) {
      setError('Adjustment quantity must be at least 1 unit.');
      return;
    }

    if (isNegativeProjection) {
      setError(`Cannot reduce stock below 0. Current available stock is ${product.stock} ${product.unit}.`);
      return;
    }

    if (!reason.trim()) {
      setError('Please provide an explanatory reason for this manual stock adjustment.');
      return;
    }

    startTransition(async () => {
      const res = await adjustStockAction({
        productId: product.id,
        operation,
        quantity: qtyNumber,
        reasonCategory,
        reason: reason.trim(),
        referenceId: referenceId.trim() || undefined,
      });

      if (!res.success) {
        setError(res.error);
        toast.error(res.error, 'Adjustment Prohibited');
      } else {
        toast.success(
          `Stock for "${product.name}" updated to ${res.data.stockAfter} ${product.unit}.`,
          isIncrease ? 'Stock Increased' : 'Stock Decreased'
        );
        onClose();
        if (onSuccess) onSuccess();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {/* Product Summary Header */}
      <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 flex items-center justify-between">
        <div>
          <p className="font-bold text-slate-900 leading-tight">{product.name}</p>
          <p className="font-mono text-[11px] text-slate-400 mt-0.5">SKU: {product.sku}</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 block uppercase font-semibold tracking-wider">
            Current Stock
          </span>
          <span className="text-base font-black font-mono text-slate-900">
            {product.stock} {product.unit}
          </span>
        </div>
      </div>

      {/* Operation Selection (Increase vs Decrease) */}
      <div>
        <label className="font-semibold text-slate-700 block mb-1.5">Adjustment Direction</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setOperation('INCREASE')}
            className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 px-3 text-xs font-semibold transition ${
              isIncrease
                ? 'border-emerald-600 bg-emerald-50/80 text-emerald-800 shadow-2xs'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <PlusCircle className="h-4 w-4 text-emerald-600" />
            <span>Stock Increase (+ Add)</span>
          </button>

          <button
            type="button"
            onClick={() => setOperation('DECREASE')}
            className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 px-3 text-xs font-semibold transition ${
              !isIncrease
                ? 'border-rose-600 bg-rose-50/80 text-rose-800 shadow-2xs'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <MinusCircle className="h-4 w-4 text-rose-600" />
            <span>Stock Decrease (- Deduct)</span>
          </button>
        </div>
      </div>

      {/* Quantity & Trajectory Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="font-semibold text-slate-700 block mb-1">
            Units to {isIncrease ? 'Add' : 'Deduct'} <span className="text-rose-500">*</span>
          </label>
          <Input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
            required
            disabled={isPending}
            autoFocus
          />
        </div>

        {/* Live Stock Projection */}
        <div>
          <label className="font-semibold text-slate-700 block mb-1">Projected Balance</label>
          <div
            className={`h-9 flex items-center justify-between rounded-lg px-3 border text-xs font-mono font-bold ${
              isNegativeProjection
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : 'bg-slate-100 border-slate-200 text-slate-800'
            }`}
          >
            <span className="text-slate-500">{product.stock}</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            <span className={isNegativeProjection ? 'text-rose-700 font-black' : isIncrease ? 'text-emerald-700' : 'text-slate-900'}>
              {projectedStock} {product.unit}
            </span>
          </div>
        </div>
      </div>

      {isNegativeProjection && (
        <p className="text-[11px] font-semibold text-rose-600">
          Cannot reduce stock below 0. Deduction exceeds available balance by {Math.abs(projectedStock)} units.
        </p>
      )}

      {/* Reason Category Presets */}
      <div>
        <label className="font-semibold text-slate-700 block mb-1">Audit Reason Category</label>
        <select
          value={reasonCategory}
          onChange={(e) => setReasonCategory(e.target.value as ReasonCategory)}
          disabled={isPending}
          className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
        >
          {isIncrease ? (
            <>
              <option value="opening_stock">Opening Stock / Initial Physical Count</option>
              <option value="supplier_intake">Supplier Delivery / Restock Intake</option>
              <option value="customer_return">Customer Return (Restocked)</option>
              <option value="stock_correction">Stock Correction (Found Inventory)</option>
              <option value="other">Other Manual Intake</option>
            </>
          ) : (
            <>
              <option value="damaged">Damaged Merchandise (Write-Off)</option>
              <option value="expired">Expired Stock Disposal</option>
              <option value="missing">Missing Stock / Unexplained Shrinkage</option>
              <option value="stock_correction">Stock Correction (Audit Shortage)</option>
              <option value="other">Other Manual Deduction</option>
            </>
          )}
        </select>
      </div>

      {/* Detailed Reason Explanation */}
      <div>
        <label className="font-semibold text-slate-700 block mb-1">
          Detailed Explanation / Reason Notes <span className="text-rose-500">*</span>
        </label>
        <Input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            isIncrease
              ? 'e.g. Received shipment from Apex Distributors'
              : 'e.g. Water damage during store shelf reorganization'
          }
          required
          disabled={isPending}
        />
      </div>

      {/* Optional Reference Number */}
      <div>
        <label className="font-semibold text-slate-700 block mb-1">
          Reference / PO / Audit ID (Optional)
        </label>
        <Input
          type="text"
          value={referenceId}
          onChange={(e) => setReferenceId(e.target.value)}
          placeholder="e.g. PO-2026-0892 or AUDIT-Q3"
          disabled={isPending}
        />
      </div>

      {/* Error Message Display */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Modal Actions Footer */}
      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isPending}
          className="text-xs"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          isLoading={isPending}
          disabled={isNegativeProjection || qtyNumber <= 0 || isPending}
          className={`text-xs font-semibold ${
            isIncrease
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          {isIncrease ? 'Record Stock Increase' : 'Record Stock Deduction'}
        </Button>
      </div>
    </form>
  );
}

export function StockAdjustmentModal({
  open,
  onOpenChange,
  product,
  onSuccess,
}: StockAdjustmentModalProps) {
  if (!product) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => onOpenChange(v)}
      title="Adjust Inventory Stock"
      description={`Record an auditable stock adjustment for "${product.name}".`}
      maxWidth="max-w-md"
    >
      {open && (
        <StockAdjustmentFormContent
          key={product.id}
          product={product}
          onClose={() => onOpenChange(false)}
          onSuccess={onSuccess}
        />
      )}
    </Dialog>
  );
}
