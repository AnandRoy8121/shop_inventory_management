'use client';

import React, { useState, useTransition } from 'react';
import { Product, Category } from '@prisma/client';
import { Boxes, Search, PlusCircle, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { addStockAction, updateStockAction } from '@/app/actions/inventory.actions';

export type ProductWithCategory = Omit<Product, 'purchasePrice' | 'sellingPrice'> & {
  purchasePrice: number | any;
  sellingPrice: number | any;
  category?: Category | null;
};

interface InventoryManagerProps {
  products: ProductWithCategory[];
  summary: {
    totalProducts: number;
    totalStockUnits: number;
    inventoryValuation: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
}

export function InventoryManager({ products: initialProducts, summary }: InventoryManagerProps) {
  const [products, setProducts] = useState<ProductWithCategory[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  // Modal State
  const [activeModal, setActiveModal] = useState<'ADD' | 'UPDATE' | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithCategory | null>(null);
  const [quantityInput, setQuantityInput] = useState('1');
  const [notesInput, setNotesInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const openAddModal = (p: ProductWithCategory) => {
    setSelectedProduct(p);
    setQuantityInput('5');
    setNotesInput('');
    setErrorMessage(null);
    setActiveModal('ADD');
  };

  const openUpdateModal = (p: ProductWithCategory) => {
    setSelectedProduct(p);
    setQuantityInput(p.stock.toString());
    setNotesInput('');
    setErrorMessage(null);
    setActiveModal('UPDATE');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setErrorMessage(null);

    const num = parseInt(quantityInput, 10);
    if (isNaN(num)) {
      setErrorMessage('Please enter a valid number');
      return;
    }

    startTransition(async () => {
      if (activeModal === 'ADD') {
        const res = await addStockAction({
          productId: selectedProduct.id,
          quantity: num,
          notes: notesInput || undefined,
        });
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to add stock');
        } else {
          setProducts((prev) =>
            prev.map((item) => (item.id === selectedProduct.id ? (res.data as ProductWithCategory) : item))
          );
          setActiveModal(null);
        }
      } else if (activeModal === 'UPDATE') {
        const res = await updateStockAction({
          productId: selectedProduct.id,
          stock: num,
          notes: notesInput || undefined,
        });
        if (!res.success) {
          setErrorMessage(res.error || 'Failed to update stock');
        } else {
          setProducts((prev) =>
            prev.map((item) => (item.id === selectedProduct.id ? (res.data as ProductWithCategory) : item))
          );
          setActiveModal(null);
        }
      }
    });
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase().trim());

    let matchesFilter = true;
    if (stockFilter === 'in_stock') matchesFilter = p.stock > p.minStock;
    else if (stockFilter === 'low_stock') matchesFilter = p.stock > 0 && p.stock <= p.minStock;
    else if (stockFilter === 'out_of_stock') matchesFilter = p.stock <= 0;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Inventory Management</h2>
        <p className="text-xs text-slate-500 mt-1">
          Track current stock, add product intake, perform inventory corrections, and monitor low-stock thresholds
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Stock Units</p>
          <h4 className="mt-1 text-2xl font-bold text-slate-900">{summary.totalStockUnits}</h4>
          <p className="mt-0.5 text-[11px] text-slate-400">physical units on hand</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Catalog Size</p>
          <h4 className="mt-1 text-2xl font-bold text-indigo-600">{summary.totalProducts}</h4>
          <p className="mt-0.5 text-[11px] text-slate-400">active products</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Low Stock Items</p>
          <h4 className="mt-1 text-2xl font-bold text-amber-600">{summary.lowStockCount}</h4>
          <p className="mt-0.5 text-[11px] text-slate-400">at or below minimum</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Out of Stock</p>
          <h4 className="mt-1 text-2xl font-bold text-rose-600">{summary.outOfStockCount}</h4>
          <p className="mt-0.5 text-[11px] text-slate-400">zero units remaining</p>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stock by product name..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs self-start sm:self-auto">
          <button
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              stockFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Products
          </button>
          <button
            onClick={() => setStockFilter('in_stock')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              stockFilter === 'in_stock'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            In Stock
          </button>
          <button
            onClick={() => setStockFilter('low_stock')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              stockFilter === 'low_stock' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Low Stock ({summary.lowStockCount})
          </button>
          <button
            onClick={() => setStockFilter('out_of_stock')}
            className={`px-3 py-1 rounded-md font-medium transition ${
              stockFilter === 'out_of_stock' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Out of Stock ({summary.outOfStockCount})
          </button>
        </div>
      </div>

      {/* Inventory Table & Mobile Cards */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/75 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 font-semibold">Product</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold text-center">Stock / Threshold</th>
                <th className="py-3 px-4 font-semibold text-center">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Stock Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Boxes className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    No inventory records match your criteria.
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
                      <td className="py-3 px-4 text-slate-500">{p.category?.name || 'Uncategorized'}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900'
                            }`}
                          >
                            {p.stock}
                          </span>
                          <span className="text-[10px] text-slate-400">/ min {p.minStock}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOut ? (
                          <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                            Out of Stock
                          </Badge>
                        ) : isLow ? (
                          <Badge variant="warning" className="text-[10px] px-2 py-0.5">
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px] px-2 py-0.5">
                            In Stock
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAddModal(p)}
                            className="h-7 text-xs gap-1 px-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                          >
                            <PlusCircle className="h-3 w-3" />
                            <span>Add Stock</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openUpdateModal(p)}
                            className="h-7 text-xs gap-1 px-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Set Count</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Inventory Cards (< md screens) */}
        <div className="divide-y divide-slate-100 md:hidden">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Boxes className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-medium">No inventory records found.</p>
            </div>
          ) : (
            filteredProducts.map((p) => {
              const isOut = p.stock <= 0;
              const isLow = p.stock > 0 && p.stock <= p.minStock;
              const valuation = p.stock * Number(p.purchasePrice);

              return (
                <div key={p.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider block">
                        {p.category?.name || 'Uncategorized'}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">{p.name}</h4>
                    </div>
                    {isOut ? (
                      <Badge variant="destructive" className="text-[10px] px-2 py-0.5 shrink-0">
                        Out of Stock
                      </Badge>
                    ) : isLow ? (
                      <Badge variant="warning" className="text-[10px] px-2 py-0.5 shrink-0">
                        Low Stock
                      </Badge>
                    ) : (
                      <Badge variant="success" className="text-[10px] px-2 py-0.5 shrink-0">
                        In Stock
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50/80 p-2 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Stock Level</span>
                      <span
                        className={`font-mono font-bold ${
                          isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900'
                        }`}
                      >
                        {p.stock}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">/ min {p.minStock}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Threshold</span>
                      <span className="font-mono text-slate-700">{p.minStock} units</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAddModal(p)}
                      className="h-8 text-xs gap-1.5 px-3 text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-semibold"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>Add Stock</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openUpdateModal(p)}
                      className="h-8 text-xs gap-1.5 px-3 text-slate-700 hover:text-slate-900 hover:bg-slate-100"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Set Count</span>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Stock Modal */}
      <Dialog
        open={activeModal === 'ADD'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title={`Add Stock: ${selectedProduct?.name}`}
        description="Enter the quantity of units received into inventory"
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Quantity to Add *</label>
            <Input
              type="number"
              step="1"
              min="1"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              required
              autoFocus
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Current stock: {selectedProduct?.stock} &bull; New stock will be:{' '}
              <span className="font-bold text-indigo-600">
                {(selectedProduct?.stock || 0) + (parseInt(quantityInput, 10) || 0)}
              </span>
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Notes / Supplier Ref (Optional)</label>
            <Input
              type="text"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="e.g. Received from Supplier / Batch 102"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveModal(null)}
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
              Add Stock
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Update / Set Stock Modal */}
      <Dialog
        open={activeModal === 'UPDATE'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title={`Set Inventory Count: ${selectedProduct?.name}`}
        description="Directly update physical stock count"
        maxWidth="max-w-sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">New Total Stock *</label>
            <Input
              type="number"
              step="1"
              min="0"
              value={quantityInput}
              onChange={(e) => setQuantityInput(e.target.value)}
              required
              autoFocus
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Minimum alert threshold is {selectedProduct?.minStock}.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Reason / Notes (Optional)</label>
            <Input
              type="text"
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="e.g. Stock recount adjustment"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveModal(null)}
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
              Update Stock Count
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
