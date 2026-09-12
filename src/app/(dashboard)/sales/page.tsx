import prisma from '@/server/db/prisma';
import { getCurrentUser } from '@/server/security/auth';
import { SalesHistoryTable } from '@/components/sales/sales-history-table';
import { ShoppingCart, Download } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Role } from '@prisma/client';

export default async function SalesPage() {
  const [sales, settings, user] = await Promise.all([
    prisma.sale.findMany({
      include: {
        customer: true,
        user: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.shopSettings.findUnique({ where: { id: 'default' } }),
    getCurrentUser(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Sales Order History</h2>
          <p className="text-xs text-slate-500">
            Audit historical receipts, line items, customer ties, and authorized cancellations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/api/reports/export-csv?type=sales&preset=this_month" download>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              <span>Export Sales CSV</span>
            </Button>
          </a>

          <Link href="/pos">
            <Button
              size="sm"
              className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>New Sale</span>
            </Button>
          </Link>
        </div>
      </div>

      <SalesHistoryTable
        sales={sales}
        currencySymbol={settings?.currencySymbol || '$'}
        userRole={user?.role || Role.CASHIER}
      />
    </div>
  );
}
