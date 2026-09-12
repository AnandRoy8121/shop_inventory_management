import prisma from '@/server/db/prisma';
import { getCurrentUser } from '@/server/security/auth';
import { SettingsForm } from '@/components/settings/settings-form';
import { Role } from '@prisma/client';
import { ShieldAlert } from 'lucide-react';

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (user?.role !== Role.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="rounded-full bg-rose-100 p-3 text-rose-600 mb-3">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">Administrative Access Required</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Only users with the ADMIN role are authorized to modify store identity, tax rates, and
          system settings.
        </p>
      </div>
    );
  }

  const settings = await prisma.shopSettings.findUnique({
    where: { id: 'default' },
  });

  if (!settings) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="pb-2 border-b border-slate-200">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Shop Settings</h2>
        <p className="text-xs text-slate-500">
          Configure business metadata, currency preferences, and POS defaults
        </p>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
