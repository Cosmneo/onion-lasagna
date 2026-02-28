/**
 * @fileoverview Common types used across application layers.
 *
 * Shared type definitions for pagination, validation errors, and other
 * cross-cutting concerns that are reused across bounded contexts.
 *
 * @module types
 *
 * @example
 * ```typescript
 * import { PaginatedData, PaginationInput } from '@cosmneo/onion-lasagna/types';
 *
 * interface ListUsersInput extends PaginationInput {
 *   readonly filter?: string;
 * }
 *
 * type ListUsersOutput = PaginatedData<UserReadModel>;
 * ```
 */

export type { PaginationInput, PaginatedData } from './global/interfaces/types/pagination.type';
export type { ValidationError } from './global/interfaces/types/validation-error.type';
