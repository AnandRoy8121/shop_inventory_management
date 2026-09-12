'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  products: 'Products',
  categories: 'Categories',
  inventory: 'Inventory',
  movements: 'Movements',
  sales: 'Sales',
  customers: 'Customers',
  reports: 'Reports & Analytics',
  settings: 'Shop Settings',
  pos: 'POS Terminal',
};

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const pathname = usePathname();

  // If items not provided, parse from pathname
  const breadcrumbs: BreadcrumbItem[] =
    items ||
    (() => {
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length === 0) {
        return [{ label: 'Dashboard', href: '/' }];
      }

      const generated: BreadcrumbItem[] = [{ label: 'Dashboard', href: '/' }];
      let accumulated = '';

      for (const segment of segments) {
        accumulated += `/${segment}`;
        generated.push({
          label: ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
          href: accumulated,
        });
      }

      return generated;
    })();

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1.5 text-xs text-slate-500">
        <li>
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>

        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <li key={item.label + index} className="flex items-center gap-1.5">
              <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
              {isLast || !item.href ? (
                <span className="font-semibold text-slate-800 truncate">{item.label}</span>
              ) : (
                <Link href={item.href} className="hover:text-indigo-600 transition-colors truncate">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
