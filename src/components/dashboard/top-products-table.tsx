import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Trophy, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

interface TopProductsTableProps {
  products: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

export function TopProductsTable({ products }: TopProductsTableProps) {
  return (
    <Card className="border border-slate-200 shadow-xs">
      <CardHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <Trophy className="h-4 w-4 text-amber-500" />
            Top Selling Products
          </CardTitle>
          <p className="text-xs text-slate-500">Highest volume items in selected period</p>
        </div>
        <Link
          href="/products"
          className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          View All
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="p-4 sm:p-5 pt-2">
        {products.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            No sales recorded in this date range.
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
                    <p className="text-[11px] text-slate-400">{p.quantity} units sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-indigo-600 font-mono">
                    {p.quantity} units
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium">volume</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
