import React from 'react';
import { categoryService } from '@/services';
import { CategoryManager } from '@/components/categories/category-manager';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Category Management | Retail Shop Manager',
  description: 'Manage product categories and catalog classifications',
};

export default async function CategoriesPage() {
  const categories = await categoryService.listCategories();

  return <CategoryManager initialCategories={categories} />;
}
