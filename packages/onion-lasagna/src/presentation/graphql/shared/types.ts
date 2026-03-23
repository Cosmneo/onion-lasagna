/**
 * @fileoverview Shared types for GraphQL error handling.
 *
 * @module graphql/shared/types
 */

/**
 * GraphQL error extension codes.
 *
 * These are set in the `extensions.code` field of GraphQL errors,
 * following the convention established by Apollo Server.
 */
export type GraphQLErrorCode =
  | 'VALIDATION_ERROR'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR';

/**
 * GraphQL error extensions structure.
 */
export interface GraphQLErrorExtensions {
  /** Machine-readable error code. */
  readonly code: GraphQLErrorCode;

  /** Original error code from the CodedError. */
  readonly originalCode?: string;

  /** Field-level validation errors (for validation failures). */
  readonly validationErrors?: readonly GraphQLValidationErrorItem[];
}

/**
 * Individual field validation error.
 */
export interface GraphQLValidationErrorItem {
  /** Field path (e.g., 'input.name'). */
  readonly field: string;

  /** Error message for this field. */
  readonly message: string;
}

/**
 * Mapped GraphQL error with message and extensions.
 */
export interface MappedGraphQLError {
  /** Human-readable error message. */
  readonly message: string;

  /** GraphQL error extensions. */
  readonly extensions: GraphQLErrorExtensions;
}
