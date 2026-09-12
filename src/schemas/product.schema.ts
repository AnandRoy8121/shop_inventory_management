import { z } from 'zod';

/**
 * Schema for creating a new product.
 * Note: initialStock is only accepted at creation time to initialize inventory.
 */
export const createProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Product name must be at least 2 characters')
    .max(100, 'Product name must not exceed 100 characters'),
  sku: z
    .string()
    .trim()
    .min(2, 'SKU must be at least 2 characters')
    .max(50, 'SKU must not exceed 50 characters')
    .regex(/^[A-Za-z0-9-_.]+$/, 'SKU may only contain letters, numbers, hyphens, periods, and underscores')
    .transform((val) => val.toUpperCase()),
  barcode: z
    .string()
    .trim()
    .max(50, 'Barcode must not exceed 50 characters')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  description: z
    .string()
    .trim()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  categoryId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  costPrice: z
    .coerce
    .number({ message: 'Purchase price must be a valid number' })
    .min(0, 'Purchase price cannot be negative'),
  purchasePrice: z
    .coerce
    .number()
    .min(0, 'Purchase price cannot be negative')
    .optional()
    .nullable(),
  sellingPrice: z
    .coerce
    .number({ message: 'Selling price must be a valid number' })
    .min(0, 'Selling price cannot be negative'),
  initialStock: z
    .coerce
    .number()
    .int('Initial stock must be an integer')
    .min(0, 'Initial stock cannot be negative')
    .optional()
    .default(0),
  minStockAlert: z
    .coerce
    .number()
    .int('Minimum stock alert must be an integer')
    .min(0, 'Minimum stock cannot be negative')
    .optional()
    .default(5),
  unit: z
    .string()
    .trim()
    .min(1, 'Unit must not be empty')
    .max(20, 'Unit must not exceed 20 characters')
    .optional()
    .default('pcs'),
  imageUrl: z
    .string()
    .trim()
    .max(500, 'Image URL must not exceed 500 characters')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  isActive: z.boolean().optional().default(true),
});

/**
 * Schema for updating an existing product.
 * NOTE: stock and initialStock are strictly excluded.
 * Stock mutations must only be recorded through the Inventory module.
 */
export const updateProductSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Product name must be at least 2 characters')
    .max(100, 'Product name must not exceed 100 characters')
    .optional(),
  sku: z
    .string()
    .trim()
    .min(2, 'SKU must be at least 2 characters')
    .max(50, 'SKU must not exceed 50 characters')
    .regex(/^[A-Za-z0-9-_.]+$/, 'SKU may only contain letters, numbers, hyphens, periods, and underscores')
    .transform((val) => val.toUpperCase())
    .optional(),
  barcode: z
    .string()
    .trim()
    .max(50, 'Barcode must not exceed 50 characters')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  description: z
    .string()
    .trim()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  categoryId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  costPrice: z
    .coerce
    .number({ message: 'Purchase price must be a valid number' })
    .min(0, 'Purchase price cannot be negative')
    .optional(),
  purchasePrice: z
    .coerce
    .number()
    .min(0, 'Purchase price cannot be negative')
    .optional()
    .nullable(),
  sellingPrice: z
    .coerce
    .number({ message: 'Selling price must be a valid number' })
    .min(0, 'Selling price cannot be negative')
    .optional(),
  minStockAlert: z
    .coerce
    .number()
    .int('Minimum stock alert must be an integer')
    .min(0, 'Minimum stock cannot be negative')
    .optional(),
  unit: z
    .string()
    .trim()
    .min(1, 'Unit must not be empty')
    .max(20, 'Unit must not exceed 20 characters')
    .optional(),
  imageUrl: z
    .string()
    .trim()
    .max(500, 'Image URL must not exceed 500 characters')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
  isActive: z.boolean().optional(),
});

/**
 * Query schema for listing products with filtering and pagination
 */
export const productQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  status: z.enum(['all', 'active', 'inactive']).optional().default('all'),
  stockStatus: z.enum(['all', 'low-stock', 'out-of-stock', 'in-stock']).optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(10),
  sortBy: z.enum(['name', 'stock', 'sellingPrice', 'costPrice', 'createdAt', 'updatedAt']).optional().default('name'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type CreateProductInput = z.input<typeof createProductSchema>;
export type CreateProductOutput = z.output<typeof createProductSchema>;
export type UpdateProductInput = z.input<typeof updateProductSchema>;
export type UpdateProductOutput = z.output<typeof updateProductSchema>;
export type ProductQueryInput = z.input<typeof productQuerySchema>;
export type ProductQueryOutput = z.output<typeof productQuerySchema>;
