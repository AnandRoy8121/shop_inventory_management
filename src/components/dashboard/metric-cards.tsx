import Link from 'next/link';
import { DollarSign, TrendingUp, ShoppingBag, AlertTriangle, AlertOctagon, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/decimal';

interface MetricCardsProps {
  metrics: {
    totalRevenue: number;
    grossProfit: number;
    profitMarginPercent: number;
    totalOrders: number;
    totalItemsSold: number;
    averageOrderValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  currencySymbol?: string;
}

export function MetricCards({ metrics, currencySymbol = '$' }: MetricCardsProps) {
  const cards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(metrics.totalRevenue, currencySymbol),
      subtitle: `${metrics.totalOrders} completed orders`,
      icon: DollarSign,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      title: 'Gross Profit',
      value: formatCurrency(metrics.grossProfit, currencySymbol),
      subtitle: `${metrics.profitMarginPercent}% margin`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Average Order Value',
      value: formatCurrency(metrics.averageOrderValue, currencySymbol),
      subtitle: `${metrics.totalItemsSold} items sold`,
      icon: ShoppingBag,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
    },
    {
      title: 'Low Stock Products',
      value: metrics.lowStockCount,
      subtitle: 'At or below threshold',
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      href: '/inventory?filter=low_stock',
    },
    {
      title: 'Out of Stock Products',
      value: metrics.outOfStockCount,
      subtitle: 'Zero units remaining',
      icon: AlertOctagon,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      href: '/inventory?filter=out_of_stock',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => {
        const content = (
          <Card
            key={c.title}
            className={`overflow-hidden border border-slate-200/80 shadow-xs transition-all ${
              c.href ? 'hover:border-slate-300 hover:shadow-md cursor-pointer' : ''
            }`}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-medium text-slate-500 truncate">{c.title}</p>
                    {c.href && <ArrowUpRight className="h-3 w-3 text-slate-400" />}
                  </div>
                  <h4 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
                    {c.value}
                  </h4>
                  <p className="mt-1 text-[11px] font-medium text-slate-400 truncate">{c.subtitle}</p>
                </div>
                <div
                  className={`flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl ${c.bg} ${c.color}`}
                >
                  <c.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        );

        if (c.href) {
          return (
            <Link key={c.title} href={c.href}>
              {content}
            </Link>
          );
        }

        return content;
      })}
    </div>
  );
}
