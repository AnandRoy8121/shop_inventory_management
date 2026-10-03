'use client';

import React, { useState, useTransition } from 'react';
import { Product, Category } from '@prisma/client';
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  AlertTriangle,
  ArrowRight,
  Receipt,
  RotateCcw,
  CheckCircle2,
  X,
  ChevronRight,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { recordSaleAction } from '@/app/actions/sale.actions';
import Link from 'next/link';

export type ProductWithCategory = Omit<Product, 'purchasePrice' | 'sellingPrice'> & {
  purchasePrice?: number | any;
  sellingPrice?: number | any;
  category?: Category | null;
};

interface SaleWithItems {
  id: string;
  saleNumber: string;
  totalAmount: number;
  totalCost: number;
  profit: number;
  createdAt: Date;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
}

interface CartItem {
  productId: string;
  quantity: number;
}

interface SalesManagerProps {
  products: ProductWithCategory[];
  categories: Category[];
  initialSales: SaleWithItems[];
}

export function SalesManager({ products, categories, initialSales }: SalesManagerProps) {
  const [sales, setSales] = useState<SaleWithItems[]>(initialSales);
  const [viewMode, setViewMode] = useState<'pos' | 'history'>('pos');

  // POS Catalog Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Post-Sale Warning Dialog
  const [lowStockWarnings, setLowStockWarnings] = useState<
    Array<{
      productId: string;
      productName: string;
      remainingStock: number;
      minStock: number;
      isOutOfStock: boolean;
      message: string;
    }>
  >([]);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [lastSaleNumber, setLastSaleNumber] = useState<string>('');
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filter Catalog Products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase().trim());
    const matchesCategory =
      selectedCategory === 'all' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart Helpers
  const addToCart = (product: ProductWithCategory) => {
    if (product.stock <= 0) return;
    setErrorMessage(null);

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          setErrorMessage(`Cannot add more "${product.name}". Available stock is ${product.stock}.`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            quantity: 1,
          },
        ];
      }
    });
  };

  const incrementQuantity = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setCart((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          if (item.quantity >= product.stock) {
            setErrorMessage(`Maximum stock reached for "${product.name}" (${product.stock} available).`);
            return item;
          }
          return { ...item, quantity: item.quantity + 1 };
        }
        return item;
      })
    );
  };

  const decrementQuantity = (productId: string) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            return { ...item, quantity: item.quantity - 1 };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setErrorMessage(null);
  };

  // Live Totals
  let totalUnits = 0;
  let hasStockError = false;

  for (const item of cart) {
    const prod = products.find((p) => p.id === item.productId);
    if (prod) {
      totalUnits += item.quantity;
      if (item.quantity > prod.stock) {
        hasStockError = true;
      }
    }
  }

  // Checkout Execution
  const handleCheckout = () => {
    if (cart.length === 0) return;
    setErrorMessage(null);

    // Validate available stock
    for (const item of cart) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) {
        setErrorMessage('One or more selected products are invalid.');
        return;
      }
      if (item.quantity > prod.stock) {
        setErrorMessage(
          `Insufficient stock for "${prod.name}". Available: ${prod.stock}, Requested: ${item.quantity}.`
        );
        return;
      }
    }

    startTransition(async () => {
      const res = await recordSaleAction({
        items: cart.map((c) => ({
          productId: c.productId,
          quantity: c.quantity,
          unitPrice: 0,
        })),
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to record sale');
      } else {
        const saleData = res.data!;
        setLastSaleNumber(saleData.saleNumber);
        setCheckoutSuccess(
          `Sale #${saleData.saleNumber} completed successfully (${totalUnits} units dispatched)`
        );

        // Record in local sales state
        const newSale: SaleWithItems = {
          id: saleData.saleId,
          saleNumber: saleData.saleNumber,
          totalAmount: 0,
          totalCost: 0,
          profit: 0,
          createdAt: new Date(),
          items: cart.map((c) => {
            const p = products.find((prod) => prod.id === c.productId)!;
            return {
              id: `${saleData.saleId}-${p.id}`,
              productName: p.name,
              quantity: c.quantity,
              unitPrice: 0,
              subtotal: 0,
            };
          }),
        };

        setSales((prev) => [newSale, ...prev]);
        clearCart();
        setIsMobileCartOpen(false);

        // Check if any product hit low-stock warning threshold
        if (saleData.warnings && saleData.warnings.length > 0) {
          setLowStockWarnings(saleData.warnings);
          setIsWarningModalOpen(true);
        }
      }
    });
  };

  // Reusable Cart Content (Desktop Panel & Mobile Drawer)
  const renderCartItems = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900 text-sm">Active Order Ticket</h3>
        </div>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-[11px] font-medium text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 my-2 pr-1 min-h-[140px] max-h-[360px] lg:max-h-[calc(100vh-380px)]">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
              <ShoppingBag className="h-6 w-6 stroke-1" />
            </div>
            <p className="text-xs font-semibold text-slate-700">Ticket is empty</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click any product to add it to the ticket
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const prod = products.find((p) => p.id === item.productId);
            if (!prod) return null;
            const isAtMaxStock = item.quantity >= prod.stock;

            return (
              <div key={item.productId} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-slate-900 truncate leading-tight">
                    {prod.name}
                  </h4>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Available: {prod.stock} units
                  </span>
                </div>

                {/* Stepper Controls */}
                <div className="flex items-center gap-1 bg-slate-100/90 rounded-lg p-0.5 shrink-0">
                  <button
                    onClick={() => decrementQuantity(item.productId)}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition"
                    title="Decrease quantity"
                    aria-label={`Decrease ${prod.name}`}
                  >
                    <Minus className="h-3 w-3" />
                  </button>

                  <span className="w-7 text-center font-mono text-xs font-bold text-slate-800">
                    {item.quantity}
                  </span>

                  <button
                    onClick={() => incrementQuantity(item.productId)}
                    disabled={isAtMaxStock}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition disabled:opacity-40 disabled:pointer-events-none"
                    title="Increase quantity"
                    aria-label={`Increase ${prod.name}`}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="p-1 rounded text-slate-400 hover:text-rose-600 transition shrink-0"
                  title="Remove from ticket"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Cart Summary & Action */}
      {cart.length > 0 && (
        <div className="pt-3 border-t border-slate-100 space-y-2.5">
          <div className="space-y-1.5 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <div className="flex justify-between text-slate-600">
              <span>Distinct Products:</span>
              <span className="font-semibold text-slate-800">{cart.length} items</span>
            </div>
            <div className="flex justify-between text-slate-800 font-bold text-sm pt-1 border-t border-slate-200/60">
              <span>Total Units to Dispatch:</span>
              <span className="font-mono text-indigo-600">{totalUnits} units</span>
            </div>
          </div>

          <Button
            onClick={handleCheckout}
            disabled={isPending || hasStockError}
            isLoading={isPending}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 active:scale-98 transition rounded-xl"
          >
            <span>Confirm & Complete Sale ({totalUnits} Units)</span>
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Top Header & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sales & Dispatch</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quickly select products, specify quantities, deduct inventory instantly, and view sales history
          </p>
        </div>

        {/* View Toggle Tabs */}
        <div className="inline-flex rounded-xl bg-slate-200/70 p-1 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('pos')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'pos'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Record Sale</span>
          </button>
          <button
            onClick={() => setViewMode('history')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              viewMode === 'history'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="h-3.5 w-3.5" />
            <span>Sales History ({sales.length})</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {checkoutSuccess && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{checkoutSuccess}</span>
          </div>
          <button
            onClick={() => setCheckoutSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold px-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-800 text-xs font-bold px-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* VIEW 1: POS / RECORD SALE VIEW */}
      {viewMode === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Product Catalog & Search (8 cols on lg) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Search and Category Filter Chips */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products by name..."
                  className="pl-9 h-10 text-xs rounded-xl"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                    selectedCategory === 'all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Items
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                      selectedCategory === c.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                  <ShoppingBag className="h-8 w-8 mx-auto text-slate-300 mb-2 stroke-1" />
                  <p className="text-xs font-medium">No products match your search or filter.</p>
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const cartItem = cart.find((i) => i.productId === p.id);
                  const isOut = p.stock <= 0;
                  const isLow = !isOut && p.stock <= p.minStock;

                  return (
                    <div
                      key={p.id}
                      onClick={() => addToCart(p)}
                      role="button"
                      tabIndex={0}
                      className={`relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all select-none min-h-[110px] ${
                        isOut
                          ? 'border-slate-200 bg-slate-50/70 opacity-60 cursor-not-allowed'
                          : 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md active:scale-97 cursor-pointer'
                      } ${cartItem ? 'ring-2 ring-indigo-500 bg-indigo-50/20' : ''}`}
                    >
                      {/* Active Quantity Badge in Corner if in cart */}
                      {cartItem && (
                        <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white shadow-md">
                          {cartItem.quantity}
                        </span>
                      )}

                      <div>
                        {p.category && (
                          <span className="text-[10px] font-medium text-indigo-600 block uppercase tracking-wider truncate mb-1">
                            {p.category.name}
                          </span>
                        )}
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                          {p.name}
                        </h4>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                        <span
                          className={`inline-block text-[11px] font-semibold ${
                            isOut
                              ? 'text-rose-600'
                              : isLow
                              ? 'text-amber-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {isOut ? 'Out of Stock' : `${p.stock} units`}
                        </span>

                        {!isOut && (
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors">
                            <Plus className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Desktop Always-Visible Live Cart Ticket (4 cols on lg) */}
          <div className="hidden lg:block lg:col-span-4 sticky top-20">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {renderCartItems()}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SALES HISTORY LEDGER */}
      {viewMode === 'history' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Sale #</th>
                    <th className="py-3 px-4 font-semibold">Date & Time</th>
                    <th className="py-3 px-4 font-semibold">Products Dispatched</th>
                    <th className="py-3 px-4 font-semibold text-right">Total Units Sold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        <Receipt className="h-8 w-8 mx-auto text-slate-300 mb-2 stroke-1" />
                        No sales recorded yet. Click &quot;Record Sale&quot; to begin.
                      </td>
                    </tr>
                  ) : (
                    sales.map((sale) => {
                      const totalSold = sale.items.reduce((s, i) => s + i.quantity, 0);

                      return (
                        <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            {sale.saleNumber}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                            {new Date(sale.createdAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1.5">
                              {sale.items.map((item, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-800"
                                >
                                  <span className="font-bold text-indigo-600">{item.quantity}×</span>
                                  <span>{item.productName}</span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-600">
                            {totalSold} units
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (< sm screens) */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {sales.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Receipt className="h-8 w-8 mx-auto text-slate-300 mb-2 stroke-1" />
                  <p className="text-xs">No sales recorded yet.</p>
                </div>
              ) : (
                sales.map((sale) => {
                  const totalSold = sale.items.reduce((s, i) => s + i.quantity, 0);

                  return (
                    <div key={sale.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {sale.saleNumber}
                        </span>
                        <span className="font-mono text-xs font-bold text-indigo-600">
                          {totalSold} units sold
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        {new Date(sale.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>

                      <div className="bg-slate-50 rounded-lg p-2 text-xs space-y-1">
                        {sale.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-slate-700">
                            <span>{item.productName}</span>
                            <span className="font-bold text-indigo-600 font-mono">{item.quantity} units</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE FLOATING CART BAR & SLIDE-UP DRAWER */}
      {viewMode === 'pos' && cart.length > 0 && (
        <>
          {/* Floating Pill on bottom of screen on mobile */}
          <div className="fixed bottom-20 inset-x-4 z-30 lg:hidden">
            <button
              onClick={() => setIsMobileCartOpen(true)}
              className="w-full flex items-center justify-between bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl active:scale-98 transition"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-xs">
                  {totalUnits}
                </div>
                <div className="text-left">
                  <span className="text-[11px] text-slate-400 block font-medium">Order Ticket</span>
                  <span className="font-mono text-xs font-bold text-white">
                    {cart.length} distinct items ({totalUnits} units)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                <span>Review Order</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          </div>

          {/* Slide-Up Mobile Cart Modal */}
          {isMobileCartOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
                onClick={() => setIsMobileCartOpen(false)}
              />
              <div className="fixed inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl bg-white p-5 shadow-2xl flex flex-col">
                <div className="flex justify-between items-center pb-2">
                  <div className="h-1 w-10 bg-slate-300 rounded-full mx-auto" />
                  <button
                    onClick={() => setIsMobileCartOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {renderCartItems()}
              </div>
            </div>
          )}
        </>
      )}

      {/* LOW-STOCK WARNING MODAL AFTER SALE */}
      <Dialog
        open={isWarningModalOpen}
        onOpenChange={(open) => !open && setIsWarningModalOpen(false)}
        title="Inventory Attention Required"
        description={`Sale #${lastSaleNumber} completed successfully. The following products have reached low or zero stock.`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50 max-h-52 overflow-y-auto">
            {lowStockWarnings.map((w) => (
              <div key={w.productId} className="p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      w.isOutOfStock
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {w.isOutOfStock ? 'Out of Stock' : 'Low Stock'}
                  </span>
                  <span className="text-xs font-semibold text-slate-900">{w.productName}</span>
                </div>
                <p className="text-xs text-slate-600">{w.message}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link href="/inventory" onClick={() => setIsWarningModalOpen(false)}>
              <Button variant="outline" size="sm" className="text-xs gap-1">
                <span>Go to Inventory</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>

            <Button
              size="sm"
              onClick={() => setIsWarningModalOpen(false)}
              className="text-xs bg-slate-900 hover:bg-slate-800 text-white"
            >
              Acknowledge & Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
