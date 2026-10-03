import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials, createSessionToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { loginSchema } from '@/schemas/auth.schema';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request.headers);
    const contentType = request.headers.get('content-type') || '';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
    const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '') || 'http';
    const baseUrl = `${proto}://${host}`;

    // Rate limiting: maximum 5 attempts per 60 seconds per IP
    const limiter = rateLimit(`login:${clientIp}`, {
      limit: 5,
      windowMs: 60_000,
    });

    if (!limiter.success) {
      console.warn(`[Auth API] Rate limit exceeded for IP: ${clientIp}`);
      const errorMsg = 'Too many login attempts. Please wait 60 seconds and try again.';
      if (contentType.includes('application/json')) {
        return NextResponse.json(
          { success: false, error: errorMsg },
          {
            status: 429,
            headers: {
              'Retry-After': String(limiter.reset - Math.floor(Date.now() / 1000)),
            },
          }
        );
      }
      const loginUrl = new URL('/login', baseUrl);
      loginUrl.searchParams.set('error', errorMsg);
      return NextResponse.redirect(loginUrl, 303);
    }

    let email = '';
    let password = '';

    if (contentType.includes('application/json')) {
      const body = await request.json();
      email = body?.email || '';
      password = body?.password || '';
    } else {
      const formData = await request.formData();
      email = (formData.get('email') as string) || '';
      password = (formData.get('password') as string) || '';
    }

    email = email.trim().toLowerCase();
    console.log('[Auth API] Login attempt for:', email);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errMsg = parsed.error.issues[0]?.message || 'Invalid input';
      if (contentType.includes('application/json')) {
        return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
      }
      const loginUrl = new URL('/login', baseUrl);
      loginUrl.searchParams.set('error', errMsg);
      return NextResponse.redirect(loginUrl, 303);
    }

    const user = await verifyCredentials(email, password);
    if (!user) {
      console.log('[Auth API] Invalid credentials for:', email);
      if (contentType.includes('application/json')) {
        return NextResponse.json(
          { success: false, error: 'Invalid email or password' },
          { status: 401 }
        );
      }
      const loginUrl = new URL('/login', baseUrl);
      loginUrl.searchParams.set('error', 'Invalid email or password');
      return NextResponse.redirect(loginUrl, 303);
    }

    console.log('[Auth API] Login successful for user:', user.email);
    const token = await createSessionToken(user);
    const isProd = process.env.NODE_ENV === 'production';

    if (contentType.includes('application/json')) {
      const response = NextResponse.json({
        success: true,
        token,
        user: { id: user.id, email: user.email, name: user.name },
      });

      response.cookies.set(AUTH_COOKIE_NAME, token, {
        httpOnly: isProd, // in production, prevent XSS cookie theft
        secure: isProd,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    // Native HTML Form POST submission fallback
    const homeUrl = new URL('/', baseUrl);
    const response = NextResponse.redirect(homeUrl, 303);
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: isProd,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    console.error('[Auth API] Exception during login:', err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
