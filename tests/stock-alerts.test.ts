import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/server/db/prisma';
import { SaleService } from '../src/server/services/sale.service';
import { ProductService } from '../src/server/services/product.service';
import { PaymentMethod } from '@prisma/client';
import { InsufficientStockError } from '../src/lib/errors';

describe('Low-Stock and Out-of-Stock Alert System', () => {
  let testUserId: string;
  let testProduct1Id: string;
  let testProduct2Id: string;

  beforeAll(async () => {
    // Get seeded admin user
    const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!user) throw new Error('Seeded user required for alert tests');
    testUserId = user.id;

    // Create test product 1: 5 in stock, minStockAlert = 5
    // Selling 2 leaves 3, which is <= 5, so it triggers a LOW_STOCK alert.
    const p1 = await ProductService.createProduct(
      {
        name: 'Alert Test Cola 500ml',
        sku: `ALERT-COLA-${Date.now()}`,
        costPrice: 1.0,
        sellingPrice: 2.5,
        stock: 5,
        minStockAlert: 5,
        isActive: true,
      },
      testUserId
    );
    testProduct1Id = p1.id;

    // Create test product 2: 2 in stock, minStockAlert = 3
    // Selling 2 leaves 0, triggering an OUT_OF_STOCK alert.
    const p2 = await ProductService.createProduct(
      {
        name: 'Alert Test Chips 100g',
        sku: `ALERT-CHIPS-${Date.now()}`,
        costPrice: 0.8,
        sellingPrice: 1.8,
        stock: 2,
        minStockAlert: 3,
        isActive: true,
      },
      testUserId
    );
    testProduct2Id = p2.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.inventoryMovement.deleteMany({
      where: { productId: { in: [testProduct1Id, testProduct2Id] } },
    });
    await prisma.saleItem.deleteMany({
      where: { productId: { in: [testProduct1Id, testProduct2Id] } },
    });
    await prisma.product.deleteMany({
      where: { id: { in: [testProduct1Id, testProduct2Id] } },
    });
    await prisma.$disconnect();
  });

  it('allows a sale when product is at or below threshold without blocking, and returns a LOW_STOCK alert', async () => {
    // Product 1: Available = 5, Requested = 2, Threshold = 5
    // Non-blocking rule: Sale must succeed!
    // Remaining = 3 (<= 5), so alert is emitted.
    const sale = await SaleService.createSale({
      userId: testUserId,
      paymentMethod: PaymentMethod.CASH,
      items: [{ productId: testProduct1Id, quantity: 2 }],
    });

    expect(sale.id).toBeDefined();
    expect(sale.alerts).toBeDefined();
    expect(sale.alerts.length).toBe(1);

    const alert = sale.alerts[0];
    expect(alert.productId).toBe(testProduct1Id);
    expect(alert.alertType).toBe('LOW_STOCK');
    expect(alert.remainingStock).toBe(3);
    expect(alert.minStockAlert).toBe(5);
    expect(alert.message).toContain('Low stock: Alert Test Cola 500ml has only 3 units remaining.');

    // Confirm database stock balance is 3
    const p1 = await prisma.product.findUnique({ where: { id: testProduct1Id } });
    expect(p1?.stock).toBe(3);
  });

  it('allows a sale driving stock to zero and returns an OUT_OF_STOCK alert', async () => {
    // Product 2: Available = 2, Requested = 2
    // Sale succeeds and remaining stock becomes 0
    const sale = await SaleService.createSale({
      userId: testUserId,
      paymentMethod: PaymentMethod.CARD,
      items: [{ productId: testProduct2Id, quantity: 2 }],
    });

    expect(sale.id).toBeDefined();
    expect(sale.alerts.length).toBe(1);

    const alert = sale.alerts[0];
    expect(alert.productId).toBe(testProduct2Id);
    expect(alert.alertType).toBe('OUT_OF_STOCK');
    expect(alert.remainingStock).toBe(0);
    expect(alert.message).toContain('Out of stock: Alert Test Chips 100g can no longer be sold.');

    // Confirm database stock balance is 0
    const p2 = await prisma.product.findUnique({ where: { id: testProduct2Id } });
    expect(p2?.stock).toBe(0);
  });

  it('blocks sale ONLY when requested quantity exceeds available stock', async () => {
    // Product 1 currently has 3 in stock. Requesting 5 must be blocked with InsufficientStockError.
    await expect(
      SaleService.createSale({
        userId: testUserId,
        paymentMethod: PaymentMethod.CASH,
        items: [{ productId: testProduct1Id, quantity: 5 }],
      })
    ).rejects.toThrow(InsufficientStockError);

    // Stock must remain unchanged at 3
    const p1 = await prisma.product.findUnique({ where: { id: testProduct1Id } });
    expect(p1?.stock).toBe(3);
  });

  it('does not emit alert when remaining stock remains strictly above minimum threshold', async () => {
    // Create a product with high stock: 50, minAlert: 5
    const highStockProduct = await ProductService.createProduct(
      {
        name: 'High Stock Biscuits',
        sku: `ALERT-HIGH-${Date.now()}`,
        costPrice: 1.0,
        sellingPrice: 3.0,
        stock: 50,
        minStockAlert: 5,
        isActive: true,
      },
      testUserId
    );

    try {
      const sale = await SaleService.createSale({
        userId: testUserId,
        paymentMethod: PaymentMethod.CASH,
        items: [{ productId: highStockProduct.id, quantity: 5 }],
      });

      expect(sale.id).toBeDefined();
      expect(sale.alerts.length).toBe(0);
    } finally {
      await prisma.inventoryMovement.deleteMany({ where: { productId: highStockProduct.id } });
      await prisma.saleItem.deleteMany({ where: { productId: highStockProduct.id } });
      await prisma.product.deleteMany({ where: { id: highStockProduct.id } });
    }
  });

  it('deduplicates alerts when a product appears in multiple item rows or batches', async () => {
    // Product 1 has 3 in stock. Sell 1. Remaining is 2 (still <= 5).
    const sale = await SaleService.createSale({
      userId: testUserId,
      paymentMethod: PaymentMethod.CASH,
      items: [{ productId: testProduct1Id, quantity: 1 }],
    });

    const matchingAlerts = sale.alerts.filter((a) => a.productId === testProduct1Id);
    expect(matchingAlerts.length).toBe(1);
    expect(matchingAlerts[0].remainingStock).toBe(2);
  });

  it('ProductService.getStockAlerts correctly groups out-of-stock and low-stock items', async () => {
    const alerts = await ProductService.getStockAlerts();

    // Product 2 is out of stock (stock = 0)
    const foundOut = alerts.outOfStock.find((p) => p.id === testProduct2Id);
    expect(foundOut).toBeDefined();
    expect(foundOut?.stock).toBe(0);

    // Product 1 is low stock (stock = 2 <= minStockAlert 5, stock > 0)
    const foundLow = alerts.lowStock.find((p) => p.id === testProduct1Id);
    expect(foundLow).toBeDefined();
    expect(foundLow?.stock).toBe(2);
  });
});
