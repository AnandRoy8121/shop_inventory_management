'use server';

import { createProductSchema, updateProductSchema } from '@/schemas/product.schema';
import { productService } from '@/services/product.service';
import { requirePermission } from '@/lib/auth';
import { ActionResult, successResult, handleActionError } from '@/lib/errors';
import { revalidatePath } from 'next/cache';

/**
 * Server action to create a new product.
 * Enforces 'products:write' permission and validates with Zod.
 */
export async function createProductAction(data: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission('products:write');
    const validated = createProductSchema.parse(data);

    const product = await productService.createProduct(validated, user.id);

    revalidatePath('/products');
    revalidatePath(`/products/${product.id}`);
    revalidatePath('/inventory');
    revalidatePath('/pos');
    revalidatePath('/');

    return successResult({ id: product.id });
  } catch (err: unknown) {
    return handleActionError(err);
  }
}

/**
 * Server action to update existing product details.
 * Enforces 'products:write' permission. Stock edits are strictly prohibited.
 */
export async function updateProductAction(id: string, data: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission('products:write');
    const validated = updateProductSchema.parse(data);

    await productService.updateProduct(id, validated, user.id);

    revalidatePath('/products');
    revalidatePath(`/products/${id}`);
    revalidatePath('/inventory');
    revalidatePath('/pos');
    revalidatePath('/');

    return successResult(undefined);
  } catch (err: unknown) {
    return handleActionError(err);
  }
}

/**
 * Server action to deactivate a product (soft-deactivate).
 * Enforces 'products:delete' permission.
 */
export async function deactivateProductAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission('products:delete');

    await productService.deactivateProduct(id, user.id);

    revalidatePath('/products');
    revalidatePath(`/products/${id}`);
    revalidatePath('/inventory');
    revalidatePath('/pos');
    revalidatePath('/');

    return successResult(undefined);
  } catch (err: unknown) {
    return handleActionError(err);
  }
}

/**
 * Server action to reactivate a previously deactivated product.
 * Enforces 'products:write' permission.
 */
export async function reactivateProductAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission('products:write');

    await productService.reactivateProduct(id, user.id);

    revalidatePath('/products');
    revalidatePath(`/products/${id}`);
    revalidatePath('/inventory');
    revalidatePath('/pos');
    revalidatePath('/');

    return successResult(undefined);
  } catch (err: unknown) {
    return handleActionError(err);
  }
}

/**
 * Server action to toggle product active status
 */
export async function toggleProductStatusAction(id: string, isActive: boolean): Promise<ActionResult> {
  if (isActive) {
    return reactivateProductAction(id);
  } else {
    return deactivateProductAction(id);
  }
}
