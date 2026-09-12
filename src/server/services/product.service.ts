import { Prisma, MovementType } from '@prisma/client';
import prisma from '../db/prisma';
import { NotFoundError, DomainError } from '@/lib/errors';
import { InventoryService } from './inventory.service';
import { AuditService } from './audit.service';
import { ProductInput, CategoryInput } from '@/types/schemas';

export class ProductService {
  /**
   * List products with filters and search
   */
  static async getProducts(params?: {
    search?: string;
    categoryId?: string;
    lowStockOnly?: boolean;
    outOfStockOnly?: boolean;
    includeInactive?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const page = params?.page || 1;
    const pageSize = params?.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductWhereInput = {
      ...(params?.includeInactive ? {} : { isActive: true, deletedAt: null }),
      ...(params?.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params?.outOfStockOnly ? { stock: { lte: 0 } } : {}),
      ...(params?.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { sku: { contains: params.search, mode: 'insensitive' } },
              { barcode: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // If low stock requested, filter products where stock <= minStockAlert and stock > 0
    if (params?.lowStockOnly) {
      // Using Prisma raw or combining condition
      where.stock = { gt: 0 };
    }

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: pageSize,
      }),
    ]);

    // In-memory filter for lowStockOnly if specified
    const filtered = params?.lowStockOnly
      ? products.filter((p) => p.stock <= p.minStockAlert)
      : products;

    return {
      items: filtered,
      pagination: {
        total: params?.lowStockOnly ? filtered.length : total,
        page,
        pageSize,
        totalPages: Math.ceil((params?.lowStockOnly ? filtered.length : total) / pageSize),
      },
    };
  }

  /**
   * Get low-stock and out-of-stock product warnings
   */
  static async getStockAlerts() {
    const [outOfStock, allActive] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true, deletedAt: null, stock: { lte: 0 } },
        include: { category: true },
        orderBy: { name: 'asc' },
      }),
      prisma.product.findMany({
        where: { isActive: true, deletedAt: null, stock: { gt: 0 } },
        include: { category: true },
        orderBy: { stock: 'asc' },
      }),
    ]);

    const lowStock = allActive.filter((p) => p.stock <= p.minStockAlert);

    return {
      outOfStock,
      lowStock,
      totalAlerts: outOfStock.length + lowStock.length,
    };
  }

  /**
   * Create a new product and optionally record initial stock intake
   */
  static async createProduct(data: ProductInput, userId: string) {
    const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existingSku) {
      throw new DomainError(`Product with SKU "${data.sku}" already exists.`);
    }

    if (data.barcode) {
      const existingBarcode = await prisma.product.findUnique({
        where: { barcode: data.barcode },
      });
      if (existingBarcode) {
        throw new DomainError(`Product with Barcode "${data.barcode}" already exists.`);
      }
    }

    const initialStock = data.stock || 0;

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sku: data.sku,
          barcode: data.barcode || null,
          name: data.name,
          description: data.description || null,
          categoryId: data.categoryId || null,
          costPrice: data.costPrice,
          sellingPrice: data.sellingPrice,
          stock: 0,
          minStockAlert: data.minStockAlert,
          isActive: data.isActive,
        },
        include: { category: true },
      });

      if (initialStock > 0) {
        await InventoryService.recordMovement({
          productId: product.id,
          quantityChange: initialStock,
          type: MovementType.PURCHASE,
          referenceType: 'INITIAL_STOCK',
          reason: 'Initial stock on product creation',
          userId,
          tx,
        });
      }

      await AuditService.record({
        userId,
        action: 'PRODUCT_CREATED',
        entity: 'Product',
        entityId: product.id,
        metadata: { sku: product.sku, name: product.name, initialStock },
        tx,
      });

      return product;
    });
  }

  /**
   * Update existing product details (non-inventory fields)
   */
  static async updateProduct(id: string, data: Partial<ProductInput>, userId: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Product', id);
    }

    if (data.sku && data.sku !== existing.sku) {
      const skuTaken = await prisma.product.findUnique({ where: { sku: data.sku } });
      if (skuTaken) {
        throw new DomainError(`SKU "${data.sku}" is already assigned to another product.`);
      }
    }

    if (data.barcode && data.barcode !== existing.barcode) {
      const barcodeTaken = await prisma.product.findUnique({ where: { barcode: data.barcode } });
      if (barcodeTaken) {
        throw new DomainError(`Barcode "${data.barcode}" is already assigned to another product.`);
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(data.sku ? { sku: data.sku } : {}),
        ...(data.barcode !== undefined ? { barcode: data.barcode || null } : {}),
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId || null } : {}),
        ...(data.costPrice !== undefined ? { costPrice: data.costPrice } : {}),
        ...(data.sellingPrice !== undefined ? { sellingPrice: data.sellingPrice } : {}),
        ...(data.minStockAlert !== undefined ? { minStockAlert: data.minStockAlert } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: { category: true },
    });

    await AuditService.record({
      userId,
      action: 'PRODUCT_UPDATED',
      entity: 'Product',
      entityId: id,
      metadata: { sku: updated.sku, changes: data },
    });

    return updated;
  }

  /**
   * Soft-delete / deactivate product to safely preserve historical sales data
   */
  static async deactivateProduct(id: string, userId: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundError('Product', id);
    }

    const deactivated = await prisma.product.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    await AuditService.record({
      userId,
      action: 'PRODUCT_DEACTIVATED',
      entity: 'Product',
      entityId: id,
      metadata: { name: product.name, sku: product.sku },
    });

    return deactivated;
  }

  /**
   * Reactivate a previously deactivated product
   */
  static async reactivateProduct(id: string, userId: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundError('Product', id);
    }

    const reactivated = await prisma.product.update({
      where: { id },
      data: {
        isActive: true,
        deletedAt: null,
      },
    });

    await AuditService.record({
      userId,
      action: 'PRODUCT_REACTIVATED',
      entity: 'Product',
      entityId: id,
      metadata: { name: product.name, sku: product.sku },
    });

    return reactivated;
  }

  // --- Category Operations ---

  static async getCategories() {
    return prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async createCategory(data: CategoryInput, userId: string) {
    const existing = await prisma.category.findUnique({ where: { name: data.name } });
    if (existing) {
      throw new DomainError(`Category "${data.name}" already exists.`);
    }

    const category = await prisma.category.create({ data });

    await AuditService.record({
      userId,
      action: 'CATEGORY_CREATED',
      entity: 'Category',
      entityId: category.id,
      metadata: { name: category.name },
    });

    return category;
  }

  static async updateCategory(id: string, data: Partial<CategoryInput>, userId: string) {
    const category = await prisma.category.update({
      where: { id },
      data,
    });

    await AuditService.record({
      userId,
      action: 'CATEGORY_UPDATED',
      entity: 'Category',
      entityId: id,
      metadata: data,
    });

    return category;
  }
}
