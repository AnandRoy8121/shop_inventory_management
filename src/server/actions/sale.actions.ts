'use server';

import { checkoutSaleSchema, saleCancelSchema } from '@/types/schemas';
import { requirePermission } from '../security/auth';
import { SaleService, StockAlertEvent } from '../services/sale.service';
import { ActionResult, successResult, handleActionError } from '@/lib/errors';
import { revalidatePath } from 'next/cache';

export async function createSaleAction(
  data: unknown
): Promise<ActionResult<{ saleId: string; invoiceNumber: string; grandTotal: number; alerts: StockAlertEvent[] }>> {
  try {
    // Both STAFF and ADMIN have permission to create checkout sales
    const user = await requirePermission('sales:create');
    const parsed = checkoutSaleSchema.parse(data);

    const sale = await SaleService.createSale({
      userId: user.id,
      customerId: parsed.customerId,
      paymentMethod: parsed.paymentMethod,
      discountAmount: parsed.discountAmount,
      notes: parsed.notes,
      items: parsed.items,
    });

    revalidatePath('/pos');
    revalidatePath('/inventory');
    revalidatePath('/sales');
    revalidatePath('/products');
    revalidatePath('/');

    return successResult({
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
      grandTotal: Number(sale.grandTotal),
      alerts: sale.alerts,
    });
  } catch (err: unknown) {
    return handleActionError(err);
  }
}

export async function cancelSaleAction(data: unknown): Promise<ActionResult> {
  try {
    // Cancelling a sale requires ADMIN / MANAGER privilege; STAFF is prohibited
    const user = await requirePermission('sales:cancel');
    const parsed = saleCancelSchema.parse(data);

    await SaleService.cancelSale({
      saleId: parsed.saleId,
      cancelledById: user.id,
      cancellationReason: parsed.reason,
    });

    revalidatePath('/sales');
    revalidatePath('/inventory');
    revalidatePath('/inventory/movements');
    revalidatePath('/products');
    revalidatePath('/');

    return successResult(undefined);
  } catch (err: unknown) {
    return handleActionError(err);
  }
}
