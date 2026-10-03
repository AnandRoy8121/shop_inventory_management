import prisma from '@/lib/prisma';
import { SalesManager } from '@/components/sales/sales-manager';

export const dynamic = 'force-dynamic';

export default async function SalesPage() {
  const [products, sales, categories] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { name: 'asc' },
    }),
    prisma.sale.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        items: true,
      },
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
    }),
  ]);

  const serializedSales = sales.map((s) => ({
    id: s.id,
    saleNumber: s.saleNumber,
    totalAmount: Number(s.totalAmount),
    totalCost: Number(s.totalCost),
    profit: Number(s.profit),
    createdAt: s.createdAt,
    items: s.items.map((i) => ({
      id: i.id,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      subtotal: Number(i.subtotal),
    })),
  }));

  const serializedProducts = products.map((p) => ({
    ...p,
    purchasePrice: Number(p.purchasePrice),
    sellingPrice: Number(p.sellingPrice),
  }));

  return <SalesManager products={serializedProducts} categories={categories} initialSales={serializedSales} />;
}
