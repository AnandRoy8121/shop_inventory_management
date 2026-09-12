import { BaseRepository } from './base.repository';
import { Product, Prisma } from '@prisma/client';
import { ProductQueryOutput } from '@/schemas/product.schema';

export type ProductWithCategory = Product & {
  category: { id: string; name: string } | null;
};

export type ProductDetail = Product & {
  category: { id: string; name: string } | null;
  movements: Array<{
    id: string;
    quantityChange: number;
    stockBefore: number;
    stockAfter: number;
    type: string;
    reason: string | null;
    referenceType: string | null;
    createdAt: Date;
    user: { id: string; name: string; email: string };
  }>;
  _count: {
    saleItems: number;
  };
};

export interface ProductListResult {
  items: ProductWithCategory[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class ProductRepository extends BaseRepository {
  /**
   * Find product by unique ID
   */
  async findById(id: string, tx?: Prisma.TransactionClient): Promise<ProductWithCategory | null> {
    const client = tx || this.db;
    return client.product.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * Find product by ID with category, recent movements ledger, and sale statistics
   */
  async findDetailById(id: string): Promise<ProductDetail | null> {
    const product = await this.db.product.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true },
        },
        movements: {
          take: 25,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { saleItems: true },
        },
      },
    });

    return product as ProductDetail | null;
  }

  /**
   * Find product by unique SKU (case-insensitive)
   */
  async findBySku(sku: string, tx?: Prisma.TransactionClient): Promise<Product | null> {
    const client = tx || this.db;
    return client.product.findFirst({
      where: {
        sku: {
          equals: sku.trim(),
          mode: 'insensitive',
        },
      },
    });
  }

  /**
   * Find product by unique Barcode
   */
  async findByBarcode(barcode: string, tx?: Prisma.TransactionClient): Promise<Product | null> {
    const client = tx || this.db;
    return client.product.findFirst({
      where: {
        barcode: {
          equals: barcode.trim(),
        },
      },
    });
  }

  /**
   * Search and list products with filtering, stock alert constraints, and pagination
   */
  async list(query: ProductQueryOutput): Promise<ProductListResult> {
    const {
      search,
      categoryId,
      status = 'all',
      stockStatus = 'all',
      page = 1,
      pageSize = 10,
      sortBy = 'name',
      sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * pageSize;

    // Build Prisma where filter
    const where: Prisma.ProductWhereInput = {};

    // Active/Inactive filter
    if (status === 'active') {
      where.isActive = true;
      where.deletedAt = null;
    } else if (status === 'inactive') {
      where.OR = [
        { isActive: false },
        { deletedAt: { not: null } },
      ];
    }

    // Category filter
    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    // Keyword Search
    if (search && search.trim() !== '') {
      const q = search.trim();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { barcode: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    // Stock Status filters
    if (stockStatus === 'out-of-stock') {
      where.stock = { lte: 0 };
    } else if (stockStatus === 'in-stock') {
      where.stock = { gt: 0 };
    }

    // Sorting field configuration
    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    if (sortBy === 'name') orderBy.name = sortOrder;
    else if (sortBy === 'stock') orderBy.stock = sortOrder;
    else if (sortBy === 'sellingPrice') orderBy.sellingPrice = sortOrder;
    else if (sortBy === 'costPrice') orderBy.costPrice = sortOrder;
    else if (sortBy === 'createdAt') orderBy.createdAt = sortOrder;
    else if (sortBy === 'updatedAt') orderBy.updatedAt = sortOrder;
    else orderBy.name = 'asc';

    // If low-stock is requested, we query products where stock > 0, then filter where stock <= minStockAlert
    if (stockStatus === 'low-stock') {
      where.stock = { gt: 0 };
      const allActive = await this.db.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
        },
        orderBy,
      });

      const lowStockItems = allActive.filter((p) => p.stock <= p.minStockAlert);
      const total = lowStockItems.length;
      const paginatedItems = lowStockItems.slice(skip, skip + pageSize);

      return {
        items: paginatedItems,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      };
    }

    const [total, items] = await Promise.all([
      this.db.product.count({ where }),
      this.db.product.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /**
   * Count stock alerts (out of stock and low stock)
   */
  async countStockAlerts(): Promise<{ outOfStock: number; lowStock: number; totalAlerts: number }> {
    const [outOfStock, allActive] = await Promise.all([
      this.db.product.count({
        where: { isActive: true, deletedAt: null, stock: { lte: 0 } },
      }),
      this.db.product.findMany({
        where: { isActive: true, deletedAt: null, stock: { gt: 0 } },
        select: { stock: true, minStockAlert: true },
      }),
    ]);

    const lowStock = allActive.filter((p) => p.stock <= p.minStockAlert).length;

    return {
      outOfStock,
      lowStock,
      totalAlerts: outOfStock + lowStock,
    };
  }

  /**
   * Create product record
   */
  async create(data: Prisma.ProductCreateInput, tx?: Prisma.TransactionClient): Promise<Product> {
    const client = tx || this.db;
    return client.product.create({
      data,
      include: {
        category: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Update product record (strictly excludes stock)
   */
  async update(id: string, data: Prisma.ProductUpdateInput, tx?: Prisma.TransactionClient): Promise<Product> {
    const client = tx || this.db;
    return client.product.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Soft-deactivate product
   */
  async softDelete(id: string, tx?: Prisma.TransactionClient): Promise<Product> {
    const client = tx || this.db;
    return client.product.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Reactivate product
   */
  async reactivate(id: string, tx?: Prisma.TransactionClient): Promise<Product> {
    const client = tx || this.db;
    return client.product.update({
      where: { id },
      data: {
        isActive: true,
        deletedAt: null,
      },
    });
  }
}

export const productRepository = new ProductRepository();
