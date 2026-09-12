'use server';

import { shopSettingsSchema } from '@/types/schemas';
import { requirePermission } from '../security/auth';
import prisma from '../db/prisma';
import { ActionResult, successResult, handleActionError } from '@/lib/errors';
import { revalidatePath } from 'next/cache';
import { AuditService } from '../services/audit.service';

export async function getShopSettingsAction() {
  return prisma.shopSettings.findUnique({
    where: { id: 'default' },
  });
}

export async function updateShopSettingsAction(data: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission('settings:manage');
    const parsed = shopSettingsSchema.parse(data);

    await prisma.shopSettings.upsert({
      where: { id: 'default' },
      update: parsed,
      create: {
        id: 'default',
        ...parsed,
      },
    });

    await AuditService.record({
      userId: user.id,
      action: 'SETTINGS_UPDATED',
      entity: 'ShopSettings',
      entityId: 'default',
      metadata: parsed,
    });

    revalidatePath('/settings');
    revalidatePath('/pos');
    revalidatePath('/');

    return successResult(undefined);
  } catch (err: unknown) {
    return handleActionError(err);
  }
}
