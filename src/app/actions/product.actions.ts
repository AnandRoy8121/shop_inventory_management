'use server';

import { createProductSchema, updateProductSchema } from '@/schemas/product.schema';
import { ProductService } from '@/services/product.service';
import { requireUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function createProductAction(data: unknown) {
  try {
    await requireUser();
    const validated = createProductSchema.parse(data);
    const product = await ProductService.createProduct(validated);
    revalidatePath('/products');
    revalidatePath('/inventory');
    revalidatePath('/sales');
    revalidatePath('/reports');
    revalidatePath('/');
    return { success: true, data: product };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create product';
    return { success: false, error: message };
  }
}

export async function updateProductAction(data: unknown) {
  try {
    await requireUser();
    const validated = updateProductSchema.parse(data);
    const { id, ...rest } = validated;
    const product = await ProductService.updateProduct(id, rest);
    revalidatePath('/products');
    revalidatePath('/inventory');
    revalidatePath('/sales');
    revalidatePath('/');
    return { success: true, data: product };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update product';
    return { success: false, error: message };
  }
}

export async function toggleProductAction(id: string) {
  try {
    await requireUser();
    const product = await ProductService.toggleActive(id);
    revalidatePath('/products');
    revalidatePath('/inventory');
    revalidatePath('/sales');
    revalidatePath('/');
    return { success: true, data: product };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to toggle product status';
    return { success: false, error: message };
  }
}

export async function deleteProductAction(id: string) {
  try {
    await requireUser();
    await ProductService.deleteProduct(id);
    revalidatePath('/products');
    revalidatePath('/inventory');
    revalidatePath('/sales');
    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete product';
    return { success: false, error: message };
  }
}
