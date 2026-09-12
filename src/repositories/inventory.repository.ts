import { BaseRepository } from './base.repository';
import { Product, InventoryMovement, Prisma, MovementType } from '@prisma/client';
import { InventoryQueryOutput, MovementQueryOutput } from '@/schemas/inventory.schema';

export interface InventoryOverviewMetrics {
  totalItems: number;
  totalUnits: number;
  totalInventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export type InventoryStockItem = Product & {
  category: { id: string; name: string } | null;
  stockValue: number;
};

export interface InventoryListResult {
  items: InventoryStockItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type MovementWithRelations = InventoryMovement & {
  product: {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    unit: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export interface MovementListResult {
  items: MovementWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class InventoryRepository extends BaseRepository {
  /**
   * Aggregate total active merchandise metrics, stock units, and cost-based valuation
   */
  async getOverviewMetrics(): Promise<InventoryOverviewMetrics> {
    const activeProducts = await this.db.product.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true,
        stock: true,
        minStockAlert: true,
        costPrice: true,
      },
    });

    let totalUnits = 0;
    let totalInventoryValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of activeProducts) {
      totalUnits += p.stock;
      totalInventoryValue += p.stock * Number(p.costPrice);

      if (p.stock <= 0) {
        outOfStockCount++;
      } else if (p.stock <= p.minStockAlert) {
        lowStockCount++;
      }
    }

    return {
      totalItems: activeProducts.length,
      totalUnits,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      lowStockCount,
      outOfStockCount,
    };
  }

  /**
   * Query inventory items with category relations and calculated valuation
   */
  async listStock(query: InventoryQueryOutput): Promise<InventoryListResult> {
    const {
      search,
      categoryId,
      stockStatus = 'all',
      page = 1,
      pageSize = 10,
      sortBy = 'name',
      sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
      deletedAt: null,
    };

    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { barcode: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (stockStatus === 'out_of_stock') {
      where.stock = { lte: 0 };
    } else if (stockStatus === 'in_stock') {
      where.stock = { gt: 0 };
    }

    // Dynamic sorting
    const orderBy: Prisma.ProductOrderByWithRelationInput = {};
    if (sortBy === 'name') orderBy.name = sortOrder;
    else if (sortBy === 'stock') orderBy.stock = sortOrder;
    else if (sortBy === 'costPrice') orderBy.costPrice = sortOrder;
    else if (sortBy === 'sellingPrice') orderBy.sellingPrice = sortOrder;
    else orderBy.name = 'asc';

    // Handle low_stock filter
    if (stockStatus === 'low_stock') {
      where.stock = { gt: 0 };
      const allActive = await this.db.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
        },
        orderBy,
      });

      const lowStockItems = allActive
        .filter((p) => p.stock <= p.minStockAlert)
        .map((p) => ({
          ...p,
          stockValue: Math.round(p.stock * Number(p.costPrice) * 100) / 100,
        }));

      // In-memory sort by stockValue if requested
      if (sortBy === 'stockValue') {
        lowStockItems.sort((a, b) =>
          sortOrder === 'asc' ? a.stockValue - b.stockValue : b.stockValue - a.stockValue
        );
      }

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

    const [total, products] = await Promise.all([
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

    const items: InventoryStockItem[] = products.map((p) => ({
      ...p,
      stockValue: Math.round(p.stock * Number(p.costPrice) * 100) / 100,
    }));

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /**
   * Create an immutable inventory movement record
   */
  async recordMovement(
    data: Prisma.InventoryMovementUncheckedCreateInput,
    tx?: Prisma.TransactionClient
  ): Promise<InventoryMovement> {
    const client = tx || this.db;
    return client.inventoryMovement.create({
      data,
    });
  }

  /**
   * List inventory movement history with filtering, search, and relations
   */
  async listMovements(query: MovementQueryOutput): Promise<MovementListResult> {
    const {
      search,
      productId,
      type = 'all',
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
    } = query;

    const skip = (page - 1) * pageSize;

    const where: Prisma.InventoryMovementWhereInput = {};

    if (productId && productId !== 'all') {
      where.productId = productId;
    }

    if (type && type !== 'all') {
      where.type = type as MovementType;
    }

    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { product: { name: { contains: q, mode: 'insensitive' } } },
        { product: { sku: { contains: q, mode: 'insensitive' } } },
        { product: { barcode: { contains: q, mode: 'insensitive' } } },
        { reason: { contains: q, mode: 'insensitive' } },
        { referenceId: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.db.inventoryMovement.count({ where }),
      this.db.inventoryMovement.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              barcode: true,
              unit: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: items as MovementWithRelations[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /**
   * Retrieve movement history specifically for a single product
   */
  async getProductMovements(productId: string, limit = 50): Promise<MovementWithRelations[]> {
    const items = await this.db.inventoryMovement.findMany({
      where: { productId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            unit: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return items as MovementWithRelations[];
  }
}

export const inventoryRepository = new InventoryRepository();
