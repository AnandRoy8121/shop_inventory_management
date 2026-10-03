import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gangga Aqua - Inventory & Shop Management',
  description:
    'Point-of-sale, stock tracking, and profit analytics for Gangga Aqua.',
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
