import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { env } from '@/config/env';
import { UnauthorizedError, ForbiddenError } from '@/lib/errors';

const SECRET_KEY = new TextEncoder().encode(env.AUTH_SECRET);
export const AUTH_COOKIE_NAME = 'apex_inventory_session';
const TOKEN_EXPIRY = '7d';

export interface AuthSessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export type Permission =
  | 'products:read'
  | 'products:write'
  | 'products:delete'
  | 'inventory:read'
  | 'inventory:adjust'
  | 'sales:read'
  | 'sales:create'
  | 'sales:cancel'
  | 'reports:read'
  | 'settings:manage';

/**
 * Hash plain password using bcrypt with 12 salt rounds
 */
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 12);
}

/**
 * Safely verify plain text against hashed password
 */
export async function comparePassword(plainText: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plainText, hashed);
}

/**
 * Create a signed JWT session token
 */
export async function createSessionToken(user: AuthSessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(SECRET_KEY);
}

/**
 * Verify a JWT session token and return user payload or null if invalid/expired
 */
export async function verifySessionToken(token: string): Promise<AuthSessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

/**
 * Get active session from HTTP-only cookie
 */
export async function getAuthSession(): Promise<AuthSessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const getCurrentUser = getAuthSession;

/**
 * Server-side guard requiring any authenticated user
 */
export async function requireAuth(): Promise<AuthSessionUser> {
  const user = await getAuthSession();
  if (!user) {
    throw new UnauthorizedError('You must be signed in to perform this operation.');
  }
  return user;
}

/**
 * Server-side guard requiring specific roles
 */
export async function requireRole(allowedRoles: Role[]): Promise<AuthSessionUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new ForbiddenError(
      `Permission denied. Role "${user.role}" does not have sufficient clearance.`
    );
  }
  return user;
}

/**
 * Server-side guard requiring ADMIN role
 */
export async function requireAdmin(): Promise<AuthSessionUser> {
  return requireRole([Role.ADMIN]);
}

/**
 * Check if a role possesses a specific capability
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  // ADMIN has full access across all operations
  if (role === Role.ADMIN) return true;

  switch (permission) {
    case 'products:read':
    case 'inventory:read':
    case 'sales:read':
    case 'sales:create':
    case 'reports:read':
      // STAFF, CASHIER, MANAGER can view products, view inventory, create sales, and view reports
      return true;

    case 'products:write':
    case 'products:delete':
    case 'inventory:adjust':
    case 'sales:cancel':
      // Manager can edit catalog and adjust stock, but STAFF cannot
      return role === Role.MANAGER;

    case 'settings:manage':
      // Only ADMIN can edit store identity and settings
      return false;

    default:
      return false;
  }
}

/**
 * Server-side guard requiring specific permission
 */
export async function requirePermission(permission: Permission): Promise<AuthSessionUser> {
  const user = await requireAuth();
  if (!hasPermission(user.role, permission)) {
    throw new ForbiddenError(
      `Permission denied. Role "${user.role}" does not have "${permission}" permission.`
    );
  }
  return user;
}

/**
 * Pure helper to verify if an authenticated user possesses one of the allowed roles
 */
export function hasRole(user: AuthSessionUser | null, allowedRoles: Role[]): boolean {
  if (!user) return false;
  return allowedRoles.includes(user.role);
}

/**
 * Set session token into an HTTP-only secure cookie
 */
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Remove session cookie to log user out
 */
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
