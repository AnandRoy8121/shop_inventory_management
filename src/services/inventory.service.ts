import { prisma } from '@/lib/prisma';
import {
  inventoryRepository,
  InventoryOverviewMetrics,
  InventoryListResult,
  MovementListResult,
  MovementWithRelations,
} from '@/repositories/inventory.repository';
import {
  stockAdjustmentSchema,
  inventoryQuerySchema,
  movementQuerySchema,
  InventoryQueryInput,
  MovementQueryInput,
} from '@/schemas/inventory.schema';
import { InsufficientStockError, NotFoundError, DomainError } from '@/lib/errors';
import { AuditService } from '@/server/services/audit.service';
import { MovementType, Prisma, InventoryMovement, Product } from '@prisma/client';

export interface BaseMovementParams {
  productId: string;
  quantityChange: number; // Signed delta: positive (increment) or negative (decrement)
  type: MovementType;
  referenceId?: string | null;
  referenceType?: string | null;
  reason: string;
  userId: string;
  saleId?: string | null;
  tx?: Prisma.TransactionClient;
}

export interface AdjustStockParams {
  productId: string;
  operation: 'INCREASE' | 'DECREASE';
  quantity: number;
  reason: string;
  reasonCategory?: string;
  referenceId?: string | null;
  type?: MovementType;
  userId: string;
}

export class InventoryService {
  /**
   * Centralized 10-step atomic inventory mutation engine.
   * Every stock modification across the entire platform flows through this single method.
   */
  async recordMovement(params: BaseMovementParams): Promise<{ product: Product; movement: InventoryMovement }> {
    const {
      productId,
      quantityChange,
      type,
      referenceId,
      referenceType,
      reason,
      userId,
      saleId,
      tx,
    } = params;

    if (!quantityChange || quantityChange === 0) {
      throw new DomainError('Stock quantity change cannot be zero.');
    }

    const executeInTransaction = async (client: Prisma.TransactionClient) => {
      // 1. Lock the product row using SELECT ... FOR UPDATE to eliminate concurrent race conditions
      const rows = await client.$queryRaw<
        Array<{
          id: string;
          name: string;
          sku: string;
          stock: number;
          isActive: boolean;
          deletedAt: Date | null;
        }>
      >`
        SELECT id, name, sku, stock, "isActive", "deletedAt"
        FROM "Product"
        WHERE id = ${productId}
        FOR UPDATE
      `;

      const product = rows[0];

      if (!product) {
        throw new NotFoundError('Product', productId);
      }

      // 2. Inactive product guard for manual adjustments and sales
      if ((!product.isActive || product.deletedAt !== null) && type !== MovementType.SALE_REVERSAL) {
        throw new DomainError(`Cannot adjust stock for deactivated product "${product.name}" (${product.sku}).`);
      }

      const stockBefore = product.stock;
      const stockAfter = stockBefore + quantityChange;

      // 3. Strict negative stock guard
      if (stockAfter < 0) {
        throw new InsufficientStockError(product.name, stockBefore, Math.abs(quantityChange));
      }

      // 4. Update product stock balance
      const updatedProduct = await client.product.update({
        where: { id: productId },
        data: { stock: stockAfter },
      });

      // 5. Create immutable InventoryMovement ledger entry
      const movement = await client.inventoryMovement.create({
        data: {
          productId,
          quantityChange,
          stockBefore,
          stockAfter,
          type,
          referenceId: referenceId || null,
          referenceType: referenceType || (type === MovementType.PURCHASE ? 'PURCHASE' : type === MovementType.SALE ? 'SALE' : 'MANUAL_ADJUSTMENT'),
          reason: reason.trim(),
          userId,
          saleId: saleId || null,
        },
      });

      // 6. Emit audit log
      await AuditService.record({
        userId,
        action: `INVENTORY_${type}`,
        entity: 'Product',
        entityId: productId,
        metadata: {
          sku: product.sku,
          name: product.name,
          quantityChange,
          stockBefore,
          stockAfter,
          reason,
          referenceId,
        },
        tx: client,
      });

      return { product: updatedProduct, movement };
    };

    if (tx) {
      return executeInTransaction(tx);
    } else {
      return prisma.$transaction(async (nestedTx) => {
        return executeInTransaction(nestedTx);
      });
    }
  }

  /**
   * Adjust stock (increase or decrease) with validation and audit logging
   */
  async adjustStock(params: AdjustStockParams): Promise<{ product: Product; movement: InventoryMovement }> {
    const validated = stockAdjustmentSchema.parse(params);

    const isIncrease = validated.operation === 'INCREASE';
    const quantityChange = isIncrease ? validated.quantity : -validated.quantity;

    let movementType = validated.type;
    if (!movementType) {
      movementType = isIncrease ? MovementType.PURCHASE : MovementType.MANUAL_ADJUSTMENT;
    }

    const reasonLabel = validated.reasonCategory
      ? `[${validated.reasonCategory.toUpperCase()}] ${validated.reason}`
      : validated.reason;

    return this.recordMovement({
      productId: validated.productId,
      quantityChange,
      type: movementType,
      referenceId: validated.referenceId,
      referenceType: 'MANUAL_ADJUSTMENT',
      reason: reasonLabel,
      userId: params.userId,
    });
  }

  /**
   * Explicit Stock Increase operation
   */
  async increaseStock(params: {
    productId: string;
    quantity: number;
    reason: string;
    userId: string;
    referenceId?: string | null;
    type?: MovementType;
  }): Promise<{ product: Product; movement: InventoryMovement }> {
    return this.adjustStock({
      productId: params.productId,
      operation: 'INCREASE',
      quantity: params.quantity,
      reason: params.reason,
      referenceId: params.referenceId,
      type: params.type || MovementType.PURCHASE,
      userId: params.userId,
    });
  }

  /**
   * Explicit Stock Decrease operation
   */
  async decreaseStock(params: {
    productId: string;
    quantity: number;
    reason: string;
    userId: string;
    referenceId?: string | null;
    type?: MovementType;
  }): Promise<{ product: Product; movement: InventoryMovement }> {
    return this.adjustStock({
      productId: params.productId,
      operation: 'DECREASE',
      quantity: params.quantity,
      reason: params.reason,
      referenceId: params.referenceId,
      type: params.type || MovementType.MANUAL_ADJUSTMENT,
      userId: params.userId,
    });
  }

  /**
   * Record inventory deduction for a sale transaction
   */
  async recordSaleMovement(params: {
    productId: string;
    quantity: number;
    saleId: string;
    invoiceNumber: string;
    userId: string;
    tx?: Prisma.TransactionClient;
  }): Promise<{ product: Product; movement: InventoryMovement }> {
    return this.recordMovement({
      productId: params.productId,
      quantityChange: -Math.abs(params.quantity),
      type: MovementType.SALE,
      referenceId: params.saleId,
      referenceType: 'SALE',
      reason: `Counter Sale ${params.invoiceNumber}`,
      userId: params.userId,
      saleId: params.saleId,
      tx: params.tx,
    });
  }

  /**
   * Reverse a sale inventory deduction upon cancellation or refund
   */
  async reverseSaleMovement(params: {
    productId: string;
    quantity: number;
    saleId: string;
    invoiceNumber: string;
    userId: string;
    reason: string;
    tx?: Prisma.TransactionClient;
  }): Promise<{ product: Product; movement: InventoryMovement }> {
    return this.recordMovement({
      productId: params.productId,
      quantityChange: Math.abs(params.quantity),
      type: MovementType.SALE_REVERSAL,
      referenceId: params.saleId,
      referenceType: 'SALE_REVERSAL',
      reason: `Cancelled Sale ${params.invoiceNumber}: ${params.reason}`,
      userId: params.userId,
      saleId: params.saleId,
      tx: params.tx,
    });
  }

  /**
   * Record customer return restocking movement
   */
  async recordReturnMovement(params: {
    productId: string;
    quantity: number;
    reason: string;
    userId: string;
    saleId?: string | null;
    referenceId?: string | null;
    tx?: Prisma.TransactionClient;
  }): Promise<{ product: Product; movement: InventoryMovement }> {
    return this.recordMovement({
      productId: params.productId,
      quantityChange: Math.abs(params.quantity),
      type: MovementType.RETURN,
      referenceId: params.referenceId || params.saleId || null,
      referenceType: 'RETURN',
      reason: `Customer Return: ${params.reason}`,
      userId: params.userId,
      saleId: params.saleId,
      tx: params.tx,
    });
  }

  /**
   * Retrieve aggregate inventory overview KPIs (total units, valuation, alert counts)
   */
  async getOverview(): Promise<InventoryOverviewMetrics> {
    return inventoryRepository.getOverviewMetrics();
  }

  /**
   * Query inventory stock balances with filters, search, and pagination
   */
  async listInventory(query?: InventoryQueryInput): Promise<InventoryListResult> {
    const parsed = inventoryQuerySchema.parse(query || {});
    return inventoryRepository.listStock(parsed);
  }

  /**
   * Query movement history ledger with pagination and filters
   */
  async listMovements(query?: MovementQueryInput): Promise<MovementListResult> {
    const parsed = movementQuerySchema.parse(query || {});
    return inventoryRepository.listMovements(parsed);
  }

  /**
   * Get chronological movement history specifically for a single product
   */
  async getProductMovements(productId: string, limit = 50): Promise<MovementWithRelations[]> {
    return inventoryRepository.getProductMovements(productId, limit);
  }

  // Static aliases for seamless backwards compatibility
  static recordMovement(params: BaseMovementParams) {
    return inventoryService.recordMovement(params);
  }

  static adjustStock(params: {
    productId: string;
    type: MovementType;
    quantityChange: number;
    reason: string;
    referenceId?: string | null;
    userId: string;
  }) {
    return inventoryService.recordMovement({
      productId: params.productId,
      quantityChange: params.quantityChange,
      type: params.type,
      referenceId: params.referenceId,
      reason: params.reason,
      userId: params.userId,
    });
  }

  static getMovements(filter?: MovementQueryInput) {
    return inventoryService.listMovements(filter);
  }
}

export const inventoryService = new InventoryService();
