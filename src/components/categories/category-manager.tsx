'use client';

import React, { useState, useTransition } from 'react';
import { Plus, Trash2, FolderTree, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { createCategoryAction, deleteCategoryAction } from '@/app/actions/category.actions';

interface CategoryWithCount {
  id: string;
  name: string;
  _count: {
    products: number;
  };
}

interface CategoryManagerProps {
  categories: CategoryWithCount[];
}

export function CategoryManager({ categories: initialCategories }: CategoryManagerProps) {
  const [categories, setCategories] = useState<CategoryWithCount[]>(initialCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const res = await createCategoryAction({ name: categoryName });
      if (!res.success || !res.data) {
        setErrorMessage(res.error || 'Failed to create category');
      } else {
        const newCat: CategoryWithCount = {
          id: res.data.id,
          name: res.data.name,
          _count: { products: 0 },
        };
        setCategories((prev) => [...prev, newCat]);
        setCategoryName('');
        setIsModalOpen(false);
      }
    });
  };

  const handleDelete = (id: string) => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await deleteCategoryAction(id);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to delete category');
        setDeleteConfirmId(null);
      } else {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        setDeleteConfirmId(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Category Management</h2>
          <p className="text-xs text-slate-500 mt-1">Organize products into categories for easy reporting</p>
        </div>

        <Button
          onClick={() => {
            setCategoryName('');
            setErrorMessage(null);
            setIsModalOpen(true);
          }}
          className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 shadow-xs font-semibold text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Add Category</span>
        </Button>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          {errorMessage}
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            <FolderTree className="h-8 w-8 mx-auto text-slate-300 mb-2" />
            No categories created yet.
          </div>
        ) : (
          categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 transition"
            >
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-slate-900">{c.name}</h4>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Package className="h-3 w-3 text-slate-400" />
                  <span>{c._count.products} product{c._count.products === 1 ? '' : 's'}</span>
                </p>
              </div>

              <button
                onClick={() => setDeleteConfirmId(c.id)}
                title="Delete Category"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Category Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => !open && setIsModalOpen(false)}
        title="Add Category"
        description="Enter a unique category name"
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Category Name *</label>
            <Input
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g. Beverages, Bakery"
              required
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isPending}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Create Category
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Delete Category"
        description="Are you sure? Categories containing products cannot be deleted."
        maxWidth="max-w-sm"
      >
        <div className="flex items-center justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDeleteConfirmId(null)}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            isLoading={isPending}
            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold"
          >
            Confirm Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
