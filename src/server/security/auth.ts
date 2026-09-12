import {
  AuthSessionUser,
  hashPassword,
  comparePassword,
  createSessionToken,
  verifySessionToken,
  getAuthSession,
  requireAuth,
  requireRole,
  requireAdmin,
  requirePermission,
  hasPermission,
  hasRole,
  setAuthCookie,
  clearAuthCookie,
  Permission,
} from '@/lib/auth';
import prisma from '../db/prisma';

export type UserSession = AuthSessionUser;
export type { Permission };

export const signSessionToken = createSessionToken;
export const getCurrentUser = getAuthSession;
export const requireUser = requireAuth;
export const setSessionCookie = setAuthCookie;
export const clearSessionCookie = clearAuthCookie;

export {
  hashPassword,
  comparePassword,
  createSessionToken,
  verifySessionToken,
  getAuthSession,
  requireAuth,
  requireRole,
  requireAdmin,
  requirePermission,
  hasPermission,
  hasRole,
  setAuthCookie,
  clearAuthCookie,
};

/**
 * Validates credentials against DB with case-insensitive email
 */
export async function verifyCredentials(email: string, plainPassword: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user || !user.isActive) {
    return null;
  }

  const isValid = await comparePassword(plainPassword, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
