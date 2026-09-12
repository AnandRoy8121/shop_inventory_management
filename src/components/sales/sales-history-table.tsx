'use client';

import { useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SaleDetailModal } from './sale-detail-modal';
import { SaleStatus, Role } from '@prisma/client';
import { Eye, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/decimal';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';

interface SaleItemRow {
  id: string;
  invoiceNumber: string;
  createdAt: Date;
  status: SaleStatus;
  paymentMethod: string;
  subtotal: number | string | object;
  taxAmount: number | string | object;
  discountAmount: number | string | object;
  grandTotal: number | string | object;
  notes: string | null;
  cancellationReason: string | null;
  cancelledAt: Date | null;
  customer: { name: string; phone: string | null; email: string | null } | null;
  user: { name: string };
  items: Array<{
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    unitPrice: number | string | object;
    subtotal: number | string | object;
  }>;
}

interface SalesHistoryTableProps {
  sales: SaleItemRow[];
  currencySymbol?: string;
  userRole: Role;
}

export function SalesHistoryTable({
  sales,
  currencySymbol = '$',
  userRole,
}: SalesHistoryTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedSale, setSelectedSale] = useState<SaleItemRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleInspect = (sale: SaleItemRow) => {
    setSelectedSale(sale);
    setModalOpen(true);
  };

  const filtered = sales.filter((s) => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      s.invoiceNumber.toLowerCase().includes(q) ||
      (s.customer && s.customer.name.toLowerCase().includes(q)) ||
      (s.customer && s.customer.phone && s.customer.phone.includes(q)) ||
      s.user.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Search and status filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by invoice number, customer name, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 text-xs">
            {['ALL', SaleStatus.COMPLETED, SaleStatus.CANCELLED].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-md px-2.5 py-1 font-medium transition ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {st === 'ALL' ? 'All Orders' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice #</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Cashier</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Grand Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-32 text-center text-slate-400">
                No sales records found matching your filters.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>
                  <span className="font-mono font-bold text-xs text-indigo-700">
                    {sale.invoiceNumber}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                  {format(new Date(sale.createdAt), 'yyyy-MM-dd HH:mm')}
                </TableCell>
                <TableCell>
                  <span className="text-xs font-medium text-slate-800">
                    {sale.customer ? sale.customer.name : 'Walk-in'}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-slate-600">{sale.user.name}</TableCell>
                <TableCell>
                  <span className="text-xs text-slate-600 font-medium">
                    {sale.items.reduce((s, i) => s + i.quantity, 0)} pcs ({sale.items.length} items)
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-mono text-slate-700">{sale.paymentMethod}</span>
                </TableCell>
                <TableCell>
                  <span className="font-bold text-sm text-slate-900 font-mono">
                    {formatCurrency(Number(sale.grandTotal), currencySymbol)}
                  </span>
                </TableCell>
                <TableCell>
                  {sale.status === SaleStatus.COMPLETED ? (
                    <Badge variant="success" className="text-[10px]">
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">
                      Cancelled
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleInspect(sale)}
                    className="gap-1.5 text-xs text-slate-700 hover:text-indigo-600"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <SaleDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        sale={selectedSale}
        currencySymbol={currencySymbol}
        userRole={userRole}
      />
    </div>
  );
}
