'use client';

import React, { useState, useTransition } from 'react';
import { Product, Category } from '@prisma/client';
import { Plus, Search, Edit2, Trash2, Power, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  createProductAction,
  updateProductAction,
  toggleProductAction,
  deleteProductAction,
} from '@/app/actions/product.actions';

export type ProductWithCategory = Omit<Product, 'purchasePrice' | 'sellingPrice'> & {
  purchasePrice: number | any;
  sellingPrice: number | any;
  category?: Category | null;
};

interface ProductManagerProps {
  products: ProductWithCategory[];
  categories: Category[];
}

export function ProductManager({ products: initialProducts, categories }: ProductManagerProps) {
  const [products, setProducts] = useState<ProductWithCategory[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'low_stock' | 'out_of_stock'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithCategory | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formStock, setFormStock] = useState('0');
  const [formMinStock, setFormMinStock] = useState('5');

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory('');
    setFormStock('0');
    setFormMinStock('5');
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: ProductWithCategory) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.categoryId || '');
    setFormStock(p.stock.toString());
    setFormMinStock(p.minStock.toString());
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const payload = {
      name: formName,
      categoryId: formCategory || null,
      purchasePrice: 0,
      sellingPrice: 0,
      stock: parseInt(formStock, 10) || 0,
      minStock: parseInt(formMinStock, 10) || 5,
    };

    startTransition(async () => {
      if (editingProduct) {
        const res = await updateProductAction({ id: editingProduct.id, ...payload });
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to update product');
        } else {
          setIsModalOpen(false);
          setProducts((prev) =>
            prev.map((item) => (item.id === editingProduct.id ? (res.data as ProductWithCategory) : item))
          );
        }
      } else {
        const res = await createProductAction(payload);
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to create product');
        } else {
          setIsModalOpen(false);
          setProducts((prev) => [res.data as ProductWithCategory, ...prev]);
        }
      }
    });
  };

  const handleToggleActive = (p: ProductWithCategory) => {
    startTransition(async () => {
      const res = await toggleProductAction(p.id);
      if (res.success && res.data) {
        setProducts((prev) =>
          prev.map((item) => (item.id === p.id ? { ...item, isActive: res.data.isActive } : item))
        );
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteProductAction(id);
      if (res.success) {
        setProducts((prev) => prev.filter((item) => item.id !== id));
        setDeleteConfirmId(null);
      }
    });
  };

  // Filtered list
  const filteredProducts = products.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase().trim());
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;

    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = p.isActive;
    else if (statusFilter === 'inactive') matchesStatus = !p.isActive;
    else if (statusFilter === 'out_of_stock') matchesStatus = p.stock <= 0;
    else if (statusFilter === 'low_stock') matchesStatus = p.stock > 0 && p.stock <= p.minStock;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Product Management</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage product prices, stock balances, and alert thresholds
          </p>
        </div>

        <Button onClick={openCreateModal} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 shadow-xs font-semibold text-xs">
          <Plus className="h-4 w-4" />
          <span>Add Product</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            aria-label="Filter by category"
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive' | 'low_stock' | 'out_of_stock')}
            aria-label="Filter by status"
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="low_stock">Low Stock (≤ Alert)</option>
            <option value="out_of_stock">Out of Stock (0)</option>
          </select>
        </div>
      </div>

      {/* Products Table & Mobile Cards */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/75 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 font-semibold">Product</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold text-center">Stock Level</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-center">Date Added</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Package className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    No products found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOut = p.stock <= 0;
                  const isLow = p.stock > 0 && p.stock <= p.minStock;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{p.name}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {p.category?.name || <span className="text-slate-400 italic">Uncategorized</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                          >
                            {p.stock}
                          </span>
                          <span className="text-[10px] text-slate-400">/ min {p.minStock}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {p.isActive ? (
                          <Badge variant="success" className="text-[10px] px-2 py-0.5">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(p)}
                            title="Edit Product"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleActive(p)}
                            title={p.isActive ? 'Deactivate Product' : 'Activate Product'}
                            className={`p-1.5 rounded-lg transition ${
                              p.isActive
                                ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmId(p.id)}
                            title="Delete Product"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List (< md screens) */}
        <div className="divide-y divide-slate-100 md:hidden">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Package className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-medium">No products found.</p>
            </div>
          ) : (
            filteredProducts.map((p) => {
              const isOut = p.stock <= 0;
              const isLow = p.stock > 0 && p.stock <= p.minStock;

              return (
                <div key={p.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider block">
                        {p.category?.name || 'Uncategorized'}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">{p.name}</h4>
                    </div>
                    {p.isActive ? (
                      <Badge variant="success" className="text-[10px] px-2 py-0.5 shrink-0">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5 shrink-0">
                        Inactive
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Stock Level</span>
                      <span className={`font-mono font-bold ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {p.stock} <span className="text-[10px] text-slate-400 font-normal">/ {p.minStock}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Date Added</span>
                      <span className="font-mono text-slate-600">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }) : '-'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(p)}
                      className="h-8 text-xs gap-1"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(p)}
                      className={`h-8 text-xs gap-1 ${p.isActive ? 'text-slate-600' : 'text-emerald-600 border-emerald-200 bg-emerald-50'}`}
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span>{p.isActive ? 'Deactivate' : 'Activate'}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(p.id)}
                      className="h-8 text-xs text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => !open && setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        description="Enter product details, category, and inventory alert threshold"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveProduct} className="space-y-3.5 pt-2">
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Product Name *</label>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Coca Cola 500ml"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">No Category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Current Stock *</label>
              <Input
                type="number"
                step="1"
                min="0"
                value={formStock}
                onChange={(e) => setFormStock(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Min. Alert Stock *</label>
              <Input
                type="number"
                step="1"
                min="0"
                value={formMinStock}
                onChange={(e) => setFormMinStock(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
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
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Delete Product"
        description="Are you sure? If this product has historical sales, it will be deactivated to preserve sales records."
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
