/**
 * @fileoverview Pre-built Zod v4 pagination schemas.
 *
 * Provides reusable schemas for paginated list endpoints,
 * matching the core `PaginationInput` and `PaginatedData<T>` types.
 *
 * @module schemas/pagination
 */

import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZodAny = z.ZodType<any, any, any>;

export const pagination = {
  /**
   * Query params schema for paginated list requests.
   *
   * Coerces string query params to numbers, validates constraints,
   * and applies defaults. Composable via `.extend()`.
   *
   * @example
   * ```typescript
   * // Direct use
   * zodSchema(pagination.input)
   *
   * // Extended with filters
   * zodSchema(pagination.input.extend({
   *   searchTerm: z.string().optional(),
   *   status: z.enum(['active', 'inactive']).optional(),
   * }))
   * ```
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
   *
   * @example
   * ```typescript
   * const userListSchema = pagination.response(z.object({
   *   id: z.string(),
   *   name: z.string(),
   * }));
   * zodSchema(userListSchema)
   * ```
   */
  response: <T extends ZodAny>(itemSchema: T) =>
    z.object({
      items: z.array(itemSchema),
      total: z.number(),
    }),
};
