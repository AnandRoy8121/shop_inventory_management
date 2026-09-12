'use client';

import React, { useState, useTransition } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createProductAction, updateProductAction } from '@/app/actions/product.actions';
import { useToast } from '@/components/shared/toast';
import { AlertCircle, TrendingUp, Info } from 'lucide-react';
import { ProductWithCategory } from '@/repositories/product.repository';

export interface CategoryOption {
  id: string;
  name: string;
}

export interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOption[];
  productToEdit?: ProductWithCategory | null;
  onSuccess?: () => void;
}

interface ProductFormContentProps {
  categories: CategoryOption[];
  productToEdit?: ProductWithCategory | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function ProductFormContent({
  categories,
  productToEdit,
  onClose,
  onSuccess,
}: ProductFormContentProps) {
  const isEditing = !!productToEdit;
  const toast = useToast();

  const [name, setName] = useState(productToEdit?.name || '');
  const [sku, setSku] = useState(productToEdit?.sku || '');
  const [barcode, setBarcode] = useState(productToEdit?.barcode || '');
  const [categoryId, setCategoryId] = useState(productToEdit?.categoryId || '');
  const [description, setDescription] = useState(productToEdit?.description || '');
  const [costPrice, setCostPrice] = useState<string | number>(
    productToEdit ? Number(productToEdit.costPrice) : ''
  );
  const [sellingPrice, setSellingPrice] = useState<string | number>(
    productToEdit ? Number(productToEdit.sellingPrice) : ''
  );
  const [initialStock, setInitialStock] = useState<number>(0);
  const [minStockAlert, setMinStockAlert] = useState<number>(
    productToEdit?.minStockAlert ?? 5
  );
  const [unit, setUnit] = useState(productToEdit?.unit || 'pcs');
  const [imageUrl, setImageUrl] = useState(productToEdit?.imageUrl || '');
  const [isActive, setIsActive] = useState(productToEdit?.isActive ?? true);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Calculate live margin preview
  const numCost = Number(costPrice) || 0;
  const numSelling = Number(sellingPrice) || 0;
  const unitProfit = numSelling - numCost;
  const marginPercent = numSelling > 0 ? ((unitProfit / numSelling) * 100).toFixed(1) : '0';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        barcode: barcode.trim() || undefined,
        categoryId: categoryId || undefined,
        description: description.trim() || undefined,
        costPrice: Number(costPrice),
        purchasePrice: Number(costPrice),
        sellingPrice: Number(sellingPrice),
        minStockAlert: Number(minStockAlert),
        unit: unit.trim() || 'pcs',
        imageUrl: imageUrl.trim() || undefined,
        isActive,
        // initialStock is only accepted for new products
        ...(isEditing ? {} : { initialStock: Number(initialStock) }),
      };

      const result = isEditing
        ? await updateProductAction(productToEdit.id, payload)
        : await createProductAction(payload);

      if (!result.success) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        setFormError(result.error);
        toast.error(result.error, isEditing ? 'Update Failed' : 'Creation Failed');
      } else {
        toast.success(
          isEditing
            ? `Product "${name}" updated successfully.`
            : `Product "${name}" registered successfully.`,
          isEditing ? 'Product Updated' : 'Product Registered'
        );
        onClose();
        if (onSuccess) onSuccess();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Product Title */}
        <div className="md:col-span-2">
          <label className="font-semibold text-slate-700 block mb-1">
            Product Title <span className="text-rose-500">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Wireless Noise-Cancelling Headphones"
            required
            disabled={isPending}
            autoFocus
          />
          {fieldErrors.name && (
            <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.name[0]}</p>
          )}
        </div>

        {/* SKU */}
        <div>
          <label className="font-semibold text-slate-700 block mb-1">
            SKU (Stock Keeping Unit) <span className="text-rose-500">*</span>
          </label>
          <Input
            value={sku}
            onChange={(e) => setSku(e.target.value.toUpperCase())}
            placeholder="e.g. ELEC-HP-001"
            required
            disabled={isPending}
          />
          {fieldErrors.sku && (
            <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.sku[0]}</p>
          )}
        </div>

        {/* Barcode / EAN */}
        <div>
          <label className="font-semibold text-slate-700 block mb-1">
            Barcode / EAN (Optional)
          </label>
          <Input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="e.g. 890123456789"
            disabled={isPending}
          />
          {fieldErrors.barcode && (
            <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.barcode[0]}</p>
          )}
        </div>

        {/* Category Selector */}
        <div>
          <label className="font-semibold text-slate-700 block mb-1">Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={isPending}
            className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {fieldErrors.categoryId && (
            <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.categoryId[0]}</p>
          )}
        </div>

        {/* Unit of Measurement */}
        <div>
          <label className="font-semibold text-slate-700 block mb-1">Unit of Measure</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            disabled={isPending}
            className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
          >
            <option value="pcs">Pieces (pcs)</option>
            <option value="box">Box (box)</option>
            <option value="pack">Pack (pack)</option>
            <option value="kg">Kilogram (kg)</option>
            <option value="g">Gram (g)</option>
            <option value="liter">Liter (L)</option>
            <option value="set">Set (set)</option>
          </select>
        </div>

        {/* Cost Price */}
        <div>
          <label className="font-semibold text-slate-700 block mb-1">
            Wholesale Cost Price ($) <span className="text-rose-500">*</span>
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            placeholder="0.00"
            required
            disabled={isPending}
          />
          {fieldErrors.costPrice && (
            <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.costPrice[0]}</p>
          )}
        </div>

        {/* Selling Price */}
        <div>
          <label className="font-semibold text-slate-700 block mb-1">
            Retail Selling Price ($) <span className="text-rose-500">*</span>
          </label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            placeholder="0.00"
            required
            disabled={isPending}
          />
          {fieldErrors.sellingPrice && (
            <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.sellingPrice[0]}</p>
          )}
        </div>

        {/* Live Profit & Margin Indicator */}
        <div className="md:col-span-2 rounded-lg bg-slate-50 border border-slate-200 p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600">
            <TrendingUp className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-[11px]">Gross Margin Preview:</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-600">
              Profit: <strong className={unitProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                ${unitProfit.toFixed(2)}
              </strong>
            </span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
              unitProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              {marginPercent}% Margin
            </span>
          </div>
        </div>

        {/* Stock Intake (Only visible on creation) */}
        {!isEditing ? (
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Initial Stock Intake
            </label>
            <Input
              type="number"
              min="0"
              value={initialStock}
              onChange={(e) => setInitialStock(parseInt(e.target.value) || 0)}
              placeholder="0"
              disabled={isPending}
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Atomically logs an initial purchase ledger row
            </p>
            {fieldErrors.initialStock && (
              <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.initialStock[0]}</p>
            )}
          </div>
        ) : (
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Current Stock</label>
            <div className="h-9 flex items-center justify-between rounded-lg bg-slate-100 px-3 border border-slate-200 text-slate-700">
              <span className="font-mono font-bold">{productToEdit.stock} {productToEdit.unit}</span>
              <span className="text-[10px] text-slate-400 italic">Managed via Inventory</span>
            </div>
          </div>
        )}

        {/* Low Stock Alert Threshold */}
        <div>
          <label className="font-semibold text-slate-700 block mb-1">
            Low Stock Alert Threshold
          </label>
          <Input
            type="number"
            min="0"
            value={minStockAlert}
            onChange={(e) => setMinStockAlert(parseInt(e.target.value) || 0)}
            placeholder="5"
            disabled={isPending}
          />
          {fieldErrors.minStockAlert && (
            <p className="mt-1 text-[11px] text-rose-600">{fieldErrors.minStockAlert[0]}</p>
          )}
        </div>

        {/* Image URL */}
        <div className="md:col-span-2">
          <label className="font-semibold text-slate-700 block mb-1">Image URL (Optional)</label>
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://images.unsplash.com/... or /images/products/..."
            disabled={isPending}
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="font-semibold text-slate-700 block mb-1">Description (Optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            disabled={isPending}
            className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition shadow-2xs"
            placeholder="Detailed merchandise specifications, warranty, or brand details..."
          />
        </div>
      </div>

      {/* Stock Editing Policy Note for Editing Mode */}
      {isEditing && (
        <div className="flex items-start gap-2 rounded-lg bg-indigo-50/70 p-2.5 text-xs text-indigo-800 border border-indigo-100">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-indigo-600" />
          <p className="text-[11px] leading-tight">
            <strong>Stock Integrity Protection:</strong> Product catalog editing does not alter stock counts. To add supplier inventory, record damaged items, or adjust shrinkage, use the <strong>Inventory Movement</strong> module.
          </p>
        </div>
      )}

      {/* Active Status Checkbox */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="product-active-checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          disabled={isPending}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="product-active-checkbox" className="text-xs font-medium text-slate-700 select-none">
          Active product (available for POS sales and catalog display)
        </label>
      </div>

      {/* Form Error Message */}
      {formError && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Action Buttons */}
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
          {isEditing ? 'Save Changes' : 'Register Product'}
        </Button>
      </div>
    </form>
  );
}

export function ProductFormModal({
  open,
  onOpenChange,
  categories,
  productToEdit,
  onSuccess,
}: ProductFormModalProps) {
  const isEditing = !!productToEdit;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? 'Edit Catalog Product' : 'Register New Product'}
      description={
        isEditing
          ? 'Update product details, pricing, barcodes, and categorizations.'
          : 'Create a new merchandise record in your retail catalog.'
      }
      maxWidth="max-w-xl"
    >
      {open && (
        <ProductFormContent
          key={productToEdit?.id ?? 'create'}
          categories={categories}
          productToEdit={productToEdit}
          onClose={() => onOpenChange(false)}
          onSuccess={onSuccess}
        />
      )}
    </Dialog>
  );
}
