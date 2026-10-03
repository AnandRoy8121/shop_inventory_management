'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth.actions';
import { LogOut, ShoppingCart, ChevronDown, Package, Boxes } from 'lucide-react';

interface UserMenuProps {
  user: {
    name: string;
    email: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      await logoutAction();
    }
    window.location.href = '/login';
  };

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2.5 rounded-full p-1 pl-2.5 pr-2 border border-slate-200 bg-white hover:bg-slate-50 transition shadow-2xs"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs shadow-xs">
          {initials}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
            {user.name}
          </p>
          <span className="text-[10px] font-medium text-slate-400 block leading-none">
            Store Owner
          </span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>

          <div className="py-1 space-y-0.5">
            <Link
              href="/sales"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition"
            >
              <ShoppingCart className="h-3.5 w-3.5 text-slate-400" />
              <span>Record Sale</span>
            </Link>
            <Link
              href="/products"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition"
            >
              <Package className="h-3.5 w-3.5 text-slate-400" />
              <span>Products</span>
            </Link>
            <Link
              href="/inventory"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition"
            >
              <Boxes className="h-3.5 w-3.5 text-slate-400" />
              <span>Inventory</span>
            </Link>
          </div>

          <div className="border-t border-slate-100 pt-1 mt-1">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition text-left"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
