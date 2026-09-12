'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, AlertOctagon, PackageCheck, ArrowRight } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StockAlertEvent } from '@/server/services/sale.service';

interface PostSaleAlertModalProps {
  open: boolean;
  onClose: () => void;
  alerts: StockAlertEvent[];
  invoiceNumber?: string;
}

export function PostSaleAlertModal({
  open,
  onClose,
  alerts,
  invoiceNumber,
}: PostSaleAlertModalProps) {
  if (!open || alerts.length === 0) return null;

  const hasOutOfStock = alerts.some((a) => a.alertType === 'OUT_OF_STOCK');

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title=""
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Header with status icon */}
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              hasOutOfStock ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
            }`}
          >
            {hasOutOfStock ? (
              <AlertOctagon className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Inventory Stock Attention Required
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {invoiceNumber ? `Sale #${invoiceNumber} completed successfully.` : 'Sale completed.'}{' '}
              The following {alerts.length === 1 ? 'item has' : 'items have'} reached stock thresholds.
            </p>
          </div>
        </div>

        {/* Alert Items List */}
        <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50 max-h-60 overflow-y-auto">
          {alerts.map((alert) => {
            const isOutOfStock = alert.alertType === 'OUT_OF_STOCK';
            return (
              <div key={alert.productId} className="p-3.5 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isOutOfStock
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-amber-100 text-amber-700 border border-amber-200'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isOutOfStock ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
                        }`}
                      />
                      {isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                    </span>
                    <span className="text-xs font-semibold text-slate-900">{alert.productName}</span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium">{alert.message}</p>

                  <p className="text-[11px] text-slate-400">
                    SKU: <span className="font-mono text-slate-600">{alert.sku}</span> &bull; Current Stock:{' '}
                    <span className={`font-semibold ${isOutOfStock ? 'text-rose-600' : 'text-amber-600'}`}>
                      {alert.remainingStock}
                    </span>{' '}
                    (Min Alert: {alert.minStockAlert})
                  </p>
                </div>

                <Link
                  href={`/inventory?search=${encodeURIComponent(alert.sku)}`}
                  className="shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 pt-1"
                >
                  Restock
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Dialog Actions */}
        <div className="flex items-center justify-between pt-2">
          <Link href="/inventory" onClick={onClose}>
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              <PackageCheck className="h-3.5 w-3.5 text-slate-500" />
              Manage Inventory
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={onClose}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-white"
          >
            Acknowledge & Continue
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
