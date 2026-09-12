'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { PageHeader } from '@/components/shared/page-header';
import { FilterBar } from '@/components/shared/filter-bar';
import { DataTable, ColumnDef } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { DateDisplay } from '@/components/shared/date-display';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { CategoryFormModal } from './category-form-modal';
import { useToast } from '@/components/shared/toast';
import { deleteCategoryAction, toggleCategoryStatusAction } from '@/app/actions/category.actions';
import { FolderTree, Plus, Pencil, Trash2, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CategoryWithCounts } from '@/repositories/category.repository';
import { Category } from '@prisma/client';

interface CategoryManagerProps {
  initialCategories: CategoryWithCounts[];
}

export function CategoryManager({ initialCategories }: CategoryManagerProps) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  // Confirmation dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'delete' | 'deactivate';
    category: CategoryWithCounts | null;
  }>({
    isOpen: false,
    type: 'delete',
    category: null,
  });

  const [isPending, startTransition] = useTransition();

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return initialCategories.filter((cat) => {
      const matchesSearch =
        search.trim() === '' ||
        cat.name.toLowerCase().includes(search.toLowerCase().trim()) ||
        (cat.description && cat.description.toLowerCase().includes(search.toLowerCase().trim()));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && cat.isActive) ||
        (statusFilter === 'inactive' && !cat.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [initialCategories, search, statusFilter]);

  // Open create modal
  const handleOpenCreate = () => {
    setCategoryToEdit(null);
    setIsFormModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (category: CategoryWithCounts) => {
    setCategoryToEdit(category);
    setIsFormModalOpen(true);
  };

  // Open delete confirm
  const handleOpenDelete = (category: CategoryWithCounts) => {
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      category,
    });
  };

  // Open deactivate confirm
  const handleOpenDeactivate = (category: CategoryWithCounts) => {
    setConfirmDialog({
      isOpen: true,
      type: 'deactivate',
      category,
    });
  };

  // Execute confirmed action
  const handleConfirmAction = () => {
    const { category, type } = confirmDialog;
    if (!category) return;

    startTransition(async () => {
      if (type === 'delete') {
        const res = await deleteCategoryAction(category.id);
        if (!res.success) {
          toast.error(res.error, 'Cannot Delete Category');
        } else {
          toast.success(`Category "${category.name}" was deleted successfully.`, 'Category Deleted');
          setConfirmDialog({ isOpen: false, type: 'delete', category: null });
        }
      } else if (type === 'deactivate') {
        const nextStatus = !category.isActive;
        const res = await toggleCategoryStatusAction(category.id, nextStatus);
        if (!res.success) {
          toast.error(res.error, 'Action Prohibited');
        } else {
          toast.success(
            `Category "${category.name}" is now ${nextStatus ? 'active' : 'inactive'}.`,
            nextStatus ? 'Category Activated' : 'Category Deactivated'
          );
          setConfirmDialog({ isOpen: false, type: 'deactivate', category: null });
        }
      }
    });
  };

  const columns: ColumnDef<CategoryWithCounts>[] = [
    {
      header: 'Category',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-2xs">
            <FolderTree className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 leading-tight">{row.name}</p>
            {row.description ? (
              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{row.description}</p>
            ) : (
              <span className="text-[10px] text-slate-400 italic">No description</span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (row) => <StatusBadge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} />,
    },
    {
      header: 'Products Linked',
      align: 'center',
      cell: (row) => (
        <div className="flex flex-col items-center">
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
            {row.productCount} items
          </span>
          {row.activeProductCount > 0 && (
            <span className="text-[10px] text-slate-400 mt-0.5">
              ({row.activeProductCount} active)
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Last Updated',
      align: 'right',
      cell: (row) => <DateDisplay date={row.updatedAt} formatVariant="date" />,
    },
    {
      header: 'Actions',
      align: 'right',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {/* Edit Button */}
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            title="Edit Category"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          {/* Toggle Active Status */}
          <button
            type="button"
            onClick={() => (row.isActive ? handleOpenDeactivate(row) : handleConfirmAction())}
            title={row.isActive ? 'Deactivate Category' : 'Activate Category'}
            className={`rounded-lg p-1.5 transition ${
              row.isActive
                ? 'text-slate-400 hover:bg-amber-50 hover:text-amber-700'
                : 'text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            <Power className="h-3.5 w-3.5" />
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => handleOpenDelete(row)}
            title="Delete Category"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Category Management"
        description="Organize store inventory into distinct product classifications and catalog groups"
        badge={
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
            {initialCategories.length} Categories
          </span>
        }
        actions={
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 shadow-xs h-9 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>Create Category</span>
          </Button>
        }
      />

      {/* Filter toolbar */}
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search categories by name or description..."
        hasActiveFilters={search !== '' || statusFilter !== 'all'}
        onReset={() => {
          setSearch('');
          setStatusFilter('all');
        }}
        filters={
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            >
              <option value="all">All Categories</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        }
      />

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredCategories}
        emptyState={{
          title: search ? 'No matching categories found' : 'No categories configured',
          description: search
            ? `No category matches query "${search}". Try clearing your filters.`
            : 'Create your first product category to organize your retail catalog.',
          icon: FolderTree,
          action: (
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Category</span>
            </Button>
          ),
        }}
      />

      {/* Create / Edit Modal Dialog */}
      <CategoryFormModal
        open={isFormModalOpen}
        onOpenChange={setIsFormModalOpen}
        categoryToEdit={categoryToEdit}
      />

      {/* Confirmation Dialog for Deletion or Deactivation */}
      {confirmDialog.category && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog({ isOpen: false, type: 'delete', category: null })}
          onConfirm={handleConfirmAction}
          isPending={isPending}
          variant={confirmDialog.type === 'delete' ? 'destructive' : 'default'}
          title={
            confirmDialog.type === 'delete'
              ? `Delete Category "${confirmDialog.category.name}"?`
              : `Deactivate Category "${confirmDialog.category.name}"?`
          }
          description={
            confirmDialog.category.activeProductCount > 0
              ? `Warning: This category currently contains ${confirmDialog.category.activeProductCount} active product(s). The system will reject deletion/deactivation until these products are reassigned or deactivated.`
              : confirmDialog.type === 'delete'
              ? 'This operation is permanent. Historical sales and inventory records will retain the snapshot category information.'
              : 'Deactivating this category will hide it from active POS and product creation dropdowns.'
          }
          confirmText={confirmDialog.type === 'delete' ? 'Delete Permanently' : 'Deactivate'}
        />
      )}
    </div>
  );
}
