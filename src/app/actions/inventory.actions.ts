'use server';

import { stockAdjustmentSchema } from '@/schemas/inventory.schema';
import { inventoryService } from '@/services/inventory.service';
import { requirePermission } from '@/lib/auth';
import { ActionResult, successResult, handleActionError } from '@/lib/errors';
import { revalidatePath } from 'next/cache';

/**
 * Server action to adjust inventory stock (increase or decrease)
 * Guarded by 'inventory:adjust' permission.
 */
export async function adjustStockAction(
  data: unknown
): Promise<ActionResult<{ stockAfter: number }>> {
  try {
    const user = await requirePermission('inventory:adjust');
    const validated = stockAdjustmentSchema.parse(data);

    const result = await inventoryService.adjustStock({
      productId: validated.productId,
      operation: validated.operation,
      quantity: validated.quantity,
      reason: validated.reason,
      reasonCategory: validated.reasonCategory,
      referenceId: validated.referenceId,
      type: validated.type,
      userId: user.id,
    });

    revalidatePath('/inventory');
    revalidatePath('/inventory/movements');
    revalidatePath('/products');
    revalidatePath(`/products/${validated.productId}`);
    revalidatePath('/pos');
    revalidatePath('/');

    return successResult({ stockAfter: result.movement.stockAfter });
  } catch (err: unknown) {
    return handleActionError(err);
  }
}
