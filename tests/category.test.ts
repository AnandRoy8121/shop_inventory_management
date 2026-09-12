import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../src/server/db/prisma';
import { categoryService } from '../src/services/category.service';
import { createCategorySchema, updateCategorySchema } from '../src/schemas/category.schema';
import { ConflictError, NotFoundError } from '../src/lib/errors';

describe('Category Management Service & Schema Integration', () => {
  let testUserId: string;
  let createdCategoryId: string;
  let categoryWithProductId: string;
  let testProductId: string;

  beforeAll(async () => {
    // Obtain seeded admin user for audit log references
    const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!user) throw new Error('Seeded admin user required for category tests');
    testUserId = user.id;

    // Create a temporary category with an active product to test constraints
    const catWithProduct = await categoryService.createCategory(
      {
        name: `Protected Category ${Date.now()}`,
        description: 'Category holding active product for constraint checks',
        isActive: true,
      },
      testUserId
    );
    categoryWithProductId = catWithProduct.id;

    // Attach an active product to this category
    const product = await prisma.product.create({
      data: {
        name: 'Constraint Test Product',
        sku: `CAT-TEST-SKU-${Date.now()}`,
        costPrice: 10.0,
        sellingPrice: 20.0,
        stock: 15,
        minStockAlert: 2,
        categoryId: categoryWithProductId,
        isActive: true,
      },
    });
    testProductId = product.id;
  });

  afterAll(async () => {
    // Clean up created test entities
    if (testProductId) {
      await prisma.product.deleteMany({ where: { id: testProductId } });
    }
    if (categoryWithProductId) {
      await prisma.category.deleteMany({ where: { id: categoryWithProductId } });
    }
    if (createdCategoryId) {
      await prisma.category.deleteMany({ where: { id: createdCategoryId } });
    }
    await prisma.$disconnect();
  });

  describe('Zod Validation Schemas', () => {
    it('validates correct category creation input', () => {
      const valid = createCategorySchema.safeParse({
        name: 'Sporting Goods',
        description: 'Outdoor, fitness and sports merchandise',
        isActive: true,
      });
      expect(valid.success).toBe(true);
    });

    it('rejects category with empty name', () => {
      const invalid = createCategorySchema.safeParse({
        name: '',
      });
      expect(invalid.success).toBe(false);
    });

    it('rejects category name exceeding 50 characters', () => {
      const invalid = createCategorySchema.safeParse({
        name: 'A'.repeat(51),
      });
      expect(invalid.success).toBe(false);
    });

    it('validates partial update schema', () => {
      const valid = updateCategorySchema.safeParse({
        name: 'Updated Name',
      });
      expect(valid.success).toBe(true);

      const validToggle = updateCategorySchema.safeParse({
        isActive: false,
      });
      expect(validToggle.success).toBe(true);
    });
  });

  describe('CategoryService Business Logic', () => {
    it('successfully creates a new category and retrieves it with counts', async () => {
      const uniqueName = `Stationery Novelties ${Date.now()}`;
      const category = await categoryService.createCategory(
        {
          name: uniqueName,
          description: 'Specialty pens, notebooks, and novelties',
          isActive: true,
        },
        testUserId
      );

      expect(category.id).toBeDefined();
      expect(category.name).toBe(uniqueName);
      expect(category.isActive).toBe(true);
      createdCategoryId = category.id;

      // Verify list returns this category with productCount = 0
      const list = await categoryService.listCategories(uniqueName);
      const found = list.find((c) => c.id === category.id);
      expect(found).toBeDefined();
      expect(found?.productCount).toBe(0);
      expect(found?.activeProductCount).toBe(0);
    });

    it('prevents duplicate category names (case-insensitive check)', async () => {
      const existing = await categoryService.getCategoryById(createdCategoryId);

      // Attempt to create category with same name in lowercase
      await expect(
        categoryService.createCategory(
          {
            name: existing.name.toLowerCase(),
            description: 'Duplicate attempt',
          },
          testUserId
        )
      ).rejects.toThrow(ConflictError);
    });

    it('updates category name and description', async () => {
      const updatedName = `Renamed Category ${Date.now()}`;
      const updated = await categoryService.updateCategory(
        createdCategoryId,
        {
          name: updatedName,
          description: 'Updated description for test category',
        },
        testUserId
      );

      expect(updated.name).toBe(updatedName);
      expect(updated.description).toBe('Updated description for test category');
    });

    it('prevents deactivating a category that contains active products', async () => {
      await expect(
        categoryService.updateCategory(
          categoryWithProductId,
          {
            isActive: false,
          },
          testUserId
        )
      ).rejects.toThrow(ConflictError);
    });

    it('prevents deleting a category that contains active products', async () => {
      await expect(
        categoryService.deleteCategory(categoryWithProductId, testUserId)
      ).rejects.toThrow(ConflictError);
    });

    it('allows deactivating a category with zero active products', async () => {
      const deactivated = await categoryService.updateCategory(
        createdCategoryId,
        {
          isActive: false,
        },
        testUserId
      );
      expect(deactivated.isActive).toBe(false);

      // Reactivate it
      const reactivated = await categoryService.toggleStatus(createdCategoryId, true, testUserId);
      expect(reactivated.isActive).toBe(true);
    });

    it('successfully deletes an empty category without active products', async () => {
      // Create an ephemeral category with 0 products
      const emptyCat = await categoryService.createCategory(
        {
          name: `Empty For Deletion ${Date.now()}`,
          description: 'To be safely deleted',
          isActive: true,
        },
        testUserId
      );

      const deleted = await categoryService.deleteCategory(emptyCat.id, testUserId);
      expect(deleted.id).toBe(emptyCat.id);

      // Verify it no longer exists
      await expect(categoryService.getCategoryById(emptyCat.id)).rejects.toThrow(NotFoundError);
    });
  });
});
