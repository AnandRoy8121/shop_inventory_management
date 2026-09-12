'use client';

import React, { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { ToastProvider } from '@/components/shared/toast';
import { Role } from '@prisma/client';

export interface AppShellProps {
  user: {
    name: string;
    email: string;
    role: Role;
  };
  shopName?: string;
  lowStockCount?: number;
  children: React.ReactNode;
}

export function AppShell({
  user,
  shopName = 'Apex Retail Hub',
  lowStockCount = 0,
  children,
}: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50/60 text-slate-900 flex">
        {/* Desktop and Mobile Responsive Sidebar */}
        <Sidebar
          user={user}
          shopName={shopName}
          lowStockCount={lowStockCount}
          isOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />

        {/* Main Content Viewport */}
        <div className="flex-1 flex flex-col min-h-screen lg:pl-64 w-full">
          {/* Top Navigation Bar */}
          <Header
            user={user}
            lowStockCount={lowStockCount}
            onMenuToggle={() => setMobileNavOpen(true)}
          />

          {/* Main Work Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
