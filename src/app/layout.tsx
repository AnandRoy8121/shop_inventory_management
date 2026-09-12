import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Apex Retail Hub - Inventory & Shop Management',
  description:
    'Production-grade retail point-of-sale, double-entry inventory movement ledger, and profit analytics.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col font-sans antialiased text-slate-900 bg-slate-50">
        {children}
      </body>
    </html>
  );
}
