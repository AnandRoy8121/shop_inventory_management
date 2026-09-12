import { Prisma, SaleStatus } from '@prisma/client';
import prisma from '../db/prisma';
import {
  toDecimal,
  addDecimals,
  mulDecimals,
  calculateProfit,
  calculateMarginPercent,
  toNumber,
} from '@/lib/decimal';
import { format, eachDayOfInterval, isSameDay } from 'date-fns';

export interface DashboardMetrics {
  totalRevenue: number;
  grossProfit: number;
  profitMarginPercent: number;
  totalOrders: number;
  totalItemsSold: number;
  averageOrderValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  timeSeriesData: Array<{
    date: string;
    label: string;
    revenue: number;
    profit: number;
    orders: number;
  }>;
  categoryBreakdown: Array<{
    name: string;
    revenue: number;
    itemsSold: number;
  }>;
  topSellingProducts: Array<{
    productId: string;
    name: string;
    sku: string;
    quantitySold: number;
    totalRevenue: number;
  }>;
}

export class ReportService {
  /**
   * Get complete aggregated dashboard metrics for any date range
   */
  static async getDashboardMetrics(dateRange: {
    startDate: Date;
    endDate: Date;
  }): Promise<DashboardMetrics> {
    const { startDate, endDate } = dateRange;

    // 1. Fetch completed sales in date range
    const sales = await prisma.sale.findMany({
      where: {
        status: SaleStatus.COMPLETED,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 2. Fetch inventory health alerts
    const [outOfStockCount, allProducts] = await Promise.all([
      prisma.product.count({
        where: { isActive: true, deletedAt: null, stock: { lte: 0 } },
      }),
      prisma.product.findMany({
        where: { isActive: true, deletedAt: null, stock: { gt: 0 } },
        select: { stock: true, minStockAlert: true },
      }),
    ]);

    const lowStockCount = allProducts.filter((p) => p.stock <= p.minStockAlert).length;

    // 3. Aggregate totals using safe decimal math
    let totalRevenueDec = toDecimal(0);
    let totalCogsDec = toDecimal(0);
    let totalItemsSold = 0;

    const productMap = new Map<
      string,
      { productId: string; name: string; sku: string; quantity: number; revenue: Prisma.Decimal }
    >();

    const categoryMap = new Map<string, { revenue: Prisma.Decimal; items: number }>();

    for (const sale of sales) {
      totalRevenueDec = addDecimals(totalRevenueDec, sale.grandTotal);

      for (const item of sale.items) {
        totalItemsSold += item.quantity;

        // Line COGS = quantity * costPrice (snapshotted at sale)
        const lineCogs = mulDecimals(item.quantity, item.costPrice);
        totalCogsDec = addDecimals(totalCogsDec, lineCogs);

        // Track top products
        const existingProd = productMap.get(item.productId);
        if (existingProd) {
          existingProd.quantity += item.quantity;
          existingProd.revenue = addDecimals(
            existingProd.revenue,
            item.subtotal
          ) as unknown as Prisma.Decimal;
        } else {
          productMap.set(item.productId, {
            productId: item.productId,
            name: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            revenue: item.subtotal,
          });
        }

        // Track category breakdown
        const catName = item.product.category?.name || 'Uncategorized';
        const existingCat = categoryMap.get(catName);
        if (existingCat) {
          existingCat.items += item.quantity;
          existingCat.revenue = addDecimals(
            existingCat.revenue,
            item.subtotal
          ) as unknown as Prisma.Decimal;
        } else {
          categoryMap.set(catName, {
            items: item.quantity,
            revenue: item.subtotal,
          });
        }
      }
    }

    const grossProfitDec = calculateProfit(totalRevenueDec, totalCogsDec);
    const profitMarginPercent = calculateMarginPercent(grossProfitDec, totalRevenueDec);
    const totalOrders = sales.length;
    const averageOrderValue = totalOrders > 0 ? toNumber(totalRevenueDec) / totalOrders : 0;

    // 4. Time series daily breakdown
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const timeSeriesData = days.map((day) => {
      const salesOnDay = sales.filter((s) => isSameDay(s.createdAt, day));
      let dayRev = toDecimal(0);
      let dayCogs = toDecimal(0);

      for (const sale of salesOnDay) {
        dayRev = addDecimals(dayRev, sale.grandTotal);
        for (const item of sale.items) {
          dayCogs = addDecimals(dayCogs, mulDecimals(item.quantity, item.costPrice));
        }
      }

      const dayProfit = calculateProfit(dayRev, dayCogs);

      return {
        date: format(day, 'yyyy-MM-dd'),
        label: format(day, 'MMM d'),
        revenue: toNumber(dayRev),
        profit: toNumber(dayProfit),
        orders: salesOnDay.length,
      };
    });

    // 5. Category breakdown array
    const categoryBreakdown = Array.from(categoryMap.entries()).map(([name, val]) => ({
      name,
      revenue: toNumber(val.revenue as unknown as number),
      itemsSold: val.items,
    }));

    // 6. Top selling products
    const topSellingProducts = Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map((p) => ({
        productId: p.productId,
        name: p.name,
        sku: p.sku,
        quantitySold: p.quantity,
        totalRevenue: toNumber(p.revenue as unknown as number),
      }));

    return {
      totalRevenue: toNumber(totalRevenueDec),
      grossProfit: toNumber(grossProfitDec),
      profitMarginPercent,
      totalOrders,
      totalItemsSold,
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
      lowStockCount,
      outOfStockCount,
      timeSeriesData,
      categoryBreakdown,
      topSellingProducts,
    };
  }

  /**
   * Fetch flat sales rows for CSV export
   */
  static async getSalesCsvRows(dateRange: { startDate: Date; endDate: Date }) {
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      include: {
        customer: true,
        user: true,
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sales.flatMap((sale) =>
      sale.items.map((item) => ({
        invoiceNumber: sale.invoiceNumber,
        date: format(sale.createdAt, 'yyyy-MM-dd HH:mm:ss'),
        status: sale.status,
        cashier: sale.user.name,
        customerName: sale.customer?.name || 'Walk-in',
        customerPhone: sale.customer?.phone || '',
        paymentMethod: sale.paymentMethod,
        productSku: item.sku,
        productName: item.productName,
        quantity: item.quantity,
        unitCost: Number(item.costPrice).toFixed(2),
        unitPrice: Number(item.unitPrice).toFixed(2),
        lineTotal: Number(item.subtotal).toFixed(2),
        saleTax: Number(sale.taxAmount).toFixed(2),
        saleDiscount: Number(sale.discountAmount).toFixed(2),
        saleGrandTotal: Number(sale.grandTotal).toFixed(2),
      }))
    );
  }

  /**
   * Fetch inventory movements for CSV export
   */
  static async getMovementsCsvRows(dateRange: { startDate: Date; endDate: Date }) {
    const movements = await prisma.inventoryMovement.findMany({
      where: {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      include: {
        product: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return movements.map((m) => ({
      date: format(m.createdAt, 'yyyy-MM-dd HH:mm:ss'),
      sku: m.product.sku,
      productName: m.product.name,
      movementType: m.type,
      quantityChange: m.quantityChange > 0 ? `+${m.quantityChange}` : `${m.quantityChange}`,
      stockBefore: m.stockBefore,
      stockAfter: m.stockAfter,
      reason: m.reason || '',
      referenceId: m.referenceId || '',
      performedBy: m.user.name,
    }));
  }
}
