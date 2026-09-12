import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/server/db/prisma';
import { SaleService } from '../src/server/services/sale.service';
import { ProductService } from '../src/server/services/product.service';
import { MovementType, PaymentMethod, SaleStatus } from '@prisma/client';
import { InsufficientStockError } from '../src/lib/errors';

describe('Inventory & Sales Domain Service Integration', () => {
  let testUserId: string;
  let testProductId: string;

  beforeAll(async () => {
    // Get seeded admin user
    const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!user) throw new Error('Seeded user required for integration tests');
    testUserId = user.id;

    // Create a designated test product
    const product = await ProductService.createProduct(
      {
        name: 'Vitest Integration Gadget',
        sku: `TEST-GADGET-${Date.now()}`,
        costPrice: 20.0,
        sellingPrice: 50.0,
        stock: 10,
        minStockAlert: 2,
        isActive: true,
      },
      testUserId
    );
    testProductId = product.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.inventoryMovement.deleteMany({ where: { productId: testProductId } });
    await prisma.saleItem.deleteMany({ where: { productId: testProductId } });
    await prisma.product.deleteMany({ where: { id: testProductId } });
    await prisma.$disconnect();
  });

  it('atomically creates a sale, deducts stock, and logs an InventoryMovement', async () => {
    const sale = await SaleService.createSale({
      userId: testUserId,
      paymentMethod: PaymentMethod.CASH,
      items: [{ productId: testProductId, quantity: 3 }],
    });

    expect(sale.id).toBeDefined();
    expect(sale.status).toBe(SaleStatus.COMPLETED);
    expect(sale.items.length).toBe(1);
    expect(sale.items[0].quantity).toBe(3);

    // Verify stock is decremented from 10 to 7
    const productAfter = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(productAfter?.stock).toBe(7);

    // Verify movement record exists with before=10 and after=7
    const movement = await prisma.inventoryMovement.findFirst({
      where: { saleId: sale.id, productId: testProductId },
    });
    expect(movement).toBeDefined();
    expect(movement?.quantityChange).toBe(-3);
    expect(movement?.stockBefore).toBe(10);
    expect(movement?.stockAfter).toBe(7);
    expect(movement?.type).toBe(MovementType.SALE);
  });

  it('rejects checkout when requested quantity exceeds available stock and rolls back completely', async () => {
    // Current stock is 7, request 100
    await expect(
      SaleService.createSale({
        userId: testUserId,
        paymentMethod: PaymentMethod.CARD,
        items: [{ productId: testProductId, quantity: 100 }],
      })
    ).rejects.toThrow(InsufficientStockError);

    // Verify stock remained unchanged at 7
    const productAfter = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(productAfter?.stock).toBe(7);
  });

  it('safely cancels a completed sale, restores stock, and logs a SALE_REVERSAL movement', async () => {
    // Create a 2-unit sale (stock becomes 5)
    const sale = await SaleService.createSale({
      userId: testUserId,
      paymentMethod: PaymentMethod.CASH,
      items: [{ productId: testProductId, quantity: 2 }],
    });

    const midProduct = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(midProduct?.stock).toBe(5);

    // Cancel sale
    const cancelled = await SaleService.cancelSale({
      saleId: sale.id,
      cancelledById: testUserId,
      cancellationReason: 'Customer requested immediate exchange',
    });

    expect(cancelled.status).toBe(SaleStatus.CANCELLED);
    expect(cancelled.cancellationReason).toBe('Customer requested immediate exchange');

    // Stock should be restored back to 7
    const restoredProduct = await prisma.product.findUnique({ where: { id: testProductId } });
    expect(restoredProduct?.stock).toBe(7);

    // Verify SALE_REVERSAL movement
    const reversalMovement = await prisma.inventoryMovement.findFirst({
      where: {
        productId: testProductId,
        type: MovementType.SALE_REVERSAL,
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(reversalMovement).toBeDefined();
    expect(reversalMovement?.quantityChange).toBe(2);
    expect(reversalMovement?.stockBefore).toBe(5);
    expect(reversalMovement?.stockAfter).toBe(7);
  });
});
