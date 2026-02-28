/**
 * @fileoverview Pre-built Zod v3 pagination schemas.
 *
 * Provides reusable schemas for paginated list endpoints,
 * matching the core `PaginationInput` and `PaginatedData<T>` types.
 *
 * @module schemas/pagination
 */

import { z } from 'zod';

export const pagination = {
  /**
   * Query params schema for paginated list requests.
   *
   * Coerces string query params to numbers, validates constraints,
   * and applies defaults. Composable via `.extend()`.
   */
  input: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
  }),

  /**
   * Factory for paginated response schemas.
   *
   * @param itemSchema - Zod schema for individual items in the list
   * @returns Zod schema for `{ items: T[], total: number }`
   */
  response: <T extends z.ZodType>(itemSchema: T) =>
    z.object({
      items: z.array(itemSchema),
      total: z.number(),
    }),
};
