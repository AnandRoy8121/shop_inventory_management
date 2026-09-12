import Link from 'next/link';
import { AlertTriangle, AlertCircle, ArrowRight } from 'lucide-react';
import { Product, Category } from '@prisma/client';

interface StockAlertBannerProps {
  outOfStock: Array<Product & { category?: Category | null }>;
  lowStock: Array<Product & { category?: Category | null }>;
}

export function StockAlertBanner({ outOfStock, lowStock }: StockAlertBannerProps) {
  if (outOfStock.length === 0 && lowStock.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Out of stock banner */}
      {outOfStock.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-rose-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-rose-200/80 p-2 text-rose-700">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold">
                {outOfStock.length} Product{outOfStock.length > 1 ? 's' : ''} Out of Stock
              </h4>
              <p className="text-xs text-rose-700">
                {outOfStock
                  .map((p) => p.name)
                  .slice(0, 3)
                  .join(', ')}
                {outOfStock.length > 3 ? ` and ${outOfStock.length - 3} more` : ''}
              </p>
            </div>
          </div>
          <Link
            href="/inventory?filter=out_of_stock"
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition"
          >
            Restock Now
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Low stock warning banner */}
      {lowStock.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-200/80 p-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold">
                {lowStock.length} Product{lowStock.length > 1 ? 's' : ''} Running Low on Stock
              </h4>
              <p className="text-xs text-amber-700">
                {lowStock
                  .map((p) => `${p.name} (${p.stock} left)`)
                  .slice(0, 3)
                  .join(', ')}
                {lowStock.length > 3 ? ` and ${lowStock.length - 3} more` : ''}
              </p>
            </div>
          </div>
          <Link
            href="/inventory?filter=low_stock"
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition"
          >
            Review Inventory
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
