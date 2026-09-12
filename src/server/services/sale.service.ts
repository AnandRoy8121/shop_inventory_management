import { Prisma, SaleStatus, MovementType, PaymentMethod } from '@prisma/client';
import prisma from '../db/prisma';
import {
  toDecimal,
  addDecimals,
  subDecimals,
  mulDecimals,
  roundDecimal,
  calculateTax,
} from '@/lib/decimal';
import {
  InsufficientStockError,
  ProductDeactivatedError,
  NotFoundError,
  DomainError,
} from '@/lib/errors';
import { InventoryService } from './inventory.service';
import { AuditService } from './audit.service';

export interface CheckoutItemRequest {
  productId: string;
  quantity: number;
}

export interface StockAlertEvent {
  productId: string;
  productName: string;
  sku: string;
  remainingStock: number;
  minStockAlert: number;
  alertType: 'OUT_OF_STOCK' | 'LOW_STOCK';
  message: string;
}

export interface CreateSaleParams {
  userId: string;
  customerId?: string | null;
  paymentMethod: PaymentMethod;
  discountAmount?: number;
  notes?: string | null;
  items: CheckoutItemRequest[];
}

export class SaleService {
  /**
   * Generates next sequential invoice number safely within transaction
   */
  private static async generateInvoiceNumber(
    tx: Prisma.TransactionClient,
    prefix = 'INV'
  ): Promise<string> {
    const year = new Date().getFullYear();

    // Use PostgreSQL transaction-scoped advisory lock to strictly serialize invoice number allocation
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('sale_invoice_sequence'))`;

    const sales = await tx.sale.findMany({
      where: { invoiceNumber: { startsWith: `${prefix}-${year}-` } },
      select: { invoiceNumber: true },
    });

    let maxSeq = 0;
    for (const s of sales) {
      const parts = s.invoiceNumber.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }

    let nextSeq = maxSeq + 1;
    let candidate = `${prefix}-${year}-${nextSeq.toString().padStart(5, '0')}`;

    let existing = await tx.sale.findUnique({
      where: { invoiceNumber: candidate },
      select: { id: true },
    });
    while (existing) {
      nextSeq++;
      candidate = `${prefix}-${year}-${nextSeq.toString().padStart(5, '0')}`;
      existing = await tx.sale.findUnique({
        where: { invoiceNumber: candidate },
        select: { id: true },
      });
    }

    return candidate;
  }

  /**
   * Process a complete atomic sale checkout
   */
  static async createSale(params: CreateSaleParams) {
    const { userId, customerId, paymentMethod, discountAmount = 0, notes, items } = params;

    if (!items || items.length === 0) {
      throw new DomainError('Cannot create sale with zero items.');
    }

    // Sort product IDs to strictly eliminate database deadlock risks across concurrent checkouts
    const sortedItems = [...items].sort((a, b) => a.productId.localeCompare(b.productId));
    const productIds = sortedItems.map((i) => i.productId);

    return prisma.$transaction(async (tx) => {
      // 1. Fetch shop settings for tax rate and invoice prefix
      const settings = await tx.shopSettings.findUnique({ where: { id: 'default' } });
      const taxRate = settings ? Number(settings.taxRatePercent) : 0;
      const invoicePrefix = settings?.invoicePrefix || 'INV';

      // 2. Fetch all products
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        throw new DomainError('One or more products in the cart no longer exist.');
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      // 3. Validate product activity and stock levels
      for (const item of sortedItems) {
        const product = productMap.get(item.productId)!;

        if (!product.isActive || product.deletedAt) {
          throw new ProductDeactivatedError(product.name);
        }

        if (product.stock < item.quantity) {
          throw new InsufficientStockError(product.name, product.stock, item.quantity);
        }
      }

      // 4. Calculate financials with safe decimal arithmetic
      let subtotal = toDecimal(0);
      const saleItemsToCreate: Array<{
        productId: string;
        productName: string;
        sku: string;
        quantity: number;
        costPrice: Prisma.Decimal;
        unitPrice: Prisma.Decimal;
        subtotal: Prisma.Decimal;
      }> = [];

      for (const item of sortedItems) {
        const product = productMap.get(item.productId)!;
        const lineTotal = roundDecimal(mulDecimals(item.quantity, product.sellingPrice));
        subtotal = addDecimals(subtotal, lineTotal);

        saleItemsToCreate.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          costPrice: product.costPrice,
          unitPrice: product.sellingPrice,
          subtotal: lineTotal,
        });
      }

      const discount = roundDecimal(toDecimal(discountAmount));
      const taxableSubtotal = subDecimals(subtotal, discount);
      const safeTaxable = taxableSubtotal.greaterThan(0) ? taxableSubtotal : toDecimal(0);
      const taxAmount = calculateTax(safeTaxable, taxRate);
      const grandTotal = roundDecimal(addDecimals(safeTaxable, taxAmount));

      // 5. Generate unique invoice number
      const invoiceNumber = await this.generateInvoiceNumber(tx, invoicePrefix);

      // 6. Create Sale record
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          userId,
          customerId,
          subtotal,
          taxAmount,
          discountAmount: discount,
          grandTotal,
          paymentMethod,
          status: SaleStatus.COMPLETED,
          notes,
          items: {
            create: saleItemsToCreate,
          },
        },
        include: {
          items: true,
          customer: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // 7. Atomic inventory deductions & Movement records & Stock Alerts
      const alertMap = new Map<string, StockAlertEvent>();

      for (const item of sortedItems) {
        const product = productMap.get(item.productId)!;
        const { product: updatedProduct } = await InventoryService.recordMovement({
          productId: product.id,
          quantityChange: -item.quantity,
          type: MovementType.SALE,
          referenceId: sale.id,
          referenceType: 'SALE',
          reason: `Sale Invoice ${sale.invoiceNumber}`,
          userId,
          saleId: sale.id,
          tx,
        });

        if (updatedProduct.stock <= 0) {
          alertMap.set(updatedProduct.id, {
            productId: updatedProduct.id,
            productName: updatedProduct.name,
            sku: updatedProduct.sku,
            remainingStock: updatedProduct.stock,
            minStockAlert: updatedProduct.minStockAlert,
            alertType: 'OUT_OF_STOCK',
            message: `Out of stock: ${updatedProduct.name} can no longer be sold.`,
          });
        } else if (updatedProduct.stock <= updatedProduct.minStockAlert) {
          alertMap.set(updatedProduct.id, {
            productId: updatedProduct.id,
            productName: updatedProduct.name,
            sku: updatedProduct.sku,
            remainingStock: updatedProduct.stock,
            minStockAlert: updatedProduct.minStockAlert,
            alertType: 'LOW_STOCK',
            message: `Low stock: ${updatedProduct.name} has only ${updatedProduct.stock} units remaining.`,
          });
        }
      }

      // 8. Audit Log
      await AuditService.record({
        userId,
        action: 'SALE_CREATED',
        entity: 'Sale',
        entityId: sale.id,
        metadata: {
          invoiceNumber: sale.invoiceNumber,
          grandTotal: Number(sale.grandTotal),
          itemCount: sale.items.length,
          paymentMethod,
        },
        tx,
      });

      return {
        ...sale,
        alerts: Array.from(alertMap.values()),
      };
    });
  }

  /**
   * Safely cancel a completed sale, restoring all inventory items atomically
   */
  static async cancelSale(params: {
    saleId: string;
    cancelledById: string;
    cancellationReason: string;
  }) {
    const { saleId, cancelledById, cancellationReason } = params;

    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { items: true },
      });

      if (!sale) {
        throw new NotFoundError('Sale', saleId);
      }

      if (sale.status === SaleStatus.CANCELLED) {
        throw new DomainError(`Sale ${sale.invoiceNumber} is already cancelled.`);
      }

      // 1. Mark sale as cancelled
      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          status: SaleStatus.CANCELLED,
          cancellationReason,
          cancelledAt: new Date(),
          cancelledById,
        },
        include: {
          items: true,
          customer: true,
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // 2. Restore stock for each item and record SALE_REVERSAL movement
      for (const item of sale.items) {
        await InventoryService.recordMovement({
          productId: item.productId,
          quantityChange: item.quantity, // Positive restoration
          type: MovementType.SALE_REVERSAL,
          referenceId: sale.id,
          referenceType: 'SALE_REVERSAL',
          reason: `Cancelled Sale ${sale.invoiceNumber}: ${cancellationReason}`,
          userId: cancelledById,
          saleId: sale.id,
          tx,
        });
      }

      // 3. Audit Log
      await AuditService.record({
        userId: cancelledById,
        action: 'SALE_CANCELLED',
        entity: 'Sale',
        entityId: sale.id,
        metadata: {
          invoiceNumber: sale.invoiceNumber,
          reason: cancellationReason,
        },
        tx,
      });

      return updatedSale;
    });
  }

  /**
   * Retrieve sales with filtering and pagination
   */
  static async getSales(filter: {
    startDate?: Date;
    endDate?: Date;
    status?: SaleStatus;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = filter.page || 1;
    const pageSize = filter.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.SaleWhereInput = {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.startDate || filter.endDate
        ? {
            createdAt: {
              ...(filter.startDate ? { gte: filter.startDate } : {}),
              ...(filter.endDate ? { lte: filter.endDate } : {}),
            },
          }
        : {}),
      ...(filter.search
        ? {
            OR: [
              { invoiceNumber: { contains: filter.search, mode: 'insensitive' } },
              { customer: { name: { contains: filter.search, mode: 'insensitive' } } },
              { customer: { phone: { contains: filter.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        include: {
          customer: true,
          user: { select: { id: true, name: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get single sale by ID with full relations
   */
  static async getSaleById(id: string) {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
        customer: true,
        user: { select: { id: true, name: true, email: true } },
        movements: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundError('Sale', id);
    }

    return sale;
  }
}
