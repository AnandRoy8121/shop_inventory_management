'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, Boxes, ShoppingBag, BarChart3 } from 'lucide-react';

interface BottomNavProps {
  lowStockCount?: number;
}

export function BottomNav({ lowStockCount = 0 }: BottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Sales', href: '/sales', icon: ShoppingBag, isPrimary: true },
    { label: 'Products', href: '/products', icon: Package },
    { label: 'Inventory', href: '/inventory', icon: Boxes, badge: lowStockCount > 0 ? lowStockCount : undefined },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg lg:hidden"
    >
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-3 group"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full shadow-md transition-transform active:scale-95 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-indigo-200'
                      : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-100'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <span
                  className={`text-[10px] font-bold mt-0.5 tracking-tight ${
                    isActive ? 'text-indigo-600' : 'text-slate-600'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center transition-colors active:scale-95 ${
                isActive ? 'text-indigo-600 font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-600 stroke-[2.25]' : 'text-slate-500'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white shadow-xs">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-1 truncate max-w-[56px] text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
