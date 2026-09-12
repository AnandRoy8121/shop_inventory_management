import React from 'react';
import { productService } from '@/services/product.service';
import { categoryService } from '@/services/category.service';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ProductTable } from '@/components/products/product-table';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Products | Retail Shop Manager',
  description: 'Manage inventory items, pricing, SKU barcodes, and stock levels',
};

interface ProductsPageProps {
  searchParams: Promise<{
    search?: string;
    categoryId?: string;
    status?: string;
    stockStatus?: string;
    page?: string;
    pageSize?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedParams = await searchParams;

  const page = parseInt(resolvedParams.page || '1', 10) || 1;
  const pageSize = parseInt(resolvedParams.pageSize || '10', 10) || 10;
  const search = resolvedParams.search || '';
  const categoryId = resolvedParams.categoryId || '';
  const status = (resolvedParams.status as 'all' | 'active' | 'inactive') || 'all';
  const stockStatus =
    (resolvedParams.stockStatus as 'all' | 'low-stock' | 'out-of-stock' | 'in-stock') || 'all';
  const sortBy =
    (resolvedParams.sortBy as
      | 'name'
      | 'stock'
      | 'sellingPrice'
      | 'costPrice'
      | 'createdAt'
      | 'updatedAt') || 'name';
  const sortOrder = (resolvedParams.sortOrder as 'asc' | 'desc') || 'asc';

  const [productsResult, categories, settings, user] = await Promise.all([
    productService.listProducts({
      search,
      categoryId,
      status,
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

  return (
    <ProductTable
      products={productsResult.items}
      totalCount={productsResult.total}
      page={productsResult.page}
      pageSize={productsResult.pageSize}
      totalPages={productsResult.totalPages}
      categories={categories.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))}
      canManage={canManage}
      currencySymbol={settings?.currencySymbol || '$'}
      searchParamsState={{
        search,
        categoryId,
        status,
        stockStatus,
      }}
    />
  );
}
