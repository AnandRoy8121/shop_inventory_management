import prisma from '@/lib/prisma';
import { CategoryManager } from '@/components/categories/category-manager';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  return <CategoryManager categories={categories} />;
}
