import React from 'react';
import { notFound } from 'next/navigation';
import { productService } from '@/services/product.service';
import { categoryService } from '@/services/category.service';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ProductDetailView } from '@/components/products/product-detail-view';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface ProductDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps) {
  const { id } = await params;
  try {
    const product = await productService.getProductById(id);
    return {
      title: `${product.name} | Product Details`,
      description: `SKU: ${product.sku} - Stock & Pricing details`,
    };
  } catch {
    return {
      title: 'Product Not Found',
    };
  }
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;

  let product;
  try {
    product = await productService.getProductById(id);
  } catch {
    notFound();
  }

  const [categories, settings, user] = await Promise.all([
    categoryService.listCategories(),
    prisma.shopSettings.findUnique({ where: { id: 'default' } }),
    getCurrentUser(),
  ]);

  const canManage = user?.role === Role.ADMIN || user?.role === Role.MANAGER;

  return (
    <ProductDetailView
      product={product}
      categories={categories.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))}
      canManage={canManage}
      currencySymbol={settings?.currencySymbol || '$'}
    />
  );
}
