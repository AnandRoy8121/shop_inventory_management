import { describe, it, expect } from 'vitest';
import {
  productSchema,
  stockAdjustmentSchema,
  checkoutSaleSchema,
} from '../src/types/schemas';
import { MovementType, PaymentMethod } from '@prisma/client';

describe('Validation Schemas & Boundary Rules', () => {
  it('validates product creation schema', () => {
    const valid = productSchema.safeParse({
      name: 'Wireless Mouse',
      sku: 'W-MOUSE-01',
      costPrice: 15.0,
      sellingPrice: 29.99,
      stock: 10,
      minStockAlert: 3,
      isActive: true,
    });
    expect(valid.success).toBe(true);

    const invalidSku = productSchema.safeParse({
      name: 'Wireless Mouse',
      sku: 'Invalid SKU with spaces!',
      costPrice: 15.0,
      sellingPrice: 29.99,
    });
    expect(invalidSku.success).toBe(false);

    const negativePrice = productSchema.safeParse({
      name: 'Wireless Mouse',
      sku: 'W-MOUSE-02',
      costPrice: -10,
      sellingPrice: 29.99,
    });
    expect(negativePrice.success).toBe(false);
  });

  it('validates stock adjustment schemas and prevents zero quantity', () => {
    const valid = stockAdjustmentSchema.safeParse({
      productId: 'prod-123',
      type: MovementType.PURCHASE,
      quantityChange: 15,
      reason: 'Supplier shipment',
    });
    expect(valid.success).toBe(true);

    const zeroQuantity = stockAdjustmentSchema.safeParse({
      productId: 'prod-123',
      type: MovementType.PURCHASE,
      quantityChange: 0,
      reason: 'Supplier shipment',
    });
    expect(zeroQuantity.success).toBe(false);

    const shortReason = stockAdjustmentSchema.safeParse({
      productId: 'prod-123',
      type: MovementType.MANUAL_ADJUSTMENT,
      quantityChange: -2,
      reason: 'no', // Too short (< 3 chars)
    });
    expect(shortReason.success).toBe(false);
  });

  it('validates sale checkout schemas', () => {
    const valid = checkoutSaleSchema.safeParse({
      paymentMethod: PaymentMethod.CASH,
      discountAmount: 5.0,
      items: [{ productId: 'prod-1', quantity: 2 }],
    });
    expect(valid.success).toBe(true);

    const emptyItems = checkoutSaleSchema.safeParse({
      paymentMethod: PaymentMethod.CASH,
      items: [],
    });
    expect(emptyItems.success).toBe(false);

    const negativeQty = checkoutSaleSchema.safeParse({
      paymentMethod: PaymentMethod.CASH,
      items: [{ productId: 'prod-1', quantity: -1 }],
    });
    expect(negativeQty.success).toBe(false);
  });
});
