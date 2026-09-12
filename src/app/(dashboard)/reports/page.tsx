import { ReportService } from '@/server/services/report.service';
import { getDateRangeFromPreset, DateFilterPreset } from '@/lib/dates';
import { ReportCenter } from '@/components/reports/report-center';
import prisma from '@/server/db/prisma';

interface PageProps {
  searchParams: Promise<{
    preset?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const preset = (params.preset as DateFilterPreset) || 'this_month';
  const customStart = params.startDate;
  const customEnd = params.endDate;

  const dateRange = getDateRangeFromPreset(preset, customStart, customEnd);

  const [metrics, settings] = await Promise.all([
    ReportService.getDashboardMetrics(dateRange),
    prisma.shopSettings.findUnique({ where: { id: 'default' } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Financial Reports & Analytics
        </h2>
        <p className="text-xs text-slate-500">
          Analyze sales velocity, COGS (Cost of Goods Sold), profit margins, and stream CSV exports
        </p>
      </div>

      <ReportCenter
        metrics={metrics}
        currencySymbol={settings?.currencySymbol || '$'}
        initialPreset={preset}
      />
    </div>
  );
}
