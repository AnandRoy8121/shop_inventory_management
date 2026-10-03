import { z } from 'zod';

export const productSchema = z.object({
  name: z.string().trim().min(2, 'Product name must be at least 2 characters').max(100),
  categoryId: z.string().trim().optional().nullable(),
  purchasePrice: z.coerce.number().min(0, 'Purchase price cannot be negative').default(0),
  sellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative').default(0),
  stock: z.coerce.number().int().min(0, 'Stock cannot be negative').default(0),
  minStock: z.coerce.number().int().min(0, 'Minimum stock cannot be negative').default(5),
  isActive: z.boolean().default(true),
});

export type ProductInput = z.infer<typeof productSchema>;

export const createProductSchema = productSchema;
export const updateProductSchema = productSchema.partial().extend({
  id: z.string().min(1, 'Product ID is required'),
});
