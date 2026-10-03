import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_SECRET = process.env.AUTH_SECRET || 'shop-inventory-super-secret-key-at-least-32-chars-long';
const SECRET_KEY = new TextEncoder().encode(AUTH_SECRET);
const SESSION_COOKIE_NAME = 'shop_session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, favicon, and public healthcheck
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  let isValidSession = false;
  if (token) {
    try {
      await jwtVerify(token, SECRET_KEY);
      isValidSession = true;
    } catch {
      isValidSession = false;
    }
  }

  // Redirect authenticated users visiting /login to dashboard
  if (isValidSession && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Allow unauthenticated users to access /login
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // Redirect unauthenticated users visiting protected routes to /login
  if (!isValidSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
