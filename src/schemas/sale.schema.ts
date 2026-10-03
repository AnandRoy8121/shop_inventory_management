import { z } from 'zod';

export const saleItemInputSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0, 'Price must be 0 or greater').default(0).optional(),
});

export const recordSaleSchema = z.object({
  items: z.array(saleItemInputSchema).min(1, 'At least one product is required to record a sale'),
});

export type SaleItemInput = z.infer<typeof saleItemInputSchema>;
export type RecordSaleInput = z.infer<typeof recordSaleSchema>;
