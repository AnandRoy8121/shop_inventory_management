import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/server/db/prisma';
import { inventoryService } from '../src/services/inventory.service';
import { productService } from '../src/services/product.service';
import { stockAdjustmentSchema } from '../src/schemas/inventory.schema';
import { InsufficientStockError, NotFoundError, DomainError } from '../src/lib/errors';
import { MovementType } from '@prisma/client';

describe('Inventory Service Domain & Adjustment Invariants', () => {
  let testUserId: string;
  let testProductId: string;
  let deactivatedProductId: string;

  beforeAll(async () => {
    // Admin user for audit reference
    const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!user) throw new Error('Seeded admin user required for inventory tests');
    testUserId = user.id;

    // Create an active product with initial stock = 20
    const product = await productService.createProduct(
      {
        name: 'Inventory Test Widget',
        sku: `INV-WIDGET-${Date.now()}`,
        costPrice: 15.0,
        sellingPrice: 35.0,
        initialStock: 20,
        minStockAlert: 5,
        unit: 'pcs',
        isActive: true,
      },
      testUserId
    );
    testProductId = product.id;

    // Create a deactivated product for inactive test
    const deactivatedProd = await productService.createProduct(
      {
        name: 'Deactivated Test Widget',
        sku: `INV-DEACT-${Date.now()}`,
        costPrice: 10.0,
        sellingPrice: 20.0,
        initialStock: 10,
        minStockAlert: 2,
        unit: 'pcs',
        isActive: true,
      },
      testUserId
    );
    await productService.deactivateProduct(deactivatedProd.id, testUserId);
    deactivatedProductId = deactivatedProd.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.inventoryMovement.deleteMany({
      where: { productId: { in: [testProductId, deactivatedProductId] } },
    });
    await prisma.product.deleteMany({
      where: { id: { in: [testProductId, deactivatedProductId] } },
    });
    await prisma.$disconnect();
  });

  describe('Zod Validation Schemas', () => {
    it('validates correct stock adjustment input', () => {
      const valid = stockAdjustmentSchema.safeParse({
        productId: testProductId,
        operation: 'INCREASE',
        quantity: 10,
        reasonCategory: 'supplier_intake',
        reason: 'Restock shipment received from vendor',
      });
      expect(valid.success).toBe(true);
    });

    it('strictly rejects zero quantity', () => {
      const zeroQty = stockAdjustmentSchema.safeParse({
        productId: testProductId,
        operation: 'INCREASE',
        quantity: 0,
        reason: 'Zero quantity attempt',
      });
      expect(zeroQty.success).toBe(false);
    });

    it('strictly rejects negative quantity', () => {
      const negativeQty = stockAdjustmentSchema.safeParse({
        productId: testProductId,
        operation: 'INCREASE',
        quantity: -5,
        reason: 'Negative quantity attempt',
      });
      expect(negativeQty.success).toBe(false);
    });

    it('rejects missing or empty reason', () => {
      const missingReason = stockAdjustmentSchema.safeParse({
        productId: testProductId,
        operation: 'DECREASE',
        quantity: 2,
        reason: '  ',
      });
      expect(missingReason.success).toBe(false);
    });
  });

  describe('Stock Increase & Decrease Invariants', () => {
    it('successfully increases stock and creates a positive ledger entry', async () => {
      const beforeProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      const initialStock = beforeProduct!.stock; // 20

      const result = await inventoryService.increaseStock({
        productId: testProductId,
        quantity: 15,
        reason: 'Supplier shipment intake',
        userId: testUserId,
        referenceId: 'PO-9912',
      });

      expect(result.product.stock).toBe(initialStock + 15);
      expect(result.movement.quantityChange).toBe(15);
      expect(result.movement.stockBefore).toBe(initialStock);
      expect(result.movement.stockAfter).toBe(initialStock + 15);
      expect(result.movement.type).toBe(MovementType.PURCHASE);

      // Verify in database
      const dbProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      expect(dbProduct?.stock).toBe(35);
    });

    it('successfully decreases stock and creates a negative ledger entry', async () => {
      const beforeProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      const currentStock = beforeProduct!.stock; // 35

      const result = await inventoryService.decreaseStock({
        productId: testProductId,
        quantity: 5,
        reason: 'Damaged during unloading',
        userId: testUserId,
        referenceId: 'WRITE-OFF-01',
      });

      expect(result.product.stock).toBe(currentStock - 5);
      expect(result.movement.quantityChange).toBe(-5);
      expect(result.movement.stockBefore).toBe(currentStock);
      expect(result.movement.stockAfter).toBe(currentStock - 5);
      expect(result.movement.type).toBe(MovementType.MANUAL_ADJUSTMENT);

      const dbProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      expect(dbProduct?.stock).toBe(30);
    });

    it('prevents insufficient stock deduction and rolls back transaction completely', async () => {
      const beforeProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      const stockBefore = beforeProduct!.stock; // 30

      // Attempt to deduct 50 units (current is 30)
      await expect(
        inventoryService.decreaseStock({
          productId: testProductId,
          quantity: 50,
          reason: 'Excess deduction test',
          userId: testUserId,
        })
      ).rejects.toThrow(InsufficientStockError);

      // Verify product stock remains exactly 30
      const afterProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      expect(afterProduct?.stock).toBe(stockBefore);
    });

    it('rejects stock adjustment on non-existent product', async () => {
      await expect(
        inventoryService.adjustStock({
          productId: 'non-existent-product-id',
          operation: 'INCREASE',
          quantity: 5,
          reason: 'Non existent test',
          userId: testUserId,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('rejects stock adjustment on deactivated product', async () => {
      await expect(
        inventoryService.adjustStock({
          productId: deactivatedProductId,
          operation: 'INCREASE',
          quantity: 5,
          reason: 'Deactivated adjustment attempt',
          userId: testUserId,
        })
      ).rejects.toThrow(DomainError);
    });

    it('safely handles concurrent stock adjustments without losing updates', async () => {
      const beforeProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      const startStock = beforeProduct!.stock; // 30

      // Run 5 concurrent adjustments: 3 additions (+2 each = +6) and 2 subtractions (-3 each = -6)
      // Net change = 0
      const promises = [
        inventoryService.increaseStock({
          productId: testProductId,
          quantity: 2,
          reason: 'Concurrent add 1',
          userId: testUserId,
        }),
        inventoryService.increaseStock({
          productId: testProductId,
          quantity: 2,
          reason: 'Concurrent add 2',
          userId: testUserId,
        }),
        inventoryService.increaseStock({
          productId: testProductId,
          quantity: 2,
          reason: 'Concurrent add 3',
          userId: testUserId,
        }),
        inventoryService.decreaseStock({
          productId: testProductId,
          quantity: 3,
          reason: 'Concurrent sub 1',
          userId: testUserId,
        }),
        inventoryService.decreaseStock({
          productId: testProductId,
          quantity: 3,
          reason: 'Concurrent sub 2',
          userId: testUserId,
        }),
      ];

      await Promise.all(promises);

      const afterProduct = await prisma.product.findUnique({ where: { id: testProductId } });
      expect(afterProduct?.stock).toBe(startStock);
    });
  });

  describe('Inventory Overview & Movement Ledger Queries', () => {
    it('retrieves aggregate inventory overview metrics with valuation', async () => {
      const overview = await inventoryService.getOverview();

      expect(overview.totalItems).toBeGreaterThanOrEqual(1);
      expect(overview.totalUnits).toBeGreaterThanOrEqual(0);
      expect(overview.totalInventoryValue).toBeGreaterThan(0);
      expect(typeof overview.lowStockCount).toBe('number');
      expect(typeof overview.outOfStockCount).toBe('number');
    });

    it('queries movements for product in chronological order', async () => {
      const movements = await inventoryService.getProductMovements(testProductId, 10);

      expect(movements.length).toBeGreaterThanOrEqual(2);
      expect(movements[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        movements[movements.length - 1].createdAt.getTime()
      );
      expect(movements[0].product.id).toBe(testProductId);
    });
  });
});
