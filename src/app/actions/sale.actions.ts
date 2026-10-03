'use server';

import { recordSaleSchema } from '@/schemas/sale.schema';
import { SaleService } from '@/services/sale.service';
import { requireUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function recordSaleAction(data: unknown) {
  try {
    await requireUser();
    const { items } = recordSaleSchema.parse(data);
    const result = await SaleService.recordSale(items);

    revalidatePath('/sales');
    revalidatePath('/inventory');
    revalidatePath('/products');
    revalidatePath('/reports');
    revalidatePath('/');

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      success: true,
      data: {
        saleId: result.sale.id,
        saleNumber: result.sale.saleNumber,
        totalItems,
        totalAmount: Number(result.sale.totalAmount),
        profit: Number(result.sale.profit),
        warnings: result.warnings,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record sale';
    return { success: false, error: message };
  }
}
