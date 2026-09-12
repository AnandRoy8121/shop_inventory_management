'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { DateFilterPreset } from '@/lib/dates';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const PRESETS: Array<{ label: string; value: DateFilterPreset }> = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Custom', value: 'custom' },
];

export function DateFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPreset = (searchParams.get('preset') as DateFilterPreset) || 'this_month';
  const [showCustom, setShowCustom] = useState(currentPreset === 'custom');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');

  const handleSelectPreset = (preset: DateFilterPreset) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('preset', preset);

    if (preset === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      params.delete('startDate');
      params.delete('endDate');
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('preset', 'custom');
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <span className="flex items-center gap-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Calendar className="h-3.5 w-3.5" />
          Filter:
        </span>
        {PRESETS.map((p) => {
          const active = currentPreset === p.value;
          return (
            <button
              key={p.value}
              onClick={() => handleSelectPreset(p.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {showCustom && (
        <form onSubmit={handleApplyCustom} className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 rounded-md border border-slate-200 px-2 text-xs text-slate-700 focus:outline-indigo-500"
            required
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 rounded-md border border-slate-200 px-2 text-xs text-slate-700 focus:outline-indigo-500"
            required
          />
          <Button size="sm" type="submit" className="h-8 text-xs bg-indigo-600">
            Apply
          </Button>
        </form>
      )}
    </div>
  );
}
