'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Boxes,
  ReceiptText,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Store,
  ShieldCheck,
  AlertTriangle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logoutAction } from '@/app/actions/auth.actions';
import { Role } from '@prisma/client';

export interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: Role;
  };
  shopName?: string;
  lowStockCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  user,
  shopName = 'Apex Retail Hub',
  lowStockCount = 0,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Products', href: '/products', icon: Package },
    { label: 'Categories', href: '/categories', icon: FolderTree },
    {
      label: 'Inventory',
      href: '/inventory',
      icon: Boxes,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    { label: 'Sales', href: '/sales', icon: ReceiptText },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
    { label: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
  ];

  const handleLogout = async () => {
    if (onClose) onClose();
    await logoutAction();
    router.push('/login');
    router.refresh();
  };

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-100 px-5">
        <Link
          href="/"
          onClick={handleLinkClick}
          className="flex items-center gap-3 overflow-hidden"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
            <Store className="h-5 w-5" />
          </div>
          <div className="overflow-hidden">
            <h1 className="truncate text-sm font-bold text-slate-900 leading-tight">{shopName}</h1>
            <span className="text-[10px] font-semibold tracking-wider text-indigo-600 uppercase">
              Retail Management
            </span>
          </div>
        </Link>

        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden transition"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Primary POS Action Button */}
      <div className="px-3 pt-3">
        <Link
          href="/pos"
          onClick={handleLinkClick}
          className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Open POS Terminal</span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 px-3 py-3 overflow-y-auto">
        {navItems.map((item) => {
          if (item.adminOnly && user.role !== Role.ADMIN) {
            return null;
          }

          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                'group flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={cn(
                    'h-4 w-4 transition-colors shrink-0',
                    isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  <AlertTriangle className="mr-1 h-3 w-3 text-amber-600" />
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout Footer */}
      <div className="border-t border-slate-100 p-3 bg-slate-50/50">
        <div className="mb-2.5 flex items-center gap-2.5 px-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200">
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-xs font-semibold text-slate-800 leading-tight">
              {user.name}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
              <ShieldCheck className="h-3 w-3 text-indigo-500 shrink-0" />
              <span className="truncate">{user.role}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 shadow-2xs"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-slate-200 lg:shadow-xs">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop & Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-2xl animate-in slide-in-from-left duration-200 z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
