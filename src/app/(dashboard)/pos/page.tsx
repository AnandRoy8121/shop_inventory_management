import prisma from '@/server/db/prisma';
import { getCurrentUser } from '@/server/security/auth';
import { PosTerminal } from '@/components/pos/pos-terminal';

export default async function PosPage() {
  const [products, categories, customers, settings, user] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.customer.findMany({
      select: { id: true, name: true, phone: true },
      orderBy: { name: 'asc' },
    }),
    prisma.shopSettings.findUnique({ where: { id: 'default' } }),
    getCurrentUser(),
  ]);

  const serializedProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    sellingPrice: Number(p.sellingPrice),
    stock: p.stock,
    minStockAlert: p.minStockAlert,
    category: p.category,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Point of Sale Terminal
          </h2>
          <p className="text-xs text-slate-500">
            Rapid checkout, barcode scanning, stock validation & receipt generation
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500">Active Register Staff:</span>
          <p className="text-xs font-bold text-slate-800">{user?.name || 'Staff'}</p>
        </div>
      </div>

      <PosTerminal
        products={serializedProducts}
        categories={categories}
        customers={customers}
        taxRatePercent={settings ? Number(settings.taxRatePercent) : 0}
        currencySymbol={settings?.currencySymbol || '$'}
        cashierName={user?.name || 'Cashier'}
      />
    </div>
  );
}
