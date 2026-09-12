import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/decimal';
import { Trophy, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface TopProductsTableProps {
  products: Array<{
    productId: string;
    name: string;
    sku: string;
    quantitySold: number;
    totalRevenue: number;
  }>;
  currencySymbol?: string;
}

export function TopProductsTable({ products, currencySymbol = '$' }: TopProductsTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <Trophy className="h-4 w-4 text-amber-500" />
            Top Selling Products
          </CardTitle>
          <p className="text-xs text-slate-500">Highest velocity items in selected period</p>
        </div>
        <Link
          href="/products"
          className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          View Catalog
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No product sales recorded in this interval.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {products.map((p, index) => (
              <div key={p.productId} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800 leading-tight">{p.name}</p>
                    <p className="text-[11px] font-mono text-slate-400">{p.sku}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(p.totalRevenue, currencySymbol)}
                  </p>
                  <p className="text-xs text-slate-500">{p.quantitySold} units sold</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
