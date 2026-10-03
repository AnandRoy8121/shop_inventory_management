import prisma from '@/lib/prisma';

export interface StockWarning {
  productId: string;
  productName: string;
  remainingStock: number;
  minStock: number;
  isOutOfStock: boolean;
  message: string;
}

export interface SaleCheckoutItem {
  productId: string;
  quantity: number;
  unitPrice?: number;
}

export class SaleService {
  /**
   * Records a sale transaction, decrements inventory atomically,
   * prevents negative stock, and detects low-stock warnings.
   */
  static async recordSale(items: SaleCheckoutItem[]) {
    if (!items || items.length === 0) {
      throw new Error('At least one product is required to record a sale');
    }

    return prisma.$transaction(async (tx) => {
      const productIds = items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        throw new Error('One or more selected products could not be found');
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      // 1. Validate availability & prevent negative inventory
      for (const item of items) {
        const product = productMap.get(item.productId)!;
        if (!product.isActive) {
          throw new Error(`Product "${product.name}" is inactive and cannot be sold`);
        }
        if (product.stock < item.quantity) {
          throw new Error(
            `Insufficient stock for "${product.name}". Requested: ${item.quantity}, Available: ${product.stock}`
          );
        }
      }

      // 2. Compute totals and line item snapshots
      let totalAmount = 0;
      let totalCost = 0;
      const saleItemsData: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitCost: number;
        unitPrice: number;
        subtotal: number;
      }> = [];

      const warnings: StockWarning[] = [];

      for (const item of items) {
        const product = productMap.get(item.productId)!;
        const linePrice =
          item.unitPrice !== undefined && item.unitPrice !== null
            ? Number(item.unitPrice)
            : Number(product.sellingPrice);
        const lineCost = Number(product.purchasePrice);
        const subtotal = linePrice * item.quantity;

        totalAmount += subtotal;
        totalCost += lineCost * item.quantity;

        saleItemsData.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitCost: lineCost,
          unitPrice: linePrice,
          subtotal,
        });

        // 3. Decrement stock
        const updated = await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: item.quantity } },
        });

        // 4. Check for low-stock / out-of-stock condition
        if (updated.stock <= 0) {
          warnings.push({
            productId: updated.id,
            productName: updated.name,
            remainingStock: 0,
            minStock: updated.minStock,
            isOutOfStock: true,
            message: `Out of stock: ${updated.name} has 0 units remaining.`,
          });
        } else if (updated.stock <= updated.minStock) {
          warnings.push({
            productId: updated.id,
            productName: updated.name,
            remainingStock: updated.stock,
            minStock: updated.minStock,
            isOutOfStock: false,
            message: `Low stock: ${updated.name} has only ${updated.stock} units remaining (threshold: ${updated.minStock}).`,
          });
        }
      }

      const profit = totalAmount - totalCost;
      const saleNumber = `SALE-${Date.now().toString().slice(-6)}`;

      // 5. Create Sale and associated SaleItems
      const sale = await tx.sale.create({
        data: {
          saleNumber,
          totalAmount: Number(totalAmount.toFixed(2)),
          totalCost: Number(totalCost.toFixed(2)),
          profit: Number(profit.toFixed(2)),
          items: {
            create: saleItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      return {
        sale,
        warnings,
      };
    });
  }

  static async listSales(limit = 50) {
    return prisma.sale.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        items: true,
      },
    });
  }

  static async getSale(id: string) {
    return prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });
  }
}
