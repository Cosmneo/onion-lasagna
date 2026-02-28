/**
 * @fileoverview Pre-built ArkType pagination schemas.
 *
 * Provides reusable schemas for paginated list endpoints,
 * matching the core `PaginationInput` and `PaginatedData<T>` types.
 *
 * ArkType uses `.pipe().to()` morphs for string→number coercion
 * and `.default()` for default values.
 *
 * @module schemas/pagination
 */

import { type, Type } from 'arktype';

const coercedPage = type('string | number')
  .pipe((v) => Number(v))
  .to('number%1 >= 1')
  .default(1);

const coercedPageSize = type('string | number')
  .pipe((v) => Number(v))
  .to('1 <= number%1 <= 100')
  .default(10);

export const pagination = {
  /**
   * Query params schema for paginated list requests.
   *
   * Coerces string query params to numbers via morphs,
   * validates constraints, and applies defaults.
   */
  input: type({ page: coercedPage, pageSize: coercedPageSize }),

  /**
   * Factory for paginated response schemas.
   *
   * @param itemSchema - ArkType schema for individual items in the list
   * @returns ArkType schema for `{ items: T[], total: number }`
   */
  response: <T extends Type>(itemSchema: T) =>
    type({ items: itemSchema.array(), total: 'number%1 >= 0' }),
};
