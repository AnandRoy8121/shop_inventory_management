import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationSchema>;

export const idParamSchema = z.object({
  id: z.string().min(1, 'Identifier is required'),
});

export const dateRangeFilterSchema = z.object({
  preset: z
    .enum(['today', 'yesterday', 'this_week', 'this_month', 'last_month', 'custom'])
    .default('this_month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
