'use client';

import { useState, useTransition } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  CreditCard,
  Banknote,
  QrCode,
  AlertCircle,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { PaymentMethod } from '@prisma/client';
import { createSaleAction } from '@/server/actions/sale.actions';
import { StockAlertEvent } from '@/server/services/sale.service';
import { PostSaleAlertModal } from './post-sale-alert-modal';
import { formatCurrency } from '@/lib/decimal';

export interface PosProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  sellingPrice: number;
  stock: number;
  minStockAlert: number;
  category: { id: string; name: string } | null;
}

export interface PosCustomer {
  id: string;
  name: string;
  phone: string | null;
}

interface PosTerminalProps {
  products: PosProduct[];
  categories: Array<{ id: string; name: string }>;
  customers: PosCustomer[];
  taxRatePercent: number;
  currencySymbol?: string;
  cashierName: string;
}

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  stock: number;
  quantity: number;
}

export function PosTerminal({
  products,
  categories,
  customers,
  taxRatePercent,
  currencySymbol = '$',
  cashierName,
}: PosTerminalProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Receipt Modal State
  const [completedSale, setCompletedSale] = useState<{
    invoiceNumber: string;
    grandTotal: number;
    subtotal: number;
    tax: number;
    discount: number;
    items: CartItem[];
    date: Date;
    paymentMethod: PaymentMethod;
  } | null>(null);

  // Stock Alerts Modal State
  const [stockAlerts, setStockAlerts] = useState<StockAlertEvent[]>([]);
  const [showAlertModal, setShowAlertModal] = useState<boolean>(false);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCategory = !selectedCategory || p.category?.id === selectedCategory;
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.includes(query));
    return matchesCategory && matchesSearch;
  });

  // Cart operations
  const addToCart = (product: PosProduct) => {
    if (product.stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          return prev; // Reached available stock limit
        }
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unitPrice: Number(product.sellingPrice),
          stock: product.stock,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      (prev) =>
        prev
          .map((item) => {
            if (item.productId === productId) {
              const nextQty = item.quantity + delta;
              if (nextQty <= 0) return null;
              if (nextQty > item.stock) return item; // Cannot exceed stock
              return { ...item, quantity: nextQty };
            }
            return item;
          })
          .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setNotes('');
    setErrorMessage(null);
  };

  // Financial calculations
  const rawSubtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const safeDiscount = Math.min(Math.max(0, discount), rawSubtotal);
  const taxable = Math.max(0, rawSubtotal - safeDiscount);
  const tax = (taxable * taxRatePercent) / 100;
  const grandTotal = taxable + tax;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setErrorMessage(null);

    startTransition(async () => {
      const res = await createSaleAction({
        customerId: selectedCustomerId || undefined,
        paymentMethod,
        discountAmount: safeDiscount,
        notes: notes || undefined,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });

      if (!res.success) {
        setErrorMessage(res.error);
        return;
      }

      // Record snapshot for receipt display
      setCompletedSale({
        invoiceNumber: res.data.invoiceNumber,
        grandTotal: res.data.grandTotal,
        subtotal: rawSubtotal,
        tax,
        discount: safeDiscount,
        items: [...cart],
        date: new Date(),
        paymentMethod,
      });

      // Check if checkout triggered low-stock or out-of-stock alerts
      if (res.data.alerts && res.data.alerts.length > 0) {
        setStockAlerts(res.data.alerts);
        setShowAlertModal(true);
      }

      clearCart();
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: Product Catalog & Barcode Scanner */}
      <div className="lg:col-span-8 space-y-4">
        {/* Search & Category Filter Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by product name, SKU, or scan barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 text-sm"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                selectedCategory === null
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Items ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 text-sm">
              No products found matching your search.
            </div>
          ) : (
            filteredProducts.map((product) => {
              const inCart = cart.find((i) => i.productId === product.id);
              const cartQty = inCart ? inCart.quantity : 0;
              const isOutOfStock = product.stock <= 0;
              const isMaxInCart = cartQty >= product.stock;

              return (
                <div
                  key={product.id}
                  onClick={() => !isOutOfStock && !isMaxInCart && addToCart(product)}
                  className={`group relative flex flex-col justify-between rounded-xl border p-3.5 transition-all text-left ${
                    isOutOfStock
                      ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                      : isMaxInCart
                        ? 'border-amber-200 bg-amber-50/40 cursor-default'
                        : 'border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md cursor-pointer'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[11px] font-mono text-slate-400 truncate">
                        {product.sku}
                      </span>
                      {isOutOfStock ? (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          Out of Stock
                        </Badge>
                      ) : product.stock <= product.minStockAlert ? (
                        <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                          Low: {product.stock}
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-medium">
                          {product.stock} in stock
                        </span>
                      )}
                    </div>

                    <h4 className="mt-1.5 text-sm font-semibold text-slate-800 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                      {product.name}
                    </h4>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-base font-bold text-slate-900">
                      {formatCurrency(product.sellingPrice, currencySymbol)}
                    </span>
                    {cartQty > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white shadow-xs">
                        {cartQty}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Cart & Checkout Panel */}
      <div className="lg:col-span-4">
        <Card className="sticky top-20 flex flex-col border-slate-200/80 shadow-md">
          {/* Cart Header */}
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm">Active Cart</h3>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                {cart.reduce((sum, i) => sum + i.quantity, 0)}
              </span>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-rose-500 hover:text-rose-700 transition"
              >
                Clear
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 max-h-[260px] overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Package className="h-8 w-8 stroke-1" />
                <p className="mt-2 text-xs font-medium">Cart is currently empty</p>
                <p className="text-[11px] text-slate-400">Click items on the left to add</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-2.5"
                >
                  <div className="flex-1 overflow-hidden pr-2">
                    <p className="truncate text-xs font-semibold text-slate-800">{item.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {formatCurrency(item.unitPrice, currencySymbol)} ea.
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.productId, -1)}
                      className="rounded-md border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 transition"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold text-slate-800">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, 1)}
                      disabled={item.quantity >= item.stock}
                      className="rounded-md border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="ml-1 text-slate-400 hover:text-rose-600 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Customer & Payment Form */}
          <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/40">
            {/* Customer select */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Customer (Optional)
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-indigo-500"
              >
                <option value="">Walk-in Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { method: PaymentMethod.CASH, label: 'Cash', icon: Banknote },
                  { method: PaymentMethod.CARD, label: 'Card', icon: CreditCard },
                  { method: PaymentMethod.UPI_QR, label: 'UPI / QR', icon: QrCode },
                ].map(({ method, label, icon: Icon }) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border p-1.5 text-xs font-medium transition ${
                      paymentMethod === method
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Discount & Calculations */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200/60 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold">{formatCurrency(rawSubtotal, currencySymbol)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Discount ({currencySymbol}):</span>
                <input
                  type="number"
                  min="0"
                  max={rawSubtotal}
                  value={discount || ''}
                  placeholder="0.00"
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="h-6 w-20 rounded border border-slate-200 bg-white px-1 text-right text-xs"
                />
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Tax ({taxRatePercent}%):</span>
                <span>{formatCurrency(tax, currencySymbol)}</span>
              </div>

              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                <span>Grand Total:</span>
                <span className="text-indigo-600 text-base">
                  {formatCurrency(grandTotal, currencySymbol)}
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-1.5 rounded-md bg-rose-50 p-2 text-xs text-rose-700 border border-rose-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isPending}
              isLoading={isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 font-semibold py-2.5 shadow-sm text-sm"
            >
              Complete Sale ({formatCurrency(grandTotal, currencySymbol)})
            </Button>
          </div>
        </Card>
      </div>

      {/* Checkout Receipt Modal */}
      {completedSale && (
        <Dialog
          open={!!completedSale}
          onOpenChange={() => setCompletedSale(null)}
          title="Sale Completed Successfully"
          description={`Invoice #${completedSale.invoiceNumber}`}
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 font-mono text-xs text-slate-800 space-y-2">
              <div className="text-center border-b border-dashed border-slate-300 pb-2">
                <h4 className="font-bold text-sm">APEX RETAIL MART</h4>
                <p className="text-[11px] text-slate-500">Official Sales Receipt</p>
                <p className="text-[10px] text-slate-400">{completedSale.date.toLocaleString()}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Cashier: {cashierName}</p>
              </div>

              <div className="space-y-1 pt-1">
                {completedSale.items.map((item) => (
                  <div key={item.productId} className="flex justify-between">
                    <span>
                      {item.name} x{item.quantity}
                    </span>
                    <span>{formatCurrency(item.quantity * item.unitPrice, currencySymbol)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 space-y-0.5">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(completedSale.subtotal, currencySymbol)}</span>
                </div>
                {completedSale.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(completedSale.discount, currencySymbol)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Tax ({taxRatePercent}%):</span>
                  <span>{formatCurrency(completedSale.tax, currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-1 border-t border-dashed border-slate-300">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(completedSale.grandTotal, currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                  <span>Payment:</span>
                  <span>{completedSale.paymentMethod}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-1.5" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                <span>Print Receipt</span>
              </Button>
              <Button
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                onClick={() => setCompletedSale(null)}
              >
                New Sale
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Post-Sale Stock Alert Confirmation Dialog */}
      <PostSaleAlertModal
        open={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        alerts={stockAlerts}
        invoiceNumber={completedSale?.invoiceNumber}
      />
    </div>
  );
}
