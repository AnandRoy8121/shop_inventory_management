import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/security/auth';
import { ReportService } from '@/server/services/report.service';
import { getDateRangeFromPreset, DateFilterPreset } from '@/lib/dates';
import { stringify } from 'csv-stringify/sync';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    await requireUser();

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get('type') || 'sales';
    const preset = (searchParams.get('preset') as DateFilterPreset) || 'this_month';
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    const dateRange = getDateRangeFromPreset(preset, customStart, customEnd);

    if (type === 'inventory') {
      const rows = await ReportService.getMovementsCsvRows(dateRange);
      const csvContent = stringify(rows, { header: true });

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="inventory-movements-${preset}-${Date.now()}.csv"`,
        },
      });
    } else {
      const rows = await ReportService.getSalesCsvRows(dateRange);
      const csvContent = stringify(rows, { header: true });

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="sales-report-${preset}-${Date.now()}.csv"`,
        },
      });
    }
  } catch (error) {
    console.error('CSV Export Error:', error);
    return new NextResponse('Failed to export CSV. Please ensure you are logged in.', {
      status: 400,
    });
  }
}
