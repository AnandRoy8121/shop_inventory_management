'use client';

import { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateShopSettingsAction } from '@/server/actions/settings.actions';
import { ShopSettings } from '@prisma/client';
import { CheckCircle2, AlertCircle, Store } from 'lucide-react';

interface SettingsFormProps {
  settings: ShopSettings;
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [shopName, setShopName] = useState(settings.shopName);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [currencyCode, setCurrencyCode] = useState(settings.currencyCode);
  const [taxRatePercent, setTaxRatePercent] = useState(Number(settings.taxRatePercent));
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter || '');
  const [lowStockDefault, setLowStockDefault] = useState(settings.lowStockDefault);

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const res = await updateShopSettingsAction({
        shopName: shopName.trim(),
        currencySymbol: currencySymbol.trim(),
        currencyCode: currencyCode.trim().toUpperCase(),
        taxRatePercent: Number(taxRatePercent),
        invoicePrefix: invoicePrefix.trim().toUpperCase(),
        receiptFooter: receiptFooter.trim() || undefined,
        lowStockDefault: Number(lowStockDefault),
      });

      if (!res.success) {
        setError(res.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
      }
    });
  };

  return (
    <Card className="max-w-2xl border border-slate-200">
      <CardHeader>
        <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Store className="h-4 w-4 text-indigo-600" />
          Store Identity & POS Configuration
        </CardTitle>
        <p className="text-xs text-slate-500">
          Configure branding, tax calculations, invoice numbering, and low-stock alert thresholds
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Store / Shop Display Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. Apex Retail & Mart"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Currency Symbol</label>
              <Input
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="$"
                maxLength={5}
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Currency Code</label>
              <Input
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                placeholder="USD"
                maxLength={5}
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Sales Tax Rate (%) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRatePercent}
                onChange={(e) => setTaxRatePercent(parseFloat(e.target.value) || 0)}
                placeholder="8.5"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Invoice Number Prefix
              </label>
              <Input
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="INV"
                maxLength={10}
                required
              />
            </div>

            <div className="col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Default Low-Stock Alert Threshold
              </label>
              <Input
                type="number"
                min="1"
                value={lowStockDefault}
                onChange={(e) => setLowStockDefault(parseInt(e.target.value) || 5)}
                placeholder="5"
                required
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Products with remaining stock equal to or below this amount will trigger warnings.
              </p>
            </div>

            <div className="col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Receipt Footer Message
              </label>
              <textarea
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:outline-indigo-500"
                placeholder="e.g. Thank you for your patronage! Returns accepted within 14 days with receipt."
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 rounded-md bg-rose-50 p-2.5 text-xs text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {saved && (
            <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 p-2.5 text-xs text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Shop settings updated successfully.</span>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              type="submit"
              isLoading={isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Save Configuration
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
