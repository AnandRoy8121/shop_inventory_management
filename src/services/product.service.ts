import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ProductInput } from '@/schemas/product.schema';

export class ProductService {
  static async listProducts(filter?: {
    search?: string;
    categoryId?: string;
    status?: 'all' | 'active' | 'inactive' | 'low_stock' | 'out_of_stock';
  }) {
    const where: Prisma.ProductWhereInput = {};

    if (filter?.search) {
      where.name = { contains: filter.search.trim(), mode: 'insensitive' };
    }

    if (filter?.categoryId) {
      where.categoryId = filter.categoryId;
    }

    if (filter?.status === 'active') {
      where.isActive = true;
    } else if (filter?.status === 'inactive') {
      where.isActive = false;
    } else if (filter?.status === 'out_of_stock') {
      where.stock = { lte: 0 };
    }

    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
    });

    if (filter?.status === 'low_stock') {
      return products.filter((p) => p.stock <= p.minStock && p.stock > 0);
    }

    return products;
  }

  static async getProduct(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
  }

  static async createProduct(data: ProductInput) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: data.name,
          categoryId: data.categoryId || null,
          purchasePrice: data.purchasePrice ?? 0,
          sellingPrice: data.sellingPrice ?? 0,
          stock: data.stock ?? 0,
          minStock: data.minStock ?? 5,
          isActive: data.isActive ?? true,
        },
        include: { category: true },
      });

      if (product.stock > 0) {
        const inwardNumber = `INW-${Date.now().toString().slice(-6)}`;
        await tx.stockInward.create({
          data: {
            inwardNumber,
            productId: product.id,
            productName: product.name,
            quantity: product.stock,
            type: 'INITIAL_STOCK',
            notes: 'Initial stock on product creation',
          },
        });
      }

      return product;
    });
  }

  static async updateProduct(id: string, data: Partial<ProductInput>) {
    return prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId || null }),
        ...(data.purchasePrice !== undefined && { purchasePrice: data.purchasePrice }),
        ...(data.sellingPrice !== undefined && { sellingPrice: data.sellingPrice }),
        ...(data.stock !== undefined && { stock: data.stock }),
        ...(data.minStock !== undefined && { minStock: data.minStock }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: { category: true },
    });
  }

  static async toggleActive(id: string) {
    const product = await prisma.product.findUniqueOrThrow({ where: { id } });
    return prisma.product.update({
      where: { id },
      data: { isActive: !product.isActive },
    });
  }

  static async deleteProduct(id: string) {
    // Check if product has sales records attached
    const saleCount = await prisma.saleItem.count({ where: { productId: id } });
    if (saleCount > 0) {
      // Deactivate instead of hard deleting to preserve historical records
      return prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return prisma.product.delete({ where: { id } });
  }
}
