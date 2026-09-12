'use server';

import { loginSchema } from '@/schemas/auth.schema';
import { authService } from '@/services/auth.service';
import { ActionResult, successResult, handleActionError } from '@/lib/errors';
import { revalidatePath } from 'next/cache';

export async function loginAction(data: unknown): Promise<ActionResult<{ redirectUrl: string }>> {
  try {
    const validated = loginSchema.parse(data);
    await authService.login(validated);
    revalidatePath('/', 'layout');
    return successResult({ redirectUrl: '/' });
  } catch (err) {
    return handleActionError(err);
  }
}

export async function logoutAction(): Promise<ActionResult> {
  try {
    await authService.logout();
    revalidatePath('/', 'layout');
    return successResult(undefined);
  } catch (err) {
    return handleActionError(err);
  }
}

export async function getCurrentUserAction() {
  return authService.getCurrentUser();
}
