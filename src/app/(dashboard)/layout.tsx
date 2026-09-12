import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/server/security/auth';
import { AppShell } from '@/components/layout/app-shell';
import prisma from '@/server/db/prisma';
import { ProductService } from '@/server/services/product.service';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const [settings, alerts] = await Promise.all([
    prisma.shopSettings.findUnique({ where: { id: 'default' } }),
    ProductService.getStockAlerts(),
  ]);

  return (
    <AppShell
      user={user}
      shopName={settings?.shopName || 'Apex Retail Hub'}
      lowStockCount={alerts.totalAlerts}
    >
      {children}
    </AppShell>
  );
}
