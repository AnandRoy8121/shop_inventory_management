import { prisma } from '@/lib/prisma';
import { productRepository, ProductWithCategory, ProductDetail, ProductListResult } from '@/repositories/product.repository';
import { categoryRepository } from '@/repositories/category.repository';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  CreateProductInput,
  UpdateProductInput,
  ProductQueryInput,
} from '@/schemas/product.schema';
import { NotFoundError, ConflictError, DomainError } from '@/lib/errors';
import { InventoryService } from '@/server/services/inventory.service';
import { AuditService } from '@/server/services/audit.service';
import { MovementType, Product } from '@prisma/client';

export class ProductService {
  /**
   * Search, filter, and paginate catalog products
   */
  async listProducts(query?: ProductQueryInput): Promise<ProductListResult> {
    const parsedQuery = productQuerySchema.parse(query || {});
    return productRepository.list(parsedQuery);
  }

  /**
   * Get detailed product information including category and movement history
   */
  async getProductById(id: string): Promise<ProductDetail> {
    const product = await productRepository.findDetailById(id);
    if (!product) {
      throw new NotFoundError('Product', id);
    }
    return product;
  }

  /**
   * Create a new catalog product with optional initial inventory intake
   */
  async createProduct(input: CreateProductInput, userId: string): Promise<ProductWithCategory> {
    const parsed = createProductSchema.parse(input);

    // 1. Enforce unique SKU (case-insensitive)
    const existingSku = await productRepository.findBySku(parsed.sku);
    if (existingSku) {
      throw new ConflictError(`A product with SKU "${parsed.sku}" already exists.`);
    }

    // 2. Enforce unique Barcode if provided
    if (parsed.barcode) {
      const existingBarcode = await productRepository.findByBarcode(parsed.barcode);
      if (existingBarcode) {
        throw new ConflictError(`A product with Barcode "${parsed.barcode}" already exists.`);
      }
    }

    // 3. Verify category existence if provided
    if (parsed.categoryId) {
      const category = await categoryRepository.findById(parsed.categoryId);
      if (!category) {
        throw new NotFoundError('Category', parsed.categoryId);
      }
    }

    const initialStock = parsed.initialStock ?? 0;

    // 4. Create product record and atomically record initial inventory if initialStock > 0
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: parsed.name,
          sku: parsed.sku,
          barcode: parsed.barcode || null,
          description: parsed.description || null,
          categoryId: parsed.categoryId || null,
          costPrice: parsed.costPrice,
          purchasePrice: parsed.purchasePrice ?? parsed.costPrice,
          sellingPrice: parsed.sellingPrice,
          stock: 0, // Initialized as 0, updated strictly via inventory movement below
          minStockAlert: parsed.minStockAlert ?? 5,
          unit: parsed.unit ?? 'pcs',
          imageUrl: parsed.imageUrl || null,
          isActive: parsed.isActive ?? true,
        },
        include: {
          category: { select: { id: true, name: true } },
        },
      });

      // Explicit inventory intake operation on creation
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

        // Refresh stock value for returning
        product.stock = initialStock;
      }

      // Record Audit Log
      await AuditService.record({
        userId,
        action: 'PRODUCT_CREATED',
        entity: 'Product',
        entityId: product.id,
        metadata: {
          sku: product.sku,
          name: product.name,
          costPrice: Number(product.costPrice),
          sellingPrice: Number(product.sellingPrice),
          initialStock,
        },
        tx,
      });

      return product;
    });
  }

  /**
   * Update product details.
   * NOTE: Stock modifications are strictly prohibited here.
   */
  async updateProduct(id: string, input: UpdateProductInput, userId: string): Promise<ProductWithCategory> {
    const parsed = updateProductSchema.parse(input);

    const existing = await productRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Product', id);
    }

    // 1. If SKU changed, verify uniqueness
    if (parsed.sku && parsed.sku !== existing.sku) {
      const skuTaken = await productRepository.findBySku(parsed.sku);
      if (skuTaken && skuTaken.id !== id) {
        throw new ConflictError(`SKU "${parsed.sku}" is already in use by another product.`);
      }
    }

    // 2. If barcode changed, verify uniqueness
    if (parsed.barcode && parsed.barcode !== existing.barcode) {
      const barcodeTaken = await productRepository.findByBarcode(parsed.barcode);
      if (barcodeTaken && barcodeTaken.id !== id) {
        throw new ConflictError(`Barcode "${parsed.barcode}" is already in use by another product.`);
      }
    }

    // 3. If category changed, verify existence
    if (parsed.categoryId && parsed.categoryId !== existing.categoryId) {
      const category = await categoryRepository.findById(parsed.categoryId);
      if (!category) {
        throw new NotFoundError('Category', parsed.categoryId);
      }
    }

    // 4. Exclude any stock fields defensively (stock must not be directly edited)
    const { ...safeUpdateData } = parsed;

    const updated = await productRepository.update(id, {
      ...(safeUpdateData.name !== undefined ? { name: safeUpdateData.name } : {}),
      ...(safeUpdateData.sku !== undefined ? { sku: safeUpdateData.sku } : {}),
      ...(safeUpdateData.barcode !== undefined ? { barcode: safeUpdateData.barcode } : {}),
      ...(safeUpdateData.description !== undefined ? { description: safeUpdateData.description } : {}),
      ...(safeUpdateData.categoryId !== undefined ? { categoryId: safeUpdateData.categoryId } : {}),
      ...(safeUpdateData.costPrice !== undefined
        ? {
            costPrice: safeUpdateData.costPrice,
            purchasePrice: safeUpdateData.purchasePrice ?? safeUpdateData.costPrice,
          }
        : {}),
      ...(safeUpdateData.sellingPrice !== undefined ? { sellingPrice: safeUpdateData.sellingPrice } : {}),
      ...(safeUpdateData.minStockAlert !== undefined ? { minStockAlert: safeUpdateData.minStockAlert } : {}),
      ...(safeUpdateData.unit !== undefined ? { unit: safeUpdateData.unit } : {}),
      ...(safeUpdateData.imageUrl !== undefined ? { imageUrl: safeUpdateData.imageUrl } : {}),
      ...(safeUpdateData.isActive !== undefined ? { isActive: safeUpdateData.isActive } : {}),
    });

    // Record Audit Log
    await AuditService.record({
      userId,
      action: 'PRODUCT_UPDATED',
      entity: 'Product',
      entityId: id,
      metadata: {
        sku: updated.sku,
        changes: safeUpdateData,
      },
    });

    return updated as ProductWithCategory;
  }

  /**
   * Deactivate product (soft-deactivation)
   */
  async deactivateProduct(id: string, userId: string): Promise<Product> {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Product', id);
    }

    const deactivated = await productRepository.softDelete(id);

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
   * Reactivate product
   */
  async reactivateProduct(id: string, userId: string): Promise<Product> {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Product', id);
    }

    const reactivated = await productRepository.reactivate(id);

    await AuditService.record({
      userId,
      action: 'PRODUCT_REACTIVATED',
      entity: 'Product',
      entityId: id,
      metadata: { name: product.name, sku: product.sku },
    });

    return reactivated;
  }

  /**
   * Validation check: Inactive products cannot be sold
   */
  async assertCanBeSold(productId: string): Promise<ProductWithCategory> {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new NotFoundError('Product', productId);
    }

    if (!product.isActive || product.deletedAt !== null) {
      throw new DomainError(
        `Product "${product.name}" (${product.sku}) is deactivated and cannot be added to a sale.`
      );
    }

    return product;
  }

  /**
   * Get low-stock and out-of-stock metrics for dashboard alerts
   */
  async getStockAlerts(): Promise<{ outOfStock: number; lowStock: number; totalAlerts: number }> {
    return productRepository.countStockAlerts();
  }
}

export const productService = new ProductService();
