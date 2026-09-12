import { categoryRepository, CategoryWithCounts } from '@/repositories/category.repository';
import { CreateCategoryInput, UpdateCategoryInput } from '@/schemas/category.schema';
import { NotFoundError, ConflictError } from '@/lib/errors';
import { AuditService } from '@/server/services/audit.service';
import { Category } from '@prisma/client';

export class CategoryService {
  /**
   * List all categories, optionally filtered by search string
   */
  async listCategories(search?: string): Promise<CategoryWithCounts[]> {
    return categoryRepository.list({ search });
  }

  /**
   * Get single category by ID
   */
  async getCategoryById(id: string): Promise<Category> {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Category', id);
    }
    return category;
  }

  /**
   * Create a new category, enforcing unique names
   */
  async createCategory(input: CreateCategoryInput, userId: string): Promise<Category> {
    const trimmedName = input.name.trim();

    // Check for duplicate category name
    const existing = await categoryRepository.findByName(trimmedName);
    if (existing) {
      throw new ConflictError(`A category with the name "${trimmedName}" already exists.`);
    }

    const category = await categoryRepository.create({
      name: trimmedName,
      description: input.description?.trim() || null,
      isActive: input.isActive ?? true,
    });

    // Record audit log
    await AuditService.record({
      userId,
      action: 'CATEGORY_CREATED',
      entity: 'Category',
      entityId: category.id,
      metadata: { name: category.name },
    });

    return category;
  }

  /**
   * Update existing category, enforcing unique names and active product retention
   */
  async updateCategory(id: string, input: UpdateCategoryInput, userId: string): Promise<Category> {
    const category = await this.getCategoryById(id);

    // If renaming, verify new name is not a duplicate
    if (input.name && input.name.trim().toLowerCase() !== category.name.toLowerCase()) {
      const trimmedName = input.name.trim();
      const existing = await categoryRepository.findByName(trimmedName);
      if (existing && existing.id !== id) {
        throw new ConflictError(`A category with the name "${trimmedName}" already exists.`);
      }
    }

    // Business rule: Prevent deactivating category if it still contains active products
    if (input.isActive === false && category.isActive === true) {
      const activeProductCount = await categoryRepository.countActiveProducts(id);
      if (activeProductCount > 0) {
        throw new ConflictError(
          `Cannot deactivate category "${category.name}" because it contains ${activeProductCount} active product(s). Please reassign or deactivate those products first.`
        );
      }
    }

    const updated = await categoryRepository.update(id, {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });

    await AuditService.record({
      userId,
      action: 'CATEGORY_UPDATED',
      entity: 'Category',
      entityId: id,
      metadata: { changes: input },
    });

    return updated;
  }

  /**
   * Delete category, enforcing that it contains NO active products
   */
  async deleteCategory(id: string, userId: string): Promise<Category> {
    const category = await this.getCategoryById(id);

    // Business rule: Prevent deleting categories containing active products
    const activeProductCount = await categoryRepository.countActiveProducts(id);
    if (activeProductCount > 0) {
      throw new ConflictError(
        `Cannot delete category "${category.name}" because it contains ${activeProductCount} active product(s). Please reassign or deactivate those products first.`
      );
    }

    const deleted = await categoryRepository.delete(id);

    await AuditService.record({
      userId,
      action: 'CATEGORY_DELETED',
      entity: 'Category',
      entityId: id,
      metadata: { name: category.name },
    });

    return deleted;
  }

  /**
   * Toggle category active/inactive status
   */
  async toggleStatus(id: string, isActive: boolean, userId: string): Promise<Category> {
    return this.updateCategory(id, { isActive }, userId);
  }
}

export const categoryService = new CategoryService();
