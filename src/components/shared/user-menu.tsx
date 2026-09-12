'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Role } from '@prisma/client';
import { logoutAction } from '@/app/actions/auth.actions';
import { ShieldCheck, Settings, LogOut, ShoppingCart, ChevronDown } from 'lucide-react';

interface UserMenuProps {
  user: {
    name: string;
    email: string;
    role: Role;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown on outside click
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
    await logoutAction();
    router.push('/login');
    router.refresh();
  };

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
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
          <span className="text-[10px] font-medium text-indigo-600 block leading-none">
            {user.role}
          </span>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* User Profile Header */}
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
              <ShieldCheck className="h-3 w-3" />
              <span>Role: {user.role}</span>
            </div>
          </div>

          {/* Links */}
          <div className="py-1 space-y-0.5">
            <Link
              href="/pos"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition"
            >
              <ShoppingCart className="h-3.5 w-3.5 text-slate-400" />
              <span>Open POS</span>
            </Link>

            {user.role === Role.ADMIN && (
              <Link
                href="/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition"
              >
                <Settings className="h-3.5 w-3.5 text-slate-400" />
                <span>Shop Settings</span>
              </Link>
            )}
          </div>

          {/* Logout Action */}
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
