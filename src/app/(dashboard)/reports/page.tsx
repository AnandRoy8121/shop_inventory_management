import { parseDateRange, ReportService, DatePreset } from '@/services/report.service';
import { ReportManager } from '@/components/reports/report-manager';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    preset?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const preset = (params.preset as DatePreset) || 'monthly';
  const customStart = params.startDate;
  const customEnd = params.endDate;

  const { start, end } = parseDateRange(preset, customStart, customEnd);

  const [salesReport, addedInventoryReport, inventoryReport, productSalesReport] = await Promise.all([
    ReportService.getSalesReport(start, end),
    ReportService.getAddedInventoryReport(start, end),
    ReportService.getInventoryReport(),
    ReportService.getProductSalesReport(start, end),
  ]);

  return (
    <ReportManager
      salesReport={salesReport}
      addedInventoryReport={addedInventoryReport}
      inventoryReport={inventoryReport}
      productSalesReport={productSalesReport}
    />
  );
}
