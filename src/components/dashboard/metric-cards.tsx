import Link from 'next/link';
import {
  ShoppingCart,
  Boxes,
  Package,
  PackagePlus,
  FolderTree,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface MetricCardsProps {
  totalSales: number;
  productsSold: number;
  productsAdded: number;
  inventorySummary: {
    totalProducts: number;
    totalStockUnits: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
}

export function MetricCards({
  totalSales,
  productsSold,
  productsAdded,
  inventorySummary,
}: MetricCardsProps) {
  const cards = [
    {
      title: 'Total Sales',
      value: totalSales,
      subtitle: 'Recorded transactions',
      icon: ShoppingCart,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      href: '/sales',
    },
    {
      title: 'Units Sold',
      value: productsSold,
      subtitle: 'Items dispatched',
      icon: Package,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      href: '/reports',
    },
    {
      title: 'Units Added',
      value: `+${productsAdded}`,
      subtitle: 'Inward intake received',
      icon: PackagePlus,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      href: '/reports',
    },
    {
      title: 'Current Stock',
      value: `${inventorySummary.totalStockUnits} units`,
      subtitle: 'On hand inventory',
      icon: Boxes,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
      href: '/inventory',
    },
    {
      title: 'Catalog Size',
      value: `${inventorySummary.totalProducts} items`,
      subtitle: 'Active product types',
      icon: FolderTree,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      href: '/products',
    },
    {
      title: 'Stock Alerts',
      value: inventorySummary.lowStockCount + inventorySummary.outOfStockCount,
      subtitle: `${inventorySummary.outOfStockCount} out of stock, ${inventorySummary.lowStockCount} low`,
      icon: AlertTriangle,
      color: inventorySummary.outOfStockCount > 0 ? 'text-rose-600' : 'text-amber-600',
      bg: inventorySummary.outOfStockCount > 0 ? 'bg-rose-50' : 'bg-amber-50',
      href: '/inventory',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => {
        const content = (
          <Card
            key={c.title}
            className={`overflow-hidden border border-slate-200/80 shadow-xs transition-all ${
              c.href ? 'hover:border-slate-300 hover:shadow-md cursor-pointer' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-medium text-slate-500 truncate">{c.title}</p>
                    {c.href && <ArrowUpRight className="h-3 w-3 text-slate-400 shrink-0" />}
                  </div>
                  <h4 className="mt-1 text-xl font-bold tracking-tight text-slate-900 truncate">
                    {c.value}
                  </h4>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-400 truncate">{c.subtitle}</p>
                </div>
                <div
                  className={`ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${c.bg} ${c.color}`}
                >
                  <c.icon className="h-4 w-4" />
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
