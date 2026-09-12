import { Prisma } from '@prisma/client';
import prisma from '../db/prisma';

export interface AuditLogParams {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  tx?: Prisma.TransactionClient;
}

export class AuditService {
  static async record(params: AuditLogParams) {
    const client = params.tx || prisma;
    return client.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata ? (params.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        ipAddress: params.ipAddress,
      },
    });
  }
}
