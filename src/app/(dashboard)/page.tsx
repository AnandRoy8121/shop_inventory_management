import { Suspense } from 'react';
import { getCurrentUser } from '@/server/security/auth';
import { ReportService } from '@/server/services/report.service';
import { ProductService } from '@/server/services/product.service';
import { getDateRangeFromPreset, DateFilterPreset } from '@/lib/dates';
import { DateFilterBar } from '@/components/shared/date-filter-bar';
import { MetricCards } from '@/components/dashboard/metric-cards';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import { TopProductsTable } from '@/components/dashboard/top-products-table';
import { LowStockProductList } from '@/components/dashboard/low-stock-product-list';
import { StockAlertBanner } from '@/components/dashboard/stock-alert-banner';
import prisma from '@/server/db/prisma';
import Link from 'next/link';
import { ShoppingCart, FileText } from 'lucide-react';
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
  const preset = (params.preset as DateFilterPreset) || 'this_month';
  const customStart = params.startDate;
  const customEnd = params.endDate;

  const dateRange = getDateRangeFromPreset(preset, customStart, customEnd);

  const [metrics, alerts, settings, user] = await Promise.all([
    ReportService.getDashboardMetrics(dateRange),
    ProductService.getStockAlerts(),
    prisma.shopSettings.findUnique({ where: { id: 'default' } }),
    getCurrentUser(),
  ]);

  const currencySymbol = settings?.currencySymbol || '$';

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.name?.split(' ')[0] || 'Staff'} 👋
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Store operations overview and financial health for {settings?.shopName || 'Apex Retail'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/reports">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              <span>Reports</span>
            </Button>
          </Link>

          <Link href="/pos">
            <Button
              size="sm"
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Launch POS</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stock Alert Warnings Banner */}
      <StockAlertBanner outOfStock={alerts.outOfStock} lowStock={alerts.lowStock} />

      {/* Date Filter Bar */}
      <Suspense fallback={<div className="h-10 rounded-xl bg-slate-100 animate-pulse" />}>
        <DateFilterBar />
      </Suspense>

      {/* KPI Metric Cards */}
      <MetricCards metrics={metrics} currencySymbol={currencySymbol} />

      {/* Analytics Visualizations */}
      <DashboardCharts
        timeSeriesData={metrics.timeSeriesData}
        categoryBreakdown={metrics.categoryBreakdown}
        currencySymbol={currencySymbol}
      />

      {/* Product Tables: Top Selling Leaderboard & Low-Stock Watchlist */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopProductsTable products={metrics.topSellingProducts} currencySymbol={currencySymbol} />
        <LowStockProductList
          outOfStock={alerts.outOfStock}
          lowStock={alerts.lowStock}
          currencySymbol={currencySymbol}
        />
      </div>
    </div>
  );
}
