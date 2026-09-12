import React from 'react';
import Link from 'next/link';
import { inventoryService } from '@/services/inventory.service';
import { prisma } from '@/lib/prisma';
import { MovementHistoryTable } from '@/components/inventory/movement-history-table';
import { PageHeader } from '@/components/shared/page-header';
import { ArrowLeft, Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Inventory Movement Ledger | Retail Shop Manager',
  description: 'Immutable chronological audit ledger of all product stock additions, deductions, and sales',
};

interface MovementsPageProps {
  searchParams: Promise<{
    search?: string;
    productId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function MovementsPage({ searchParams }: MovementsPageProps) {
  const resolvedParams = await searchParams;

  const page = parseInt(resolvedParams.page || '1', 10) || 1;
  const pageSize = parseInt(resolvedParams.pageSize || '20', 10) || 20;
  const search = resolvedParams.search || '';
  const productId = resolvedParams.productId || '';
  const type =
    (resolvedParams.type as
      | 'all'
      | 'PURCHASE'
      | 'SALE'
      | 'SALE_REVERSAL'
      | 'MANUAL_ADJUSTMENT'
      | 'RETURN'
      | 'RETURN_REVERSAL') || 'all';
  const startDate = resolvedParams.startDate;
  const endDate = resolvedParams.endDate;

  let productNameFilter: string | undefined;
  if (productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true, sku: true },
    });
    if (product) {
      productNameFilter = `${product.name} (${product.sku})`;
    }
  }

  const movementResult = await inventoryService.listMovements({
    search,
    productId,
    type,
    startDate,
    endDate,
    page,
    pageSize,
  });

  return (
    <div className="space-y-4">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Inventory Balances</span>
        </Link>
      </div>

      <PageHeader
        title="Inventory Movement Audit Ledger"
        description="Immutable, non-fungible chronological trail of all warehouse receipts, counter sales, manual adjustments, and returns"
        badge={
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
            {movementResult.total.toLocaleString()} Audit Records
          </span>
        }
        actions={
          <Link href="/inventory">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold text-slate-700 shadow-2xs h-9"
            >
              <Boxes className="h-4 w-4 text-slate-500" />
              <span>Active Stock Overview</span>
            </Button>
          </Link>
        }
      />

      <MovementHistoryTable
        movements={movementResult.items}
        totalCount={movementResult.total}
        page={movementResult.page}
        pageSize={movementResult.pageSize}
        totalPages={movementResult.totalPages}
        productNameFilter={productNameFilter}
        searchParamsState={{
          search,
          productId,
          type,
        }}
      />
    </div>
  );
}
