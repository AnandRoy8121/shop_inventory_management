'use client';

import { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginAction } from '@/app/actions/auth.actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Store, AlertCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const queryError = searchParams.get('error');
  const activeError = error || queryError;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    startTransition(async () => {
      const cleanEmail = email.trim().toLowerCase();
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: cleanEmail, password }),
          credentials: 'include',
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.error || 'Invalid email or password');
          return;
        }

        // Explicitly set cookie on client to ensure mobile Safari/Chrome sync before navigation
        if (data.token) {
          document.cookie = `shop_session=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        }

        let from = searchParams.get('from') || '/';
        if (from.startsWith('/login')) {
          from = '/';
        }

        window.location.replace(from);
      } catch (err: unknown) {
        // Fallback to server action if fetch fails
        try {
          const actionRes = await loginAction({ email: cleanEmail, password });
          if (!actionRes.success) {
            setError(actionRes.error || 'Invalid email or password');
          } else {
            let from = searchParams.get('from') || '/';
            if (from.startsWith('/login')) {
              from = '/';
            }
            window.location.replace(from);
          }
        } catch (actionErr: unknown) {
          setError(
            actionErr instanceof Error
              ? actionErr.message
              : 'Login failed. Please check network/credentials.'
          );
        }
      }
    });
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
          <Store className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Gangga Aqua</h2>
        <p className="mt-1 text-xs text-slate-500">
          Sign in to manage your inventory, record sales, and view reports
        </p>
      </div>

      {/* Login Form with Progressive Enhancement */}
      <form
        method="POST"
        action="/api/auth/login"
        onSubmit={handleLogin}
        className="mt-6 space-y-4"
      >
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
          <Input
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. admin@ganggaaqua.com"
            required
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="email"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
          <Input
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="current-password"
          />
        </div>

        {activeError && (
          <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{activeError}</span>
          </div>
        )}

        <Button
          type="submit"
          isLoading={isPending}
          className="w-full bg-indigo-600 hover:bg-indigo-700 font-semibold py-2.5 shadow-sm"
        >
          Sign In to Gangga Aqua
        </Button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50/40 to-slate-200 p-4">
      <Suspense fallback={<div className="text-xs text-slate-500">Loading portal...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
