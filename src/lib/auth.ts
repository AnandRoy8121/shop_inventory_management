import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { UnauthorizedError } from '@/lib/errors';

const AUTH_SECRET = process.env.AUTH_SECRET || 'shop-inventory-super-secret-key-at-least-32-chars-long';
const SECRET_KEY = new TextEncoder().encode(AUTH_SECRET);
export const AUTH_COOKIE_NAME = 'shop_session';
const TOKEN_EXPIRY = '7d';

export interface AuthSessionUser {
  id: string;
  email: string;
  name: string;
}

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, 10);
}

export async function comparePassword(plainText: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plainText, hashed);
}

export async function createSessionToken(user: AuthSessionUser): Promise<string> {
  return new SignJWT({ id: user.id, email: user.email, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<AuthSessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    if (!payload.id || !payload.email) return null;
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: (payload.name as string) || 'User',
    };
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

export async function getAuthSession(): Promise<AuthSessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const getCurrentUser = getAuthSession;

export async function requireUser(): Promise<AuthSessionUser> {
  const user = await getAuthSession();
  if (!user) {
    throw new UnauthorizedError('Please log in to continue.');
  }
  return user;
}

export async function verifyCredentials(email: string, plainPassword: string): Promise<AuthSessionUser | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const emailsToTry = [
    normalizedEmail,
    normalizedEmail === 'admin@ganggaaqua.com' ? 'admin@apexretail.com' : null,
    normalizedEmail === 'admin@apexretail.com' ? 'admin@ganggaaqua.com' : null,
  ].filter((e): e is string => Boolean(e));

  const user = await prisma.user.findFirst({
    where: { email: { in: emailsToTry } },
  });
  if (!user) return null;

  const valid = await comparePassword(plainPassword, user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
