import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hashPassword,
  comparePassword,
  createSessionToken,
  verifySessionToken,
  getAuthSession,
  requireAuth,
  requireRole,
  requirePermission,
  hasPermission,
  hasRole,
  setAuthCookie,
  clearAuthCookie,
  AUTH_COOKIE_NAME,
} from '../../src/lib/auth';
import { UnauthorizedError, ForbiddenError } from '../../src/lib/errors';
import { Role } from '@prisma/client';
import { SignJWT } from 'jose';
import { env } from '../../src/config/env';

// In-memory cookie store for testing session lifecycle
const mockCookieJar = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      mockCookieJar.has(name) ? { value: mockCookieJar.get(name)! } : undefined,
    set: (name: string, value: string) => mockCookieJar.set(name, value),
    delete: (name: string) => mockCookieJar.delete(name),
  })),
}));

describe('Authentication & Authorization Engine', () => {
  beforeEach(() => {
    mockCookieJar.clear();
  });

  // 1. Password Security
  describe('Password Security (Bcryptjs)', () => {
    it('hashes plain text passwords with salt rounds and verifies match', async () => {
      const plain = 'StrongPassword!2026';
      const hashed = await hashPassword(plain);

      expect(hashed).not.toBe(plain);
      expect(hashed.startsWith('$2')).toBe(true);

      const match = await comparePassword(plain, hashed);
      expect(match).toBe(true);

      const mismatch = await comparePassword('WrongPassword', hashed);
      expect(mismatch).toBe(false);
    });
  });

  // 2. Session Handling & Token Verification
  describe('Session Handling & JWT Verification', () => {
    it('signs and verifies JWT session tokens with complete user claims', async () => {
      const adminUser = {
        id: 'usr_admin_101',
        email: 'admin@apexretail.com',
        name: 'Eleanor Vance',
        role: Role.ADMIN,
      };

      const token = await createSessionToken(adminUser);
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);

      const verified = await verifySessionToken(token);
      expect(verified).not.toBeNull();
      expect(verified?.id).toBe(adminUser.id);
      expect(verified?.email).toBe(adminUser.email);
      expect(verified?.role).toBe(Role.ADMIN);
    });

    it('rejects tampered or malformed JWT tokens gracefully', async () => {
      const badToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.badpayload.invalidsig';
      const result = await verifySessionToken(badToken);
      expect(result).toBeNull();
    });

    it('rejects expired session tokens', async () => {
      const secret = new TextEncoder().encode(env.AUTH_SECRET);
      // Create a token expired 10 minutes ago
      const expiredToken = await new SignJWT({
        id: 'usr_expired_001',
        email: 'expired@apexretail.com',
        name: 'Expired User',
        role: Role.STAFF,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 600)
        .sign(secret);

      const verified = await verifySessionToken(expiredToken);
      expect(verified).toBeNull();
    });
  });

  // 3. Unauthenticated Access Protection
  describe('Unauthenticated Access Control', () => {
    it('returns null for getAuthSession when no session cookie is present', async () => {
      const session = await getAuthSession();
      expect(session).toBeNull();
    });

    it('throws UnauthorizedError when requireAuth is invoked without a session', async () => {
      await expect(requireAuth()).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when requireRole is invoked without a session', async () => {
      await expect(requireRole([Role.ADMIN])).rejects.toThrow(UnauthorizedError);
    });

    it('throws UnauthorizedError when requirePermission is invoked without a session', async () => {
      await expect(requirePermission('sales:create')).rejects.toThrow(UnauthorizedError);
    });
  });

  // 4. Authenticated Access & Role Verification
  describe('Authenticated Access & Role Clearance', () => {
    it('successfully resolves session and authorizes access for valid session cookie', async () => {
      const staffUser = {
        id: 'usr_staff_202',
        email: 'staff@apexretail.com',
        name: 'Sam Miller',
        role: Role.STAFF,
      };

      const token = await createSessionToken(staffUser);
      await setAuthCookie(token);

      const session = await getAuthSession();
      expect(session).not.toBeNull();
      expect(session?.email).toBe('staff@apexretail.com');
      expect(session?.role).toBe(Role.STAFF);

      const authed = await requireAuth();
      expect(authed.id).toBe(staffUser.id);

      // Verify STAFF has role clearance for STAFF operations
      const roleVerified = await requireRole([Role.STAFF, Role.ADMIN]);
      expect(roleVerified.id).toBe(staffUser.id);
      expect(hasRole(session, [Role.STAFF])).toBe(true);
      expect(hasRole(session, [Role.ADMIN])).toBe(false);
    });
  });

  // 5. Unauthorized Mutation Prevention (Role & Permission Matrix)
  describe('Unauthorized Mutation Prevention (Server-Side Enforcement)', () => {
    beforeEach(async () => {
      // Establish active STAFF session in cookie
      const staffUser = {
        id: 'usr_staff_202',
        email: 'staff@apexretail.com',
        name: 'Sam Miller',
        role: Role.STAFF,
      };
      const token = await createSessionToken(staffUser);
      await setAuthCookie(token);
    });

    it('prevents STAFF from performing ADMIN-only mutations via requireRole', async () => {
      await expect(requireRole([Role.ADMIN])).rejects.toThrow(ForbiddenError);
    });

    it('prevents STAFF from updating settings via requirePermission', async () => {
      await expect(requirePermission('settings:manage')).rejects.toThrow(ForbiddenError);
    });

    it('prevents STAFF from creating/modifying products via requirePermission', async () => {
      await expect(requirePermission('products:write')).rejects.toThrow(ForbiddenError);
      await expect(requirePermission('products:delete')).rejects.toThrow(ForbiddenError);
    });

    it('prevents STAFF from adjusting inventory stock via requirePermission', async () => {
      await expect(requirePermission('inventory:adjust')).rejects.toThrow(ForbiddenError);
    });

    it('prevents STAFF from cancelling sales via requirePermission', async () => {
      await expect(requirePermission('sales:cancel')).rejects.toThrow(ForbiddenError);
    });

    it('allows STAFF to perform authorized actions: create sales, view inventory, view products, view reports', async () => {
      // Pure permission matrix checks
      expect(hasPermission(Role.STAFF, 'sales:create')).toBe(true);
      expect(hasPermission(Role.STAFF, 'products:read')).toBe(true);
      expect(hasPermission(Role.STAFF, 'inventory:read')).toBe(true);
      expect(hasPermission(Role.STAFF, 'reports:read')).toBe(true);

      // Server-side guard checks
      const user = await requirePermission('sales:create');
      expect(user.role).toBe(Role.STAFF);
    });

    it('allows ADMIN full access across all permissions', async () => {
      expect(hasPermission(Role.ADMIN, 'settings:manage')).toBe(true);
      expect(hasPermission(Role.ADMIN, 'products:write')).toBe(true);
      expect(hasPermission(Role.ADMIN, 'products:delete')).toBe(true);
      expect(hasPermission(Role.ADMIN, 'inventory:adjust')).toBe(true);
      expect(hasPermission(Role.ADMIN, 'sales:cancel')).toBe(true);
      expect(hasPermission(Role.ADMIN, 'sales:create')).toBe(true);
      expect(hasPermission(Role.ADMIN, 'reports:read')).toBe(true);
    });
  });

  // 6. Logout & Session Termination
  describe('Logout & Session Termination', () => {
    it('clears session cookie on logout and subsequent requests are treated as unauthenticated', async () => {
      const user = {
        id: 'usr_logout_303',
        email: 'cashier@apexretail.com',
        name: 'Chloe Decker',
        role: Role.CASHIER,
      };

      const token = await createSessionToken(user);
      await setAuthCookie(token);

      // Verify session active
      expect(await getAuthSession()).not.toBeNull();
      expect(mockCookieJar.has(AUTH_COOKIE_NAME)).toBe(true);

      // Perform logout
      await clearAuthCookie();

      // Verify cookie cleared
      expect(mockCookieJar.has(AUTH_COOKIE_NAME)).toBe(false);
      expect(await getAuthSession()).toBeNull();
      await expect(requireAuth()).rejects.toThrow(UnauthorizedError);
    });
  });
});
