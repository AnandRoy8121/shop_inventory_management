'use server';

import { addStockSchema, updateStockSchema } from '@/schemas/inventory.schema';
import { InventoryService } from '@/services/inventory.service';
import { requireUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function addStockAction(data: unknown) {
  try {
    await requireUser();
    const { productId, quantity, notes } = addStockSchema.parse(data);
    const updated = await InventoryService.addStock(productId, quantity, notes);
    revalidatePath('/inventory');
    revalidatePath('/products');
    revalidatePath('/sales');
    revalidatePath('/reports');
    revalidatePath('/');
    return { success: true, data: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to add stock';
    return { success: false, error: message };
  }
}

export async function updateStockAction(data: unknown) {
  try {
    await requireUser();
    const { productId, stock, notes } = updateStockSchema.parse(data);
    const updated = await InventoryService.updateStock(productId, stock, notes);
    revalidatePath('/inventory');
    revalidatePath('/products');
    revalidatePath('/sales');
    revalidatePath('/reports');
    revalidatePath('/');
    return { success: true, data: updated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update stock';
    return { success: false, error: message };
  }
}
