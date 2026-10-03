import { NextRequest, NextResponse } from 'next/server';
import { parseDateRange, ReportService, DatePreset } from '@/services/report.service';
import { generateCsv } from '@/lib/export-csv';
import { getAuthSession } from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const user = await getAuthSession();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const clientIp = getClientIp(req.headers);
  const limiter = rateLimit(`export:${user.id}:${clientIp}`, {
    limit: 15,
    windowMs: 60_000,
  });

  if (!limiter.success) {
    return new NextResponse('Too many export requests. Please wait a minute and try again.', {
      status: 429,
      headers: {
        'Retry-After': String(limiter.reset - Math.floor(Date.now() / 1000)),
      },
    });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'sales';
  const preset = (searchParams.get('preset') as DatePreset) || 'monthly';
  const customStart = searchParams.get('startDate') || undefined;
  const customEnd = searchParams.get('endDate') || undefined;

  const { start, end } = parseDateRange(preset, customStart, customEnd);

  if (type === 'sales') {
    const sales = await ReportService.getSalesReport(start, end);
    const headers = ['Sale Number', 'Date', 'Total Items Sold', 'Products Sold'];
    const rows = sales.map((s) => [
      s.saleNumber,
      s.date.toISOString().slice(0, 19).replace('T', ' '),
      s.itemCount,
      s.items.map((i) => `${i.quantity}x ${i.productName}`).join('; '),
    ]);

    const csv = generateCsv(headers, rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="sales-report-${preset}.csv"`,
      },
    });
  }

  if (type === 'inward' || type === 'added-inventory') {
    const inwardReport = await ReportService.getAddedInventoryReport(start, end);
    const headers = ['Inward #', 'Date', 'Product Name', 'Category', 'Units Added', 'Type', 'Notes'];
    const rows = inwardReport.items.map((r) => [
      r.inwardNumber,
      new Date(r.date).toISOString().slice(0, 19).replace('T', ' '),
      r.productName,
      r.category,
      r.quantity,
      r.type,
      r.notes,
    ]);

    const csv = generateCsv(headers, rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="added-inventory-report-${preset}.csv"`,
      },
    });
  }

  if (type === 'inventory') {
    const inventory = await ReportService.getInventoryReport();
    const headers = [
      'Product Name',
      'Category',
      'Current Stock',
      'Min Stock Alert',
      'Status',
      'Date Added',
    ];
    const rows = inventory.map((p) => [
      p.name,
      p.category,
      p.stock,
      p.minStock,
      p.status,
      new Date(p.createdAt).toISOString().slice(0, 10),
    ]);

    const csv = generateCsv(headers, rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="inventory-report.csv"`,
      },
    });
  }

  if (type === 'products') {
    const products = await ReportService.getProductSalesReport(start, end);
    const headers = ['Product Name', 'Category', 'Units Sold'];
    const rows = products.map((p) => [
      p.name,
      p.category,
      p.unitsSold,
    ]);

    const csv = generateCsv(headers, rows);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="product-sales-report-${preset}.csv"`,
      },
    });
  }

  return new NextResponse('Invalid report type', { status: 400 });
}
