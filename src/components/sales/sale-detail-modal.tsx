'use client';

import { useState, useTransition } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/decimal';
import { cancelSaleAction } from '@/server/actions/sale.actions';
import { SaleStatus, Role } from '@prisma/client';
import { format } from 'date-fns';
import { AlertTriangle, Printer, RotateCcw, AlertCircle } from 'lucide-react';

interface SaleItemDetail {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number | string | object;
  subtotal: number | string | object;
}

interface SaleDetail {
  id: string;
  invoiceNumber: string;
  createdAt: Date;
  status: SaleStatus;
  paymentMethod: string;
  subtotal: number | string | object;
  taxAmount: number | string | object;
  discountAmount: number | string | object;
  grandTotal: number | string | object;
  notes: string | null;
  cancellationReason: string | null;
  cancelledAt: Date | null;
  customer: { name: string; phone: string | null; email: string | null } | null;
  user: { name: string };
  items: SaleItemDetail[];
}

interface SaleDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleDetail | null;
  currencySymbol?: string;
  userRole: Role;
}

export function SaleDetailModal({
  open,
  onOpenChange,
  sale,
  currencySymbol = '$',
  userRole,
}: SaleDetailModalProps) {
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!sale) return null;

  const canCancel =
    (userRole === Role.ADMIN || userRole === Role.MANAGER) && sale.status === SaleStatus.COMPLETED;

  const handleConfirmCancel = () => {
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Please provide a descriptive reason (minimum 5 characters).');
      return;
    }

    startTransition(async () => {
      const res = await cancelSaleAction({
        saleId: sale.id,
        reason: reason.trim(),
      });

      if (!res.success) {
        setError(res.error);
      } else {
        setShowCancelPrompt(false);
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setShowCancelPrompt(false);
        setError(null);
        onOpenChange(v);
      }}
      title={`Sale Receipt - ${sale.invoiceNumber}`}
      description={`Processed on ${format(new Date(sale.createdAt), 'PPP p')}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 text-xs">
        {/* Status banner */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div>
            <span className="text-slate-500 block">Current Status:</span>
            <div className="mt-0.5">
              {sale.status === SaleStatus.COMPLETED ? (
                <Badge variant="success">Completed</Badge>
              ) : (
                <Badge variant="destructive">Cancelled / Voided</Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block">Payment Method:</span>
            <span className="font-semibold text-slate-800">{sale.paymentMethod}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block">Processed By:</span>
            <span className="font-semibold text-slate-800">{sale.user.name}</span>
          </div>
        </div>

        {/* Cancellation Notice if Cancelled */}
        {sale.status === SaleStatus.CANCELLED && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span>
                Sale Cancelled on{' '}
                {sale.cancelledAt ? format(new Date(sale.cancelledAt), 'PPP p') : ''}
              </span>
            </div>
            <p className="text-rose-700">Reason: {sale.cancellationReason}</p>
            <p className="text-[10px] text-rose-600 italic">
              All line items have been restored to inventory with SALE_REVERSAL audit records.
            </p>
          </div>
        )}

        {/* Customer Info */}
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
          <span className="font-semibold text-slate-700 block mb-1">Customer Details</span>
          {sale.customer ? (
            <p className="text-slate-600">
              <span className="font-medium text-slate-800">{sale.customer.name}</span>
              {sale.customer.phone && ` • ${sale.customer.phone}`}
              {sale.customer.email && ` • ${sale.customer.email}`}
            </p>
          ) : (
            <p className="text-slate-400">Walk-in Customer (Unregistered)</p>
          )}
        </div>

        {/* Line Items Table */}
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          <div className="grid grid-cols-12 bg-slate-50 px-3 py-2 font-semibold text-slate-500">
            <span className="col-span-6">Item</span>
            <span className="col-span-2 text-center">Qty</span>
            <span className="col-span-2 text-right">Unit Price</span>
            <span className="col-span-2 text-right">Subtotal</span>
          </div>

          {sale.items.map((item) => (
            <div key={item.id} className="grid grid-cols-12 px-3 py-2.5 items-center">
              <div className="col-span-6">
                <p className="font-medium text-slate-800">{item.productName}</p>
                <p className="text-[10px] font-mono text-slate-400">{item.sku}</p>
              </div>
              <span className="col-span-2 text-center font-bold text-slate-700">
                {item.quantity}
              </span>
              <span className="col-span-2 text-right text-slate-600">
                {formatCurrency(Number(item.unitPrice), currencySymbol)}
              </span>
              <span className="col-span-2 text-right font-semibold text-slate-900">
                {formatCurrency(Number(item.subtotal), currencySymbol)}
              </span>
            </div>
          ))}
        </div>

        {/* Financial Summary */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1 text-slate-600 font-mono">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(Number(sale.subtotal), currencySymbol)}</span>
          </div>
          {Number(sale.discountAmount) > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount Applied:</span>
              <span>-{formatCurrency(Number(sale.discountAmount), currencySymbol)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Tax:</span>
            <span>{formatCurrency(Number(sale.taxAmount), currencySymbol)}</span>
          </div>
          <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm font-bold text-slate-900">
            <span>Grand Total:</span>
            <span className="text-indigo-600 font-sans">
              {formatCurrency(Number(sale.grandTotal), currencySymbol)}
            </span>
          </div>
        </div>

        {/* Cancellation Form if toggled */}
        {showCancelPrompt ? (
          <div className="rounded-lg border border-rose-300 bg-rose-50/50 p-4 space-y-3">
            <h4 className="font-bold text-rose-800 text-sm flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Confirm Sale Cancellation
            </h4>
            <p className="text-rose-700 text-xs">
              Cancelling this sale will immediately restore{' '}
              {sale.items.reduce((s, i) => s + i.quantity, 0)} units to stock and record an
              immutable reversal entry in the inventory ledger.
            </p>

            <div>
              <label className="font-semibold text-rose-900 block mb-1">
                Reason for Cancellation <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="e.g. Customer returned items due to incorrect size / order entered mistakenly"
                className="w-full rounded-md border border-rose-300 bg-white p-2 text-xs focus:outline-rose-500"
              />
            </div>

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-700">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelPrompt(false)}
                disabled={isPending}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmCancel}
                isLoading={isPending}
              >
                Confirm & Revert Inventory
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-between gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
              <Printer className="h-4 w-4" />
              <span>Print</span>
            </Button>

            <div className="flex gap-2">
              {canCancel && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowCancelPrompt(true)}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Void / Cancel Sale</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
