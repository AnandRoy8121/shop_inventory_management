export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export type SortOrder = 'asc' | 'desc';

export interface DateRangeFilter {
  startDate?: Date | string;
  endDate?: Date | string;
}

export type BaseStatus = 'active' | 'inactive';
