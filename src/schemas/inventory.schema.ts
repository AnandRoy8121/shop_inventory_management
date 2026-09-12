import { z } from 'zod';
import { MovementType } from '@prisma/client';

export const reasonCategoryEnum = z.enum([
  'damaged',
  'expired',
  'missing',
  'stock_correction',
  'opening_stock',
  'supplier_intake',
  'customer_return',
  'other',
]);

export type ReasonCategory = z.infer<typeof reasonCategoryEnum>;

/**
 * Validation schema for manual stock adjustments
 */
export const stockAdjustmentSchema = z.object({
  productId: z.string().trim().min(1, 'Product ID is required'),
  operation: z.enum(['INCREASE', 'DECREASE']).default('INCREASE'),
  quantity: z
    .coerce
    .number({ message: 'Quantity must be a valid number' })
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1 unit'),
  reasonCategory: reasonCategoryEnum.default('stock_correction'),
  reason: z
    .string()
    .trim()
    .min(3, 'Reason must be at least 3 characters')
    .max(255, 'Reason must not exceed 255 characters'),
  referenceId: z
    .string()
    .trim()
    .max(100, 'Reference ID must not exceed 100 characters')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  type: z.nativeEnum(MovementType).optional(),
});

/**
 * Query schema for inventory overview table
 */
export const inventoryQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  stockStatus: z.enum(['all', 'in_stock', 'low_stock', 'out_of_stock']).optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
  sortBy: z.enum(['name', 'stock', 'costPrice', 'sellingPrice', 'stockValue']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

/**
 * Query schema for inventory movement history ledger
 */
export const movementQuerySchema = z.object({
  search: z.string().trim().optional(),
  productId: z.string().trim().optional(),
  type: z
    .enum([
      'all',
      'PURCHASE',
      'SALE',
      'SALE_REVERSAL',
      'MANUAL_ADJUSTMENT',
      'RETURN',
      'RETURN_REVERSAL',
    ])
    .optional()
    .default('all'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type StockAdjustmentInput = z.input<typeof stockAdjustmentSchema>;
export type StockAdjustmentOutput = z.output<typeof stockAdjustmentSchema>;
export type InventoryQueryInput = z.input<typeof inventoryQuerySchema>;
export type InventoryQueryOutput = z.output<typeof inventoryQuerySchema>;
export type MovementQueryInput = z.input<typeof movementQuerySchema>;
export type MovementQueryOutput = z.output<typeof movementQuerySchema>;
