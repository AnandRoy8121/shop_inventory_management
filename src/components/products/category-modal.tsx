'use client';

import { useState, useTransition } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createCategoryAction } from '@/server/actions/product.actions';
import { AlertCircle } from 'lucide-react';

interface CategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryModal({ open, onOpenChange }: CategoryModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await createCategoryAction({
        name: name.trim(),
        description: description.trim() || undefined,
        isActive: true,
      });

      if (!res.success) {
        setError(res.error);
      } else {
        onOpenChange(false);
        setName('');
        setDescription('');
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create New Category"
      description="Organize products under a distinct taxonomy group"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="font-semibold text-slate-700 block mb-1">
            Category Name <span className="text-rose-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Gaming Gear or Organic Pantry"
            required
          />
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:outline-indigo-500"
            placeholder="Brief scope of items in this category..."
          />
        </div>

        {error && (
          <div className="flex items-center gap-1.5 rounded-md bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isPending} className="bg-indigo-600 hover:bg-indigo-700">
            Create Category
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
