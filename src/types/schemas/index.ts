import { z } from 'zod';
import { PaymentMethod, MovementType } from '@prisma/client';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').max(50),
  description: z.string().max(255).optional(),
  isActive: z.boolean().default(true),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const productSchema = z.object({
  sku: z
    .string()
    .min(2, 'SKU must be at least 2 characters')
    .max(50)
    .regex(/^[A-Za-z0-9-_]+$/, 'SKU may only contain letters, numbers, hyphens and underscores'),
  barcode: z.string().max(50).optional().nullable(),
  name: z.string().min(2, 'Product name must be at least 2 characters').max(100),
  description: z.string().max(500).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  costPrice: z.coerce
    .number()
    .min(0, 'Cost price must be positive')
    .refine((val) => !isNaN(val), 'Invalid cost price'),
  sellingPrice: z.coerce
    .number()
    .min(0.01, 'Selling price must be greater than 0')
    .refine((val) => !isNaN(val), 'Invalid selling price'),
  stock: z.coerce.number().int().min(0, 'Initial stock cannot be negative').default(0),
  minStockAlert: z.coerce.number().int().min(0, 'Alert threshold cannot be negative').default(5),
  isActive: z.boolean().default(true),
});
export type ProductInput = z.infer<typeof productSchema>;

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  type: z.enum([MovementType.PURCHASE, MovementType.MANUAL_ADJUSTMENT, MovementType.RETURN], {
    message: 'Please select a valid adjustment movement type',
  }),
  // For manual adjustments, quantity can be positive (found extra stock) or negative (shrinkage/damaged)
  // For purchase/return, quantity must be positive
  quantityChange: z.coerce
    .number()
    .int()
    .refine((val) => val !== 0, 'Quantity change cannot be zero'),
  reason: z.string().min(3, 'A clear reason of at least 3 characters is required').max(200),
  referenceId: z.string().max(50).optional().nullable(),
});
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

export const checkoutItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
});

export const checkoutSaleSchema = z.object({
  customerId: z.string().optional().nullable(),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  discountAmount: z.coerce.number().min(0).default(0),
  notes: z.string().max(255).optional().nullable(),
  items: z.array(checkoutItemSchema).min(1, 'At least one item is required in the cart'),
});
export type CheckoutSaleInput = z.infer<typeof checkoutSaleSchema>;

export const saleCancelSchema = z.object({
  saleId: z.string().min(1, 'Sale ID is required'),
  reason: z.string().min(5, 'Cancellation reason must be at least 5 characters').max(255),
});
export type SaleCancelInput = z.infer<typeof saleCancelSchema>;

export const shopSettingsSchema = z.object({
  shopName: z.string().min(2, 'Shop name must be at least 2 characters').max(80),
  currencySymbol: z.string().min(1).max(5).default('$'),
  currencyCode: z.string().min(2).max(5).default('USD'),
  taxRatePercent: z.coerce.number().min(0).max(100).default(0),
  invoicePrefix: z.string().min(1).max(10).default('INV'),
  receiptFooter: z.string().max(200).optional().nullable(),
  lowStockDefault: z.coerce.number().int().min(1).default(5),
});
export type ShopSettingsInput = z.infer<typeof shopSettingsSchema>;

export const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  address: z.string().max(200).optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
});
export type CustomerInput = z.infer<typeof customerSchema>;
