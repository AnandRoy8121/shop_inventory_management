'use client';

import React from 'react';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { LoadingState } from './loading-state';
import { EmptyState, EmptyStateProps } from './empty-state';
import { Pagination, PaginationProps } from './pagination';
import { cn } from '@/lib/utils';

export interface ColumnDef<T> {
  id?: string;
  header: React.ReactNode;
  cell?: (item: T, index: number) => React.ReactNode;
  accessorKey?: keyof T;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor?: (item: T, index: number) => string | number;
  isLoading?: boolean;
  emptyState?: Partial<EmptyStateProps>;
  pagination?: PaginationProps;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyState,
  pagination,
  className,
}: DataTableProps<T>) {
  if (isLoading) {
    return <LoadingState variant="table-skeleton" rows={5} className={className} />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <EmptyState
          title={emptyState?.title || 'No records found'}
          description={
            emptyState?.description || 'There are no items to display matching your criteria.'
          }
          icon={emptyState?.icon}
          action={emptyState?.action}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden',
        className
      )}
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/80 border-b border-slate-200">
            <TableRow>
              {columns.map((col, idx) => (
                <TableHead
                  key={col.id || String(col.accessorKey) || idx}
                  className={cn(
                    'text-xs font-semibold text-slate-700 py-3.5',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.className
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.map((item, rowIdx) => {
              const rowKey = keyExtractor
                ? keyExtractor(item, rowIdx)
                : ((item as { id?: string | number }).id ?? rowIdx);

              return (
                <TableRow
                  key={rowKey}
                  className="hover:bg-slate-50/70 border-b border-slate-100 last:border-none transition-colors"
                >
                  {columns.map((col, colIdx) => (
                    <TableCell
                      key={col.id || String(col.accessorKey) || colIdx}
                      className={cn(
                        'text-xs py-3',
                        col.align === 'right' && 'text-right',
                        col.align === 'center' && 'text-center',
                        col.className
                      )}
                    >
                      {col.cell
                        ? col.cell(item, rowIdx)
                        : col.accessorKey
                          ? String(
                              (item as Record<string, unknown>)[col.accessorKey as string] ?? ''
                            )
                          : null}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {pagination && <Pagination {...pagination} />}
    </div>
  );
}
