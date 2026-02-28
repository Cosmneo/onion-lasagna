/**
 * @fileoverview Pre-built Zod Mini pagination schemas.
 *
 * Provides reusable schemas for paginated list endpoints using
 * `zod/mini` for smaller bundle size in serverless/edge deployments.
 *
 * @module schemas/pagination-mini
 */

import * as zm from 'zod/mini';

export const paginationMini = {
  /**
   * Query params schema for paginated list requests (Zod Mini).
   *
   * Coerces string query params to numbers, validates constraints,
   * and applies defaults.
   */
  input: zm.object({
    page: zm._default(zm.coerce.number().check(zm.int(), zm.minimum(1)), 1),
    pageSize: zm._default(zm.coerce.number().check(zm.int(), zm.minimum(1), zm.maximum(100)), 10),
  }),

  /**
   * Factory for paginated response schemas (Zod Mini).
   *
   * @param itemSchema - Zod Mini schema for individual items
   * @returns Zod Mini schema for `{ items: T[], total: number }`
   */
  response: <T extends zm.ZodMiniType>(itemSchema: T) =>
    zm.object({
      items: zm.array(itemSchema),
      total: zm.number(),
    }),
};
