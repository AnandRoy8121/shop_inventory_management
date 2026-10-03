'use client';

import React, { useState } from 'react';
import { Download, FileText, BarChart3, Boxes, PackagePlus, Calendar, ArrowDownRight, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DateFilterBar } from '@/components/shared/date-filter-bar';
import { useSearchParams } from 'next/navigation';

export interface InwardItem {
  id: string;
  inwardNumber: string;
  date: Date;
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  type: string;
  notes: string;
}

export interface AddedInventoryReportData {
  totalIntakes: number;
  totalUnitsAdded: number;
  uniqueProductsAdded: number;
  items: InwardItem[];
  productBreakdown: Array<{
    productId: string;
    name: string;
    category: string;
    unitsAdded: number;
    intakeCount: number;
  }>;
}

interface ReportManagerProps {
  salesReport: Array<{
    id: string;
    saleNumber: string;
    date: Date;
    itemCount: number;
    totalAmount: number;
    totalCost: number;
    profit: number;
    items: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }>;
  }>;
  addedInventoryReport: AddedInventoryReportData;
  inventoryReport: Array<{
    id: string;
    name: string;
    category: string;
    stock: number;
    minStock: number;
    status: string;
    createdAt?: Date;
  }>;
  productSalesReport: Array<{
    productId: string;
    name: string;
    category: string;
    unitsSold: number;
  }>;
}

export function ReportManager({
  salesReport,
  addedInventoryReport,
  inventoryReport,
  productSalesReport,
}: ReportManagerProps) {
  const [activeTab, setActiveTab] = useState<'sales' | 'inward' | 'inventory' | 'products'>('sales');
  const searchParams = useSearchParams();

  const currentPreset = searchParams.get('preset') || 'monthly';
  const customStart = searchParams.get('startDate') || '';
  const customEnd = searchParams.get('endDate') || '';

  const getCsvUrl = (type: string) => {
    const params = new URLSearchParams();
    params.set('type', type);
    params.set('preset', currentPreset);
    if (customStart) params.set('startDate', customStart);
    if (customEnd) params.set('endDate', customEnd);
    return `/api/reports/export-csv?${params.toString()}`;
  };

  // Sales Summary
  const totalUnitsSold = salesReport.reduce((sum, s) => sum + s.itemCount, 0);

  // Inventory Summary
  const totalStockUnits = inventoryReport.reduce((sum, p) => sum + p.stock, 0);
  const lowStockCount = inventoryReport.filter((p) => p.status === 'Low Stock').length;
  const outOfStockCount = inventoryReport.filter((p) => p.status === 'Out of Stock').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Analytics</h2>
          <p className="text-xs text-slate-500 mt-1">
            Review date-filtered sales, added inventory intake reports, product velocity, and download clean CSV records
          </p>
        </div>

        <a href={getCsvUrl(activeTab)} download>
          <Button className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 shadow-xs font-semibold text-xs">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
        </a>
      </div>

      {/* Date Filter Bar */}
      <DateFilterBar />

      {/* Report Type Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'sales'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Sold Report ({salesReport.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('inward')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'inward'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PackagePlus className="h-4 w-4" />
          <span>Added Inventory Report ({addedInventoryReport?.items?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'inventory'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>Current Stock ({inventoryReport.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'products'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Product Velocity ({productSalesReport.length})</span>
        </button>
      </div>

      {/* TAB 1: Sold Report */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs font-medium text-slate-500">Total Sales Recorded</p>
              <h4 className="mt-1 text-2xl font-bold text-slate-900">{salesReport.length}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Transactions in period</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs font-medium text-slate-500">Total Units Sold</p>
              <h4 className="mt-1 text-2xl font-bold text-indigo-600">{totalUnitsSold}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Physical items dispatched</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs col-span-2 sm:col-span-1">
              <p className="text-xs font-medium text-slate-500">Avg. Units / Transaction</p>
              <h4 className="mt-1 text-2xl font-bold text-slate-700">
                {salesReport.length > 0 ? (totalUnitsSold / salesReport.length).toFixed(1) : '0'}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Basket size</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/75 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Sale #</th>
                    <th className="py-3 px-4 font-semibold">Date & Time</th>
                    <th className="py-3 px-4 font-semibold">Products Sold</th>
                    <th className="py-3 px-4 font-semibold text-right">Total Units</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesReport.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        No sales found for the selected period.
                      </td>
                    </tr>
                  ) : (
                    salesReport.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">{s.saleNumber}</td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(s.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <div className="flex flex-wrap gap-1.5">
                            {s.items.map((i, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-800"
                              >
                                <span className="font-bold text-indigo-600">{i.quantity}×</span>
                                <span>{i.productName}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {s.itemCount} units
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Added Inventory Report (Mirroring Sold Report) */}
      {activeTab === 'inward' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs font-medium text-slate-500">Total Inward Batches</p>
              <h4 className="mt-1 text-2xl font-bold text-slate-900">
                {addedInventoryReport?.totalIntakes || 0}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Restock & intake events</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs font-medium text-slate-500">Total Units Added</p>
              <h4 className="mt-1 text-2xl font-bold text-emerald-600">
                +{addedInventoryReport?.totalUnitsAdded || 0}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Physical units received</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs col-span-2 sm:col-span-1">
              <p className="text-xs font-medium text-slate-500">Products Restocked</p>
              <h4 className="mt-1 text-2xl font-bold text-indigo-600">
                {addedInventoryReport?.uniqueProductsAdded || 0}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Distinct catalog items</p>
            </div>
          </div>

          {/* Inward History Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800">Inventory Intake Log</h3>
                <p className="text-[11px] text-slate-500">
                  Exact dates, products, and quantities of inventory added to the shop
                </p>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {addedInventoryReport?.items?.length || 0} records
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/75 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Inward #</th>
                    <th className="py-3 px-4 font-semibold">Date & Time Added</th>
                    <th className="py-3 px-4 font-semibold">Product Name</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold text-right">Units Added</th>
                    <th className="py-3 px-4 font-semibold text-center">Intake Type</th>
                    <th className="py-3 px-4 font-semibold">Notes / Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!addedInventoryReport?.items || addedInventoryReport.items.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No inventory additions recorded for this date period.
                      </td>
                    </tr>
                  ) : (
                    addedInventoryReport.items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">{item.inwardNumber}</td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {new Date(item.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{item.productName}</td>
                        <td className="py-3 px-4 text-slate-500">{item.category}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                          +{item.quantity} units
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              item.type === 'INITIAL_STOCK'
                                ? 'bg-blue-100 text-blue-700'
                                : item.type === 'RESTOCK'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {item.type === 'INITIAL_STOCK'
                              ? 'Initial Stock'
                              : item.type === 'RESTOCK'
                              ? 'Restock'
                              : 'Adjustment'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 italic text-[11px] max-w-[200px] truncate">
                          {item.notes}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Product Added Velocity Breakdown */}
          {addedInventoryReport?.productBreakdown && addedInventoryReport.productBreakdown.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
                <h3 className="text-xs font-bold text-slate-800">Added Quantity by Product</h3>
                <p className="text-[11px] text-slate-500">Aggregated intake volume for each product</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50/75 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Product</th>
                      <th className="py-3 px-4 font-semibold">Category</th>
                      <th className="py-3 px-4 font-semibold text-center">Restock Count</th>
                      <th className="py-3 px-4 font-semibold text-right">Total Units Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {addedInventoryReport.productBreakdown.map((p) => (
                      <tr key={p.productId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{p.name}</td>
                        <td className="py-3 px-4 text-slate-500">{p.category}</td>
                        <td className="py-3 px-4 text-center text-slate-600">{p.intakeCount} times</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                          +{p.unitsAdded} units
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Current Stock Report */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs font-medium text-slate-500">Catalog Size</p>
              <h4 className="mt-1 text-2xl font-bold text-slate-900">{inventoryReport.length}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Active products</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs font-medium text-slate-500">Units in Stock</p>
              <h4 className="mt-1 text-2xl font-bold text-indigo-600">{totalStockUnits}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">On shelves / storage</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs font-medium text-slate-500">Low Stock Alerts</p>
              <h4 className="mt-1 text-2xl font-bold text-amber-600">{lowStockCount}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">At or below threshold</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs font-medium text-slate-500">Out of Stock</p>
              <h4 className="mt-1 text-2xl font-bold text-rose-600">{outOfStockCount}</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Zero units remaining</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/75 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Product Name</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold text-center">Current Stock</th>
                    <th className="py-3 px-4 font-semibold text-center">Min Alert</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Date Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventoryReport.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">{p.name}</td>
                      <td className="py-3 px-4 text-slate-500">{p.category}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">{p.stock}</td>
                      <td className="py-3 px-4 text-center text-slate-400">{p.minStock}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            p.status === 'Out of Stock'
                              ? 'bg-rose-100 text-rose-800'
                              : p.status === 'Low Stock'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Product Sales Performance */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/75 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Product</th>
                    <th className="py-3 px-4 font-semibold">Category</th>
                    <th className="py-3 px-4 font-semibold text-right">Units Sold</th>
                    <th className="py-3 px-4 font-semibold text-right">% of Total Sold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productSalesReport.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        No product sales recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    productSalesReport.map((p) => {
                      const percentage =
                        totalUnitsSold > 0
                          ? ((p.unitsSold / totalUnitsSold) * 100).toFixed(1)
                          : '0.0';

                      return (
                        <tr key={p.productId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">{p.name}</td>
                          <td className="py-3 px-4 text-slate-500">{p.category}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600">
                            {p.unitsSold} units
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {percentage}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
