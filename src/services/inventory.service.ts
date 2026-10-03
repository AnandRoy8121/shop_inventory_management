import prisma from '@/lib/prisma';

export class InventoryService {
  /**
   * Add stock to an existing product (intake/restock)
   */
  static async addStock(productId: string, quantity: number, notes?: string) {
    if (quantity <= 0) {
      throw new Error('Quantity to add must be greater than zero');
    }

    return prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: productId },
        data: { stock: { increment: quantity } },
        include: { category: true },
      });

      const inwardNumber = `INW-${Date.now().toString().slice(-6)}`;
      await tx.stockInward.create({
        data: {
          inwardNumber,
          productId: product.id,
          productName: product.name,
          quantity,
          type: 'RESTOCK',
          notes: notes || 'Stock intake / replenishment',
        },
      });

      return product;
    });
  }

  /**
   * Directly update stock quantity (inventory count correction)
   */
  static async updateStock(productId: string, newStock: number, notes?: string) {
    if (newStock < 0) {
      throw new Error('Stock quantity cannot be negative');
    }

    return prisma.$transaction(async (tx) => {
      const current = await tx.product.findUniqueOrThrow({ where: { id: productId } });
      const diff = newStock - current.stock;

      const updated = await tx.product.update({
        where: { id: productId },
        data: { stock: newStock },
        include: { category: true },
      });

      if (diff > 0) {
        const inwardNumber = `INW-${Date.now().toString().slice(-6)}`;
        await tx.stockInward.create({
          data: {
            inwardNumber,
            productId: updated.id,
            productName: updated.name,
            quantity: diff,
            type: 'ADJUSTMENT',
            notes: notes || `Stock adjusted from ${current.stock} to ${newStock}`,
          },
        });
      }

      return updated;
    });
  }

  /**
   * Fetch all active products running low or out of stock
   */
  static async getLowStockProducts() {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { stock: 'asc' },
    });

    return products
      .filter((p) => p.stock <= p.minStock)
      .map((p) => ({
        ...p,
        purchasePrice: Number(p.purchasePrice),
        sellingPrice: Number(p.sellingPrice),
      }));
  }

  /**
   * Aggregates total inventory valuation and counts
   */
  static async getInventorySummary() {
    const products = await prisma.product.findMany({
      where: { isActive: true },
    });

    let totalStockUnits = 0;
    let inventoryValuation = 0; // sum of (stock * purchasePrice)
    let potentialRetailValue = 0; // sum of (stock * sellingPrice)
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      totalStockUnits += p.stock;
      inventoryValuation += p.stock * Number(p.purchasePrice);
      potentialRetailValue += p.stock * Number(p.sellingPrice);

      if (p.stock <= 0) {
        outOfStockCount++;
      } else if (p.stock <= p.minStock) {
        lowStockCount++;
      }
    }

    return {
      totalProducts: products.length,
      totalStockUnits,
      inventoryValuation: Number(inventoryValuation.toFixed(2)),
      potentialRetailValue: Number(potentialRetailValue.toFixed(2)),
      lowStockCount,
      outOfStockCount,
      totalAlerts: lowStockCount + outOfStockCount,
    };
  }
}
