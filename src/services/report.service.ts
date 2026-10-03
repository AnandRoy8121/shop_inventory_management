import prisma from '@/lib/prisma';
import { InventoryService } from './inventory.service';

export type DatePreset = 'today' | 'weekly' | 'monthly' | 'custom';

export function parseDateRange(preset: DatePreset = 'monthly', customStart?: string, customEnd?: string) {
  const now = new Date();

  if (preset === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { start, end };
  }

  if (preset === 'weekly') {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  if (preset === 'custom' && customStart && customEnd) {
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // Default: monthly (current month)
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export class ReportService {
  static async getDashboardMetrics(startDate: Date, endDate: Date) {
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    let totalRevenue = 0;
    let totalProfit = 0;
    let totalProductsSold = 0;

    // Daily buckets for chart
    const dailyMap = new Map<string, { date: string; revenue: number; profit: number; orders: number }>();

    // Product breakdown
    const productStatsMap = new Map<string, { productId: string; name: string; quantity: number; revenue: number }>();

    for (const sale of sales) {
      const revenue = Number(sale.totalAmount);
      const profit = Number(sale.profit);

      totalRevenue += revenue;
      totalProfit += profit;

      const dateKey = sale.createdAt.toISOString().slice(0, 10);
      const existingDay = dailyMap.get(dateKey) || { date: dateKey, revenue: 0, profit: 0, orders: 0 };
      existingDay.revenue += revenue;
      existingDay.profit += profit;
      existingDay.orders += 1;
      dailyMap.set(dateKey, existingDay);

      for (const item of sale.items) {
        totalProductsSold += item.quantity;

        const stat = productStatsMap.get(item.productId) || {
          productId: item.productId,
          name: item.productName,
          quantity: 0,
          revenue: 0,
        };
        stat.quantity += item.quantity;
        stat.revenue += Number(item.subtotal);
        productStatsMap.set(item.productId, stat);
      }
    }

    const [inventorySummary, lowStockProducts, inwardData] = await Promise.all([
      InventoryService.getInventorySummary(),
      InventoryService.getLowStockProducts(),
      prisma.stockInward.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          quantity: true,
        },
      }),
    ]);

    const totalProductsAdded = inwardData._sum.quantity || 0;

    const topSellingProducts = Array.from(productStatsMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      totalSales: sales.length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      totalProductsSold,
      totalProductsAdded,
      dailyTrend: Array.from(dailyMap.values()),
      topSellingProducts,
      inventorySummary,
      lowStockProducts,
    };
  }

  static async getSalesReport(startDate: Date, endDate: Date) {
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sales.map((s) => ({
      id: s.id,
      saleNumber: s.saleNumber,
      date: s.createdAt,
      itemCount: s.items.reduce((sum, i) => sum + i.quantity, 0),
      totalAmount: Number(s.totalAmount),
      totalCost: Number(s.totalCost),
      profit: Number(s.profit),
      items: s.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
    }));
  }

  static async getInventoryReport() {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
    });

    return products.map((p) => {
      const purchasePrice = Number(p.purchasePrice);
      const sellingPrice = Number(p.sellingPrice);
      const stock = p.stock;
      const minStock = p.minStock;
      const valuation = stock * purchasePrice;
      const potentialRevenue = stock * sellingPrice;

      let status = 'In Stock';
      if (!p.isActive) status = 'Inactive';
      else if (stock <= 0) status = 'Out of Stock';
      else if (stock <= minStock) status = 'Low Stock';

      return {
        id: p.id,
        name: p.name,
        category: p.category?.name || 'Uncategorized',
        stock,
        minStock,
        purchasePrice,
        sellingPrice,
        valuation: Number(valuation.toFixed(2)),
        potentialRevenue: Number(potentialRevenue.toFixed(2)),
        status,
        isActive: p.isActive,
        createdAt: p.createdAt,
      };
    });
  }

  static async getProductSalesReport(startDate: Date, endDate: Date) {
    const saleItems = await prisma.saleItem.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        product: {
          include: { category: true },
        },
      },
    });

    const map = new Map<
      string,
      {
        productId: string;
        name: string;
        category: string;
        unitsSold: number;
        totalRevenue: number;
        totalCost: number;
        profit: number;
      }
    >();

    for (const item of saleItems) {
      const revenue = Number(item.subtotal);
      const cost = Number(item.unitCost) * item.quantity;
      const profit = revenue - cost;

      const curr = map.get(item.productId) || {
        productId: item.productId,
        name: item.productName,
        category: item.product?.category?.name || 'Uncategorized',
        unitsSold: 0,
        totalRevenue: 0,
        totalCost: 0,
        profit: 0,
      };

      curr.unitsSold += item.quantity;
      curr.totalRevenue += revenue;
      curr.totalCost += cost;
      curr.profit += profit;

      map.set(item.productId, curr);
    }

    return Array.from(map.values()).sort((a, b) => b.unitsSold - a.unitsSold);
  }

  static async getAddedInventoryReport(startDate: Date, endDate: Date) {
    const records = await prisma.stockInward.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        product: {
          include: { category: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalUnitsAdded = records.reduce((sum, r) => sum + r.quantity, 0);

    const productBreakdownMap = new Map<
      string,
      {
        productId: string;
        name: string;
        category: string;
        unitsAdded: number;
        intakeCount: number;
      }
    >();

    for (const r of records) {
      const existing = productBreakdownMap.get(r.productId) || {
        productId: r.productId,
        name: r.productName,
        category: r.product?.category?.name || 'Uncategorized',
        unitsAdded: 0,
        intakeCount: 0,
      };
      existing.unitsAdded += r.quantity;
      existing.intakeCount += 1;
      productBreakdownMap.set(r.productId, existing);
    }

    const items = records.map((r) => ({
      id: r.id,
      inwardNumber: r.inwardNumber,
      date: r.createdAt,
      createdAt: r.createdAt,
      productId: r.productId,
      productName: r.productName,
      category: r.product?.category?.name || 'Uncategorized',
      quantity: r.quantity,
      type: r.type,
      notes: r.notes || '-',
    }));

    return {
      totalIntakes: records.length,
      totalUnitsAdded,
      uniqueProductsAdded: productBreakdownMap.size,
      items,
      productBreakdown: Array.from(productBreakdownMap.values()).sort(
        (a, b) => b.unitsAdded - a.unitsAdded
      ),
    };
  }
}
