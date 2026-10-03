'use server';

import prisma from '@/lib/prisma';
import { categorySchema } from '@/schemas/category.schema';
import { requireUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function createCategoryAction(data: unknown) {
  try {
    await requireUser();
    const { name } = categorySchema.parse(data);
    const category = await prisma.category.create({
      data: { name: name.trim() },
    });
    revalidatePath('/categories');
    revalidatePath('/products');
    return { success: true, data: category };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create category';
    return { success: false, error: message };
  }
}

export async function deleteCategoryAction(id: string) {
  try {
    await requireUser();
    const count = await prisma.product.count({ where: { categoryId: id } });
    if (count > 0) {
      return { success: false, error: 'Cannot delete category containing products. Reassign products first.' };
    }
    await prisma.category.delete({ where: { id } });
    revalidatePath('/categories');
    revalidatePath('/products');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete category';
    return { success: false, error: message };
  }
}
