'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, Layers, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/decimal';
import { DateFilterPreset } from '@/lib/dates';
import { DashboardMetrics } from '@/server/services/report.service';

interface ReportCenterProps {
  metrics: DashboardMetrics;
  currencySymbol?: string;
  initialPreset?: DateFilterPreset;
}

export function ReportCenter({
  metrics,
  currencySymbol = '$',
  initialPreset = 'this_month',
}: ReportCenterProps) {
  const [reportType, setReportType] = useState<'sales' | 'inventory'>('sales');
  const [preset, setPreset] = useState<DateFilterPreset>(initialPreset);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const handleDownloadCsv = () => {
    const params = new URLSearchParams();
    params.set('type', reportType);
    params.set('preset', preset);
    if (preset === 'custom' && customStart && customEnd) {
      params.set('startDate', customStart);
      params.set('endDate', customEnd);
    }
    const a = document.createElement('a');
    a.href = `/api/reports/export-csv?${params.toString()}`;
    a.download = `${reportType}-report.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Selected Revenue</p>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {formatCurrency(metrics.totalRevenue, currencySymbol)}
                </h3>
              </div>
              <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Gross Profit</p>
                <h3 className="text-xl font-bold text-emerald-600 mt-1">
                  {formatCurrency(metrics.grossProfit, currencySymbol)}
                </h3>
              </div>
              <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Profit Margin</p>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {metrics.profitMarginPercent}%
                </h3>
              </div>
              <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Layers className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">Average Order Size</p>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {formatCurrency(metrics.averageOrderValue, currencySymbol)}
                </h3>
              </div>
              <div className="h-9 w-9 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CSV Export Control Panel */}
      <Card className="border-indigo-100 bg-gradient-to-br from-white to-indigo-50/20">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Download className="h-4 w-4 text-indigo-600" />
            Export Data Reports
          </CardTitle>
          <p className="text-xs text-slate-500">
            Generate and stream structured CSV datasets for accounting, tax audits, or spreadsheet
            analysis
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Report Type Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Report Dataset
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReportType('sales')}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-left transition ${
                    reportType === 'sales'
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4 text-indigo-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Sales & Item Ledger</p>
                    <p className="text-[10px] text-slate-500">
                      Invoices, items, unit prices, taxes
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setReportType('inventory')}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-left transition ${
                    reportType === 'inventory'
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="h-4 w-4 text-indigo-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold">Inventory Movement Trail</p>
                    <p className="text-[10px] text-slate-500">
                      Purchases, counts, sales, reversals
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Date Preset Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Date Range Scope
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {[
                  { label: 'Today', value: 'today' },
                  { label: 'Yesterday', value: 'yesterday' },
                  { label: 'This Week', value: 'this_week' },
                  { label: 'This Month', value: 'this_month' },
                  { label: 'Last Month', value: 'last_month' },
                  { label: 'Custom Range', value: 'custom' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPreset(opt.value as DateFilterPreset)}
                    className={`rounded-lg border py-2 text-center font-medium transition ${
                      preset === opt.value
                        ? 'border-indigo-600 bg-indigo-600 text-white font-semibold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {preset === 'custom' && (
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 text-xs">
              <span className="font-medium text-slate-700">Custom Dates:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded border border-slate-200 p-1 text-xs"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded border border-slate-200 p-1 text-xs"
              />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleDownloadCsv}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <Download className="h-4 w-4" />
              <span>Download {reportType === 'sales' ? 'Sales' : 'Inventory'} CSV</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
