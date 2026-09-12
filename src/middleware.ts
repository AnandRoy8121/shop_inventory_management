import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'super-secret-inventory-jwt-key-change-in-production-2026-xyz'
);

const SESSION_COOKIE_NAME = 'apex_inventory_session';

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

  // Requirement 8: Redirect authenticated users visiting /login to the dashboard
  if (isValidSession && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Allow unauthenticated users to access /login
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // Requirement 7: Redirect unauthenticated users visiting protected routes to login
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
