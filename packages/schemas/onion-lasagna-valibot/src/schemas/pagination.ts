/**
 * @fileoverview Pre-built Valibot pagination schemas.
 *
 * Provides reusable schemas for paginated list endpoints,
 * matching the core `PaginationInput` and `PaginatedData<T>` types.
 *
 * @module schemas/pagination
 */

import * as v from 'valibot';
import type { GenericSchema } from 'valibot';

export const pagination = {
  /**
   * Query params schema for paginated list requests.
   *
   * Coerces string query params to numbers via `v.transform(Number)`,
   * validates constraints, and applies defaults.
   *
   * @example
   * ```typescript
   * // Direct use
   * valibotSchema(pagination.input)
   *
   * // Extended with filters
   * valibotSchema(v.object({
   *   ...pagination.input.entries,
   *   searchTerm: v.optional(v.string()),
   * }))
   * ```
   */
  input: v.object({
    page: v.optional(
      v.pipe(v.unknown(), v.transform(Number), v.number(), v.integer(), v.minValue(1)),
      1,
    ),
    pageSize: v.optional(
      v.pipe(
        v.unknown(),
        v.transform(Number),
        v.number(),
        v.integer(),
        v.minValue(1),
        v.maxValue(100),
      ),
      10,
    ),
  }),

  /**
   * Factory for paginated response schemas.
   *
   * @param itemSchema - Valibot schema for individual items in the list
   * @returns Valibot schema for `{ items: T[], total: number }`
   */
  response: <T extends GenericSchema>(itemSchema: T) =>
    v.object({
      items: v.array(itemSchema),
      total: v.number(),
    }),
};
