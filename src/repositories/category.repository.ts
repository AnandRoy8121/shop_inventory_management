import { BaseRepository } from './base.repository';
import { Category, Prisma } from '@prisma/client';

export type CategoryWithCounts = Category & {
  productCount: number;
  activeProductCount: number;
};

export class CategoryRepository extends BaseRepository {
  async findById(id: string): Promise<Category | null> {
    return this.db.category.findUnique({
      where: { id },
    });
  }

  async findByName(name: string): Promise<Category | null> {
    return this.db.category.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive',
        },
      },
    });
  }

  async countActiveProducts(categoryId: string): Promise<number> {
    return this.db.product.count({
      where: {
        categoryId,
        isActive: true,
        deletedAt: null,
      },
    });
  }

  async list(params?: { search?: string; activeOnly?: boolean }): Promise<CategoryWithCounts[]> {
    const where: Prisma.CategoryWhereInput = {
      ...(params?.activeOnly ? { isActive: true } : {}),
      ...(params?.search
        ? {
            OR: [
              { name: { contains: params.search.trim(), mode: 'insensitive' } },
              { description: { contains: params.search.trim(), mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const categories = await this.db.category.findMany({
      where,
      include: {
        _count: {
          select: { products: true },
        },
        products: {
          where: { isActive: true, deletedAt: null },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      productCount: c._count.products,
      activeProductCount: c.products.length,
    }));
  }

  async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return this.db.category.create({
      data: {
        ...data,
        name: data.name.trim(),
        description: data.description?.trim() || null,
      },
    });
  }

  async update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return this.db.category.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Category> {
    return this.db.category.delete({
      where: { id },
    });
  }
}

export const categoryRepository = new CategoryRepository();
