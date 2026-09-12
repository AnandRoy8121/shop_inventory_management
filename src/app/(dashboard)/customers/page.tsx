import React from 'react';
import prisma from '@/server/db/prisma';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, ColumnDef } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { DateDisplay } from '@/components/shared/date-display';
import { Users, Plus, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  salesCount: number;
  isActive: boolean;
  createdAt: Date;
}

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    include: {
      _count: {
        select: { sales: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const data: CustomerRow[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    salesCount: c._count.sales,
    isActive: c.isActive,
    createdAt: c.createdAt,
  }));

  const columns: ColumnDef<CustomerRow>[] = [
    {
      header: 'Customer',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs">
            {row.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{row.name}</p>
            {row.address && (
              <p className="text-[11px] text-slate-500 line-clamp-1">{row.address}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Contact',
      cell: (row) => (
        <div className="space-y-0.5 text-xs text-slate-600">
          {row.phone && (
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <Phone className="h-3 w-3 text-slate-400" />
              <span>{row.phone}</span>
            </div>
          )}
          {row.email && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <Mail className="h-3 w-3 text-slate-400" />
              <span className="text-slate-500">{row.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Purchases',
      align: 'center',
      cell: (row) => (
        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
          {row.salesCount} orders
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    },
    {
      header: 'Customer Since',
      align: 'right',
      cell: (row) => <DateDisplay date={row.createdAt} formatVariant="date" />,
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customers"
        description="View customer directory, loyalty profiles, and order history"
        badge={
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            {customers.length} Customers
          </span>
        }
        actions={
          <Button
            size="sm"
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 shadow-xs h-9 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>Add Customer</span>
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data}
        emptyState={{
          title: 'No customer profiles found',
          description:
            'Customer profiles will appear here as orders are placed at POS or added manually.',
          icon: Users,
        }}
      />
    </div>
  );
}
