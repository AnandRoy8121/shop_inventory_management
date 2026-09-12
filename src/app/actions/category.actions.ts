'use server';

import { createCategorySchema, updateCategorySchema } from '@/schemas/category.schema';
import { categoryService } from '@/services/category.service';
import { requirePermission } from '@/lib/auth';
import { ActionResult, successResult, handleActionError } from '@/lib/errors';
import { revalidatePath } from 'next/cache';

export async function getCategoriesAction(search?: string) {
  try {
    const categories = await categoryService.listCategories(search);
    return successResult(categories);
  } catch (err) {
    return handleActionError(err);
  }
}

export async function createCategoryAction(data: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission('products:write');
    const validated = createCategorySchema.parse(data);

    const category = await categoryService.createCategory(validated, user.id);

    revalidatePath('/categories');
    revalidatePath('/products');
    revalidatePath('/pos');
    revalidatePath('/');

    return successResult({ id: category.id });
  } catch (err) {
    return handleActionError(err);
  }
}

export async function updateCategoryAction(
  id: string,
  data: unknown
): Promise<ActionResult> {
  try {
    const user = await requirePermission('products:write');
    const validated = updateCategorySchema.parse(data);

    await categoryService.updateCategory(id, validated, user.id);

    revalidatePath('/categories');
    revalidatePath('/products');
    revalidatePath('/pos');
    revalidatePath('/');

    return successResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission('products:delete');

    await categoryService.deleteCategory(id, user.id);

    revalidatePath('/categories');
    revalidatePath('/products');
    revalidatePath('/pos');
    revalidatePath('/');

    return successResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}

export async function toggleCategoryStatusAction(
  id: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const user = await requirePermission('products:write');

    await categoryService.toggleStatus(id, isActive, user.id);

    revalidatePath('/categories');
    revalidatePath('/products');
    revalidatePath('/pos');
    revalidatePath('/');

    return successResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}
