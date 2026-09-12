import React from 'react';
import { inventoryService } from '@/services/inventory.service';
import { categoryService } from '@/services/category.service';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { InventoryOverviewCards } from '@/components/inventory/inventory-overview-cards';
import { InventoryTable } from '@/components/inventory/inventory-table';
import { PageHeader } from '@/components/shared/page-header';
import { History } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Inventory Management | Retail Shop Manager',
  description: 'Monitor stock levels, inventory valuations, alerts, and manual adjustments',
};

interface InventoryPageProps {
  searchParams: Promise<{
    search?: string;
    categoryId?: string;
    stockStatus?: string;
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const resolvedParams = await searchParams;

  const page = parseInt(resolvedParams.page || '1', 10) || 1;
  const pageSize = parseInt(resolvedParams.pageSize || '10', 10) || 10;
  const search = resolvedParams.search || '';
  const categoryId = resolvedParams.categoryId || '';
  const stockStatus =
    (resolvedParams.stockStatus as 'all' | 'in_stock' | 'low_stock' | 'out_of_stock') || 'all';
  const sortBy =
    (resolvedParams.sortBy as 'name' | 'stock' | 'costPrice' | 'sellingPrice' | 'stockValue') ||
    'name';
  const sortOrder = (resolvedParams.sortOrder as 'asc' | 'desc') || 'asc';

  const [overviewMetrics, inventoryResult, categories, settings, user] = await Promise.all([
    inventoryService.getOverview(),
    inventoryService.listInventory({
      search,
      categoryId,
      stockStatus,
      page,
      pageSize,
      sortBy,
      sortOrder,
    }),
    categoryService.listCategories(),
    prisma.shopSettings.findUnique({ where: { id: 'default' } }),
    getCurrentUser(),
  ]);

  const canManage = user?.role === Role.ADMIN || user?.role === Role.MANAGER;
  const currencySymbol = settings?.currencySymbol || '$';

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Inventory Operations & Stock Balances"
        description="Monitor active merchandise valuation, reorder alerts, and execute auditable stock corrections"
        badge={
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
            {overviewMetrics.totalUnits.toLocaleString()} Units Total
          </span>
        }
        actions={
          <Link href="/inventory/movements">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold text-indigo-700 border-indigo-200 hover:bg-indigo-50 shadow-2xs h-9"
            >
              <History className="h-4 w-4 text-indigo-600" />
              <span>Movement History Ledger</span>
            </Button>
          </Link>
        }
      />

      {/* KPI Overview Metrics */}
      <InventoryOverviewCards metrics={overviewMetrics} currencySymbol={currencySymbol} />

      {/* Inventory Stock Table */}
      <InventoryTable
        products={inventoryResult.items}
        totalCount={inventoryResult.total}
        page={inventoryResult.page}
        pageSize={inventoryResult.pageSize}
        totalPages={inventoryResult.totalPages}
        categories={categories.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))}
        currencySymbol={currencySymbol}
        canManage={canManage}
        searchParamsState={{
          search,
          categoryId,
          stockStatus,
        }}
      />
    </div>
  );
}
