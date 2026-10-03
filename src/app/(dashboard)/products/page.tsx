import prisma from '@/lib/prisma';
import { ProductManager } from '@/components/products/product-manager';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
    }),
  ]);

  const serializedProducts = products.map((p) => ({
    ...p,
    purchasePrice: Number(p.purchasePrice),
    sellingPrice: Number(p.sellingPrice),
  }));

  return <ProductManager products={serializedProducts} categories={categories} />;
}
