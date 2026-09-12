'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, AlertCircle, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { UserMenu } from '@/components/shared/user-menu';
import { Role } from '@prisma/client';

export interface HeaderProps {
  title?: string;
  description?: string;
  lowStockCount?: number;
  onMenuToggle?: () => void;
  user?: {
    name: string;
    email: string;
    role: Role;
  };
}

export function Header({ lowStockCount = 0, onMenuToggle, user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
      {/* Left side: Hamburger on mobile + Breadcrumbs */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label="Open sidebar navigation"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden transition"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="hidden sm:block">
          <Breadcrumbs />
        </div>
      </div>

      {/* Right side: Stock alerts pill, POS button, and User Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {lowStockCount > 0 && (
          <Link href="/inventory">
            <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 shadow-2xs">
              <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span className="hidden md:inline">{lowStockCount} stock warnings</span>
              <span className="md:hidden">{lowStockCount}</span>
            </div>
          </Link>
        )}

        <Link href="/pos" className="hidden sm:block">
          <Button
            size="sm"
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 shadow-xs h-8 text-xs font-semibold"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>POS</span>
          </Button>
        </Link>

        {user && <UserMenu user={user} />}
      </div>
    </header>
  );
}
