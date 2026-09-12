'use client';

import React, { useState, useTransition } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createCategoryAction, updateCategoryAction } from '@/app/actions/category.actions';
import { useToast } from '@/components/shared/toast';
import { AlertCircle } from 'lucide-react';
import { Category } from '@prisma/client';

export interface CategoryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryToEdit?: Category | null;
  onSuccess?: () => void;
}

interface CategoryFormContentProps {
  categoryToEdit?: Category | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function CategoryFormContent({ categoryToEdit, onClose, onSuccess }: CategoryFormContentProps) {
  const isEditing = !!categoryToEdit;
  const toast = useToast();

  const [name, setName] = useState(categoryToEdit?.name || '');
  const [description, setDescription] = useState(categoryToEdit?.description || '');
  const [isActive, setIsActive] = useState(categoryToEdit?.isActive ?? true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        isActive,
      };

      const result = isEditing
        ? await updateCategoryAction(categoryToEdit.id, payload)
        : await createCategoryAction(payload);

      if (!result.success) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        setFormError(result.error);
        toast.error(result.error, isEditing ? 'Update Failed' : 'Creation Failed');
      } else {
        toast.success(
          isEditing
            ? `Category "${name}" updated successfully.`
            : `Category "${name}" created successfully.`,
          isEditing ? 'Category Updated' : 'Category Created'
        );
        onClose();
        if (onSuccess) onSuccess();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {/* Category Name */}
      <div>
        <label className="font-semibold text-slate-700 block mb-1">
          Category Name <span className="text-rose-500">*</span>
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Beverages & Snacks or Electronics"
          required
          disabled={isPending}
          autoFocus
        />
        {fieldErrors.name && (
          <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.name[0]}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="font-semibold text-slate-700 block mb-1">Description (Optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={isPending}
          className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition shadow-2xs"
          placeholder="Scope of merchandise categorized under this group..."
        />
        {fieldErrors.description && (
          <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.description[0]}</p>
        )}
      </div>

      {/* Active Status Checkbox */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="category-active-checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          disabled={isPending}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="category-active-checkbox" className="text-xs font-medium text-slate-700 select-none">
          Active in catalog (visible for product assignment)
        </label>
      </div>

      {/* General Form Error */}
      {formError && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Modal Actions Footer */}
      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isPending}
          className="text-xs"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          isLoading={isPending}
          className="bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold"
        >
          {isEditing ? 'Save Changes' : 'Create Category'}
        </Button>
      </div>
    </form>
  );
}

export function CategoryFormModal({
  open,
  onOpenChange,
  categoryToEdit,
  onSuccess,
}: CategoryFormModalProps) {
  const isEditing = !!categoryToEdit;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Edit Category' : 'Create New Category'}
      description={
        isEditing
          ? 'Update category identity, description, and status.'
          : 'Define a new taxonomy category to organize retail products.'
      }
      maxWidth="max-w-md"
    >
      {open && (
        <CategoryFormContent
          key={categoryToEdit?.id ?? 'create'}
          categoryToEdit={categoryToEdit}
          onClose={() => onOpenChange(false)}
          onSuccess={onSuccess}
        />
      )}
    </Dialog>
  );
}
