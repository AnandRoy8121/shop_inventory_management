import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/server/db/prisma';
import { productService } from '../src/services/product.service';
import { categoryService } from '../src/services/category.service';
import { createProductSchema, updateProductSchema } from '../src/schemas/product.schema';
import { ConflictError, NotFoundError, DomainError, ProductDeactivatedError } from '../src/lib/errors';
import { SaleService } from '../src/server/services/sale.service';
import { MovementType, PaymentMethod } from '@prisma/client';

describe('Product Management Domain Service & Schemas', () => {
  let testUserId: string;
  let testCategoryId: string;
  const createdProductIds: string[] = [];

  beforeAll(async () => {
    // Obtain admin user
    const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!user) throw new Error('Seeded admin user required for product tests');
    testUserId = user.id;

    // Create a dedicated test category
    const category = await categoryService.createCategory(
      {
        name: `Product Test Category ${Date.now()}`,
        description: 'Test category for product management suite',
        isActive: true,
      },
      testUserId
    );
    testCategoryId = category.id;
  });

  afterAll(async () => {
    // Cleanup products and inventory movements created
    for (const pid of createdProductIds) {
      await prisma.inventoryMovement.deleteMany({ where: { productId: pid } });
      await prisma.saleItem.deleteMany({ where: { productId: pid } });
      await prisma.product.deleteMany({ where: { id: pid } });
    }
    if (testCategoryId) {
      await prisma.category.deleteMany({ where: { id: testCategoryId } });
    }
    await prisma.$disconnect();
  });

  describe('Zod Validation Schemas', () => {
    it('validates correct product creation input', () => {
      const valid = createProductSchema.safeParse({
        name: 'Ergonomic Mechanical Keyboard',
        sku: 'KB-MECH-001',
        costPrice: 45.0,
        sellingPrice: 89.99,
        initialStock: 25,
        minStockAlert: 5,
        unit: 'pcs',
        isActive: true,
      });
      expect(valid.success).toBe(true);
    });

    it('rejects product with missing name', () => {
      const invalid = createProductSchema.safeParse({
        name: '',
        sku: 'KB-TEST-002',
        costPrice: 10,
        sellingPrice: 20,
      });
      expect(invalid.success).toBe(false);
    });

    it('rejects negative cost price or negative selling price', () => {
      const negativeCost = createProductSchema.safeParse({
        name: 'Invalid Cost Product',
        sku: 'NEG-COST-001',
        costPrice: -15,
        sellingPrice: 25,
      });
      expect(negativeCost.success).toBe(false);

      const negativeSelling = createProductSchema.safeParse({
        name: 'Invalid Selling Product',
        sku: 'NEG-SELL-001',
        costPrice: 15,
        sellingPrice: -5,
      });
      expect(negativeSelling.success).toBe(false);
    });

    it('rejects negative initial stock or negative min stock threshold', () => {
      const negativeStock = createProductSchema.safeParse({
        name: 'Negative Stock Product',
        sku: 'NEG-STK-001',
        costPrice: 10,
        sellingPrice: 20,
        initialStock: -10,
      });
      expect(negativeStock.success).toBe(false);

      const negativeAlert = createProductSchema.safeParse({
        name: 'Negative Alert Product',
        sku: 'NEG-ALT-001',
        costPrice: 10,
        sellingPrice: 20,
        minStockAlert: -2,
      });
      expect(negativeAlert.success).toBe(false);
    });

    it('validates partial update schema', () => {
      const valid = updateProductSchema.safeParse({
        name: 'Updated Title Only',
        sellingPrice: 99.5,
      });
      expect(valid.success).toBe(true);
    });
  });

  describe('ProductService Business Logic & Storage Isolation', () => {
    let createdProduct: any;

    it('creates product and atomically initializes stock through an InventoryMovement ledger entry', async () => {
      const sku = `PROD-${Date.now()}-A`;
      const product = await productService.createProduct(
        {
          name: 'Noise-Cancelling Earbuds Pro',
          sku,
          barcode: `BAR-${Date.now()}`,
          categoryId: testCategoryId,
          description: 'High-fidelity audio earbuds with ANC',
          costPrice: 30.0,
          sellingPrice: 65.0,
          initialStock: 12,
          minStockAlert: 4,
          unit: 'pcs',
          isActive: true,
        },
        testUserId
      );

      expect(product.id).toBeDefined();
      expect(product.sku).toBe(sku);
      expect(product.stock).toBe(12);
      createdProduct = product;
      createdProductIds.push(product.id);

      // Verify that an explicit PURCHASE / INITIAL_STOCK movement was created
      const movement = await prisma.inventoryMovement.findFirst({
        where: {
          productId: product.id,
          referenceType: 'INITIAL_STOCK',
        },
      });

      expect(movement).toBeDefined();
      expect(movement?.type).toBe(MovementType.PURCHASE);
      expect(movement?.quantityChange).toBe(12);
      expect(movement?.stockBefore).toBe(0);
      expect(movement?.stockAfter).toBe(12);
    });

    it('prevents creating duplicate SKUs (case-insensitive check)', async () => {
      await expect(
        productService.createProduct(
          {
            name: 'Duplicate SKU Attempt',
            sku: createdProduct.sku.toLowerCase(),
            costPrice: 10,
            sellingPrice: 20,
          },
          testUserId
        )
      ).rejects.toThrow(ConflictError);
    });

    it('rejects product creation with non-existent categoryId', async () => {
      await expect(
        productService.createProduct(
          {
            name: 'Orphan Category Product',
            sku: `ORPHAN-${Date.now()}`,
            categoryId: 'non-existent-cat-id',
            costPrice: 10,
            sellingPrice: 20,
          },
          testUserId
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('updates product catalog details without modifying stock balance', async () => {
      const updated = await productService.updateProduct(
        createdProduct.id,
        {
          name: 'Noise-Cancelling Earbuds Pro (Gen 2)',
          sellingPrice: 69.99,
          // Attempting to pass stock fields must be stripped/ignored
          ...({ stock: 999, initialStock: 500 } as any),
        },
        testUserId
      );

      expect(updated.name).toBe('Noise-Cancelling Earbuds Pro (Gen 2)');
      expect(Number(updated.sellingPrice)).toBe(69.99);

      // Stock must remain unchanged at 12!
      const refreshed = await prisma.product.findUnique({ where: { id: createdProduct.id } });
      expect(refreshed?.stock).toBe(12);
    });

    it('deactivates product and prevents it from being sold at checkout', async () => {
      // 1. Deactivate product
      const deactivated = await productService.deactivateProduct(createdProduct.id, testUserId);
      expect(deactivated.isActive).toBe(false);
      expect(deactivated.deletedAt).not.toBeNull();

      // 2. assertCanBeSold rejects
      await expect(productService.assertCanBeSold(createdProduct.id)).rejects.toThrow(DomainError);

      // 3. SaleService.createSale rejects checkout
      await expect(
        SaleService.createSale({
          userId: testUserId,
          paymentMethod: PaymentMethod.CASH,
          items: [{ productId: createdProduct.id, quantity: 1 }],
        })
      ).rejects.toThrow(ProductDeactivatedError);
    });

    it('reactivates product and restores sales eligibility', async () => {
      const reactivated = await productService.reactivateProduct(createdProduct.id, testUserId);
      expect(reactivated.isActive).toBe(true);
      expect(reactivated.deletedAt).toBeNull();

      // assertCanBeSold now passes
      const validated = await productService.assertCanBeSold(createdProduct.id);
      expect(validated.id).toBe(createdProduct.id);
    });

    it('retrieves detailed product info with movement history', async () => {
      const detail = await productService.getProductById(createdProduct.id);
      expect(detail.id).toBe(createdProduct.id);
      expect(detail.category).toBeDefined();
      expect(detail.category?.id).toBe(testCategoryId);
      expect(detail.movements.length).toBeGreaterThanOrEqual(1);
      expect(detail.movements[0].type).toBe(MovementType.PURCHASE);
    });

    it('filters products by category, stockStatus, and keyword search', async () => {
      // Create a zero-stock product
      const outOfStockProd = await productService.createProduct(
        {
          name: 'Zero Stock Peripheral',
          sku: `OUT-${Date.now()}`,
          categoryId: testCategoryId,
          costPrice: 5,
          sellingPrice: 15,
          initialStock: 0,
        },
        testUserId
      );
      createdProductIds.push(outOfStockProd.id);

      // 1. Filter by category
      const byCategory = await productService.listProducts({
        categoryId: testCategoryId,
      });
      expect(byCategory.items.some((p) => p.id === createdProduct.id)).toBe(true);

      // 2. Filter out-of-stock
      const outOfStockList = await productService.listProducts({
        categoryId: testCategoryId,
        stockStatus: 'out-of-stock',
      });
      expect(outOfStockList.items.some((p) => p.id === outOfStockProd.id)).toBe(true);
      expect(outOfStockList.items.some((p) => p.id === createdProduct.id)).toBe(false);

      // 3. Search query
      const searchResult = await productService.listProducts({
        search: 'Earbuds Pro',
      });
      expect(searchResult.items.some((p) => p.id === createdProduct.id)).toBe(true);
    });
  });
});
