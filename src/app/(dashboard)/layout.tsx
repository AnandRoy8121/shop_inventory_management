import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AppShell } from '@/components/layout/app-shell';
import { InventoryService } from '@/services/inventory.service';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const inventorySummary = await InventoryService.getInventorySummary();

  return (
    <AppShell
      user={user}
      shopName="Gangga Aqua"
      lowStockCount={inventorySummary.totalAlerts}
    >
      {children}
    </AppShell>
  );
}
