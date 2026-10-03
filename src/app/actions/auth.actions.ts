'use server';

import { loginSchema } from '@/schemas/auth.schema';
import { verifyCredentials, createSessionToken, setAuthCookie, clearAuthCookie } from '@/lib/auth';
import { redirect } from 'next/navigation';

export async function loginAction(data: unknown) {
  try {
    const { email, password } = loginSchema.parse(data);
    const user = await verifyCredentials(email, password);

    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    const token = await createSessionToken(user);
    await setAuthCookie(token);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return { success: false, error: message };
  }
}

export async function logoutAction() {
  await clearAuthCookie();
  redirect('/login');
}
