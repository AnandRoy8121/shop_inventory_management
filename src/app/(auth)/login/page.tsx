'use client';

import { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginAction } from '@/app/actions/auth.actions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Store, AlertCircle, Sparkles } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await loginAction({ email, password });
      if (!res.success) {
        setError(res.error);
      } else {
        const from = searchParams.get('from') || '/';
        router.push(from);
        router.refresh();
      }
    });
  };

  const handleQuickFill = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
          <Store className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Apex Retail Hub</h2>
        <p className="mt-1 text-xs text-slate-500">
          Secure inventory, point-of-sale & audit management
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleLogin} className="mt-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. admin@apexretail.com"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        {error && (
          <div className="flex items-center gap-1.5 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          isLoading={isPending}
          className="w-full bg-indigo-600 hover:bg-indigo-700 font-semibold py-2.5 shadow-sm"
        >
          Sign In to Store
        </Button>
      </form>

      {/* Demo Quick-Fill Credentials */}
      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-2.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span>Instant Demo Logins:</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill('admin@apexretail.com', 'admin123')}
            className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center text-[11px] font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-800 transition"
          >
            <span className="font-bold block text-slate-900">Admin</span>
            Full Control
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill('staff@apexretail.com', 'staff123')}
            className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center text-[11px] font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-800 transition"
          >
            <span className="font-bold block text-slate-900">Staff</span>
            Sales & Inventory
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill('manager@apexretail.com', 'manager123')}
            className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center text-[11px] font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-800 transition"
          >
            <span className="font-bold block text-slate-900">Manager</span>
            Stock & Operations
          </button>

          <button
            type="button"
            onClick={() => handleQuickFill('cashier@apexretail.com', 'cashier123')}
            className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center text-[11px] font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-800 transition"
          >
            <span className="font-bold block text-slate-900">Cashier</span>
            POS Terminal
          </button>
        </div>
      </div>
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
