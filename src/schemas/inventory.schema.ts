import { z } from 'zod';

export const addStockSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().int().positive('Quantity to add must be at least 1'),
  notes: z.string().trim().max(255).optional(),
});

export const updateStockSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative'),
  notes: z.string().trim().max(255).optional(),
});

export type AddStockInput = z.infer<typeof addStockSchema>;
export type UpdateStockInput = z.infer<typeof updateStockSchema>;
