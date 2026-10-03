import { Suspense } from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { parseDateRange, ReportService, DatePreset } from '@/services/report.service';
import { DateFilterBar } from '@/components/shared/date-filter-bar';
import { MetricCards } from '@/components/dashboard/metric-cards';
import { TopProductsTable } from '@/components/dashboard/top-products-table';
import { LowStockProductList } from '@/components/dashboard/low-stock-product-list';
import { ShoppingCart, FileText, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageProps {
  searchParams: Promise<{
    preset?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const preset = (params.preset as DatePreset) || 'monthly';
  const customStart = params.startDate;
  const customEnd = params.endDate;

  const { start, end } = parseDateRange(preset, customStart, customEnd);

  const [metrics, user] = await Promise.all([
    ReportService.getDashboardMetrics(start, end),
    getCurrentUser(),
  ]);

  const outOfStockCount = metrics.inventorySummary.outOfStockCount;
  const lowStockCount = metrics.inventorySummary.lowStockCount;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.name?.split(' ')[0] || 'Store Owner'} 👋
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time sales, inventory valuation, and stock replenishment alerts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/reports">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              <span>View Reports</span>
            </Button>
          </Link>

          <Link href="/sales">
            <Button
              size="sm"
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 shadow-sm font-semibold"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Record Sale</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Low Stock / Out of Stock Banner (if any) */}
      {(outOfStockCount > 0 || lowStockCount > 0) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-200/80 p-2 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold">
                {outOfStockCount + lowStockCount} Product{outOfStockCount + lowStockCount > 1 ? 's' : ''} Need Attention
              </h4>
              <p className="text-xs text-amber-700">
                {outOfStockCount > 0 ? `${outOfStockCount} out of stock` : ''}
                {outOfStockCount > 0 && lowStockCount > 0 ? ' and ' : ''}
                {lowStockCount > 0 ? `${lowStockCount} running low on stock` : ''}.
              </p>
            </div>
          </div>
          <Link
            href="/inventory"
            className="flex items-center justify-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition"
          >
            Review & Restock
          </Link>
        </div>
      )}

      {/* Date Filter Bar (Daily, Weekly, Monthly, Custom) */}
      <Suspense fallback={<div className="h-10 rounded-xl bg-slate-100 animate-pulse" />}>
        <DateFilterBar />
      </Suspense>

      {/* Key Metric KPI Cards */}
      <MetricCards
        totalSales={metrics.totalSales}
        productsSold={metrics.totalProductsSold}
        productsAdded={metrics.totalProductsAdded}
        inventorySummary={metrics.inventorySummary}
      />

      {/* Product Tables: Top Selling Leaderboard & Low-Stock Watchlist */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopProductsTable products={metrics.topSellingProducts} />
        <LowStockProductList products={metrics.lowStockProducts} />
      </div>
    </div>
  );
}
