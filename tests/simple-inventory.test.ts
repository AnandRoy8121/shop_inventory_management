import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/lib/prisma';
import { ProductService } from '../src/services/product.service';
import { InventoryService } from '../src/services/inventory.service';
import { SaleService } from '../src/services/sale.service';
import { ReportService, parseDateRange } from '../src/services/report.service';
import { generateCsv } from '../src/lib/export-csv';

describe('Simple Shop Inventory Management Integration Tests', () => {
  let categoryId: string;
  let testProductId: string;
  let lowStockProductId: string;

  beforeAll(async () => {
    // Create test category
    const cat = await prisma.category.create({
      data: { name: `Test-Category-${Date.now()}` },
    });
    categoryId = cat.id;

    // Create test product 1: 10 in stock, minStock = 5
    const p1 = await ProductService.createProduct({
      name: 'Integration Test Juice 1L',
      categoryId,
      purchasePrice: 2.0,
      sellingPrice: 5.0,
      stock: 10,
      minStock: 5,
      isActive: true,
    });
    testProductId = p1.id;

    // Create test product 2: 3 in stock, minStock = 5 (starts in low stock)
    const p2 = await ProductService.createProduct({
      name: 'Integration Test Cookie 100g',
      categoryId,
      purchasePrice: 1.0,
      sellingPrice: 3.0,
      stock: 3,
      minStock: 5,
      isActive: true,
    });
    lowStockProductId = p2.id;
  });

  afterAll(async () => {
    // Clean up
    await prisma.saleItem.deleteMany({
      where: { productId: { in: [testProductId, lowStockProductId] } },
    });
    await prisma.product.deleteMany({
      where: { id: { in: [testProductId, lowStockProductId] } },
    });
    await prisma.category.deleteMany({
      where: { id: categoryId },
    });
    await prisma.$disconnect();
  });

  describe('Product Management', () => {
    it('creates, edits, and toggles product status', async () => {
      // Edit product
      const updated = await ProductService.updateProduct(testProductId, {
        sellingPrice: 5.5,
      });
      expect(Number(updated.sellingPrice)).toBe(5.5);

      // Toggle deactivate
      const toggled = await ProductService.toggleActive(testProductId);
      expect(toggled.isActive).toBe(false);

      // Reactivate
      const reactivated = await ProductService.toggleActive(testProductId);
      expect(reactivated.isActive).toBe(true);
    });
  });

  describe('Inventory Management', () => {
    it('adds stock and updates inventory count', async () => {
      // Add 5 units (stock becomes 15)
      const afterAdd = await InventoryService.addStock(testProductId, 5);
      expect(afterAdd.stock).toBe(15);

      // Set stock directly to 20
      const afterSet = await InventoryService.updateStock(testProductId, 20);
      expect(afterSet.stock).toBe(20);

      // Reject negative stock update
      await expect(InventoryService.updateStock(testProductId, -5)).rejects.toThrow();
    });

    it('identifies low-stock products correctly', async () => {
      const lowStockList = await InventoryService.getLowStockProducts();
      const found = lowStockList.find((p) => p.id === lowStockProductId);
      expect(found).toBeDefined();
      expect(found?.stock).toBe(3);
      expect(found?.stock).toBeLessThanOrEqual(found?.minStock!);
    });

    it('calculates inventory valuation accurately', async () => {
      const summary = await InventoryService.getInventorySummary();
      expect(summary.totalStockUnits).toBeGreaterThan(0);
      expect(summary.inventoryValuation).toBeGreaterThan(0);
      expect(summary.lowStockCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Sales & Atomic Stock Deduction', () => {
    it('records sale, deducts inventory automatically, and calculates profit', async () => {
      // Current stock of testProductId is 20
      const { sale, warnings } = await SaleService.recordSale([
        { productId: testProductId, quantity: 4 },
      ]);

      expect(sale.id).toBeDefined();
      expect(sale.saleNumber).toContain('SALE-');
      expect(Number(sale.totalAmount)).toBe(22.0); // 4 * 5.5
      expect(Number(sale.totalCost)).toBe(8.0); // 4 * 2.0
      expect(Number(sale.profit)).toBe(14.0); // 22.0 - 8.0

      // Verify stock was automatically decremented to 16
      const product = await prisma.product.findUnique({ where: { id: testProductId } });
      expect(product?.stock).toBe(16);

      // No low stock warning because 16 > 5
      expect(warnings.length).toBe(0);
    });

    it('strictly prevents inventory from becoming negative (over-selling guard)', async () => {
      // Product 1 has 16 stock. Requesting 50 must fail and rollback!
      await expect(
        SaleService.recordSale([{ productId: testProductId, quantity: 50 }])
      ).rejects.toThrow(/Insufficient stock/);

      // Stock must remain unchanged at 16
      const product = await prisma.product.findUnique({ where: { id: testProductId } });
      expect(product?.stock).toBe(16);
    });

    it('shows low-stock and out-of-stock warnings after sale drives stock to or below threshold', async () => {
      // Product 2 currently has 3 stock, minStock = 5.
      // Selling 3 units drives it to 0 (out of stock).
      const { sale, warnings } = await SaleService.recordSale([
        { productId: lowStockProductId, quantity: 3 },
      ]);

      expect(sale.id).toBeDefined();
      expect(warnings.length).toBe(1);
      expect(warnings[0].productId).toBe(lowStockProductId);
      expect(warnings[0].isOutOfStock).toBe(true);
      expect(warnings[0].remainingStock).toBe(0);
      expect(warnings[0].message).toContain('Out of stock');

      // Database verification
      const p2 = await prisma.product.findUnique({ where: { id: lowStockProductId } });
      expect(p2?.stock).toBe(0);
    });
  });

  describe('Reports & CSV Generation', () => {
    it('aggregates dashboard metrics over date range', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const metrics = await ReportService.getDashboardMetrics(start, end);
      expect(metrics.totalSales).toBeGreaterThanOrEqual(2);
      expect(metrics.totalProductsSold).toBeGreaterThan(0);
      expect(metrics.totalProductsAdded).toBeGreaterThanOrEqual(0);
      expect(metrics.inventorySummary).toBeDefined();
    });

    it('tracks added inventory/product inwards and produces added inventory report', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const report = await ReportService.getAddedInventoryReport(start, end);
      expect(report.totalIntakes).toBeGreaterThan(0);
      expect(report.totalUnitsAdded).toBeGreaterThan(0);
      expect(report.items.length).toBeGreaterThan(0);
      expect(report.items[0]).toHaveProperty('inwardNumber');
      expect(report.items[0]).toHaveProperty('productName');
      expect(report.items[0]).toHaveProperty('quantity');
      expect(report.items[0]).toHaveProperty('createdAt');
    });

    it('generates standard RFC 4180 CSV strings correctly', () => {
      const headers = ['Product', 'Stock'];
      const rows = [
        ['Test "Quoted" Item', 10],
        ['Regular Item, with comma', 20],
      ];

      const csv = generateCsv(headers, rows);
      expect(csv).toContain('"Product","Stock"');
      expect(csv).toContain('"Test ""Quoted"" Item"');
      expect(csv).toContain('"Regular Item, with comma"');
    });
  });
});
