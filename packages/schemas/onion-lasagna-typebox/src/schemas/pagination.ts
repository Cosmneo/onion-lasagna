/**
 * @fileoverview Pre-built TypeBox pagination schemas.
 *
 * Provides reusable schemas for paginated list endpoints,
 * matching the core `PaginationInput` and `PaginatedData<T>` types.
 *
 * TypeBox uses JSON Schema `default` annotations for default values.
 * Frameworks like Fastify handle coercion from strings natively via JSON Schema.
 *
 * @module schemas/pagination
 */

import { Type, type TSchema } from '@sinclair/typebox';

export const pagination = {
  /**
   * Query params schema for paginated list requests.
   *
   * Uses JSON Schema `default` annotations. Coercion from query string
   * values is handled by the framework (e.g., Fastify).
   *
   * @example
   * ```typescript
   * // Direct use
   * typeboxSchema(pagination.input)
   *
   * // Extended with filters
   * typeboxSchema(Type.Intersect([
   *   pagination.input,
   *   Type.Object({ searchTerm: Type.Optional(Type.String()) }),
   * ]))
   * ```
   */
  input: Type.Object({
    page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
    pageSize: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 10 })),
  }),

  /**
   * Factory for paginated response schemas.
   *
   * @param itemSchema - TypeBox schema for individual items in the list
   * @returns TypeBox schema for `{ items: T[], total: number }`
   */
  response: <T extends TSchema>(itemSchema: T) =>
    Type.Object({
      items: Type.Array(itemSchema),
      total: Type.Integer({ minimum: 0 }),
    }),
};
