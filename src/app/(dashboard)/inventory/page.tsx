import prisma from '@/lib/prisma';
import { InventoryService } from '@/services/inventory.service';
import { InventoryManager } from '@/components/inventory/inventory-manager';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const [products, summary] = await Promise.all([
    prisma.product.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
    }),
    InventoryService.getInventorySummary(),
  ]);

  const serializedProducts = products.map((p) => ({
    ...p,
    purchasePrice: Number(p.purchasePrice),
    sellingPrice: Number(p.sellingPrice),
  }));

  return <InventoryManager products={serializedProducts} summary={summary} />;
}
