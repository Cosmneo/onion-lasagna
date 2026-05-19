/**
 * @fileoverview Error handler for GraphQL Yoga.
 *
 * Maps onion-lasagna errors to GraphQL errors with proper extension codes.
 *
 * @module graphql/frameworks/yoga/error-handler
 */

import { GraphQLError } from 'graphql';
import {
  mapErrorToGraphQLError,
  type MappedGraphQLError,
} from '@cosmneo/onion-lasagna/graphql/shared';
import { getHttpStatusCode } from '@cosmneo/onion-lasagna/http/shared';

/**
 * Maps an error to a GraphQL-compatible error structure.
 *
 * This provides the same API as other framework adapters for consistent
 * cross-framework usage.
 *
 * @param error - The error to map
 * @returns Mapped GraphQL error with message and extensions
 */
export function mapErrorToResponse(error: unknown): MappedGraphQLError {
  return mapErrorToGraphQLError(error);
}

/**
 * Maps an error to a GraphQL error instance for Yoga.
 *
 * @param error - The error to map
 * @returns GraphQLError instance with proper extensions
 */
export function mapToGraphQLError(error: unknown): GraphQLError {
  if (error instanceof GraphQLError) {
    return error;
  }

  const mapped = mapErrorToGraphQLError(error);
  return new GraphQLError(mapped.message, {
    extensions: { ...mapped.extensions },
  });
}

/**
 * Yoga error masking function that uses onion-lasagna's error mapping.
 *
 * Pass this as the `maskError` option to createYoga to override Yoga's
 * default error masking with onion-lasagna's error hierarchy mapping.
 *
 * @example
 * ```typescript
 * import { createYoga } from 'graphql-yoga';
 * import { onionMaskError } from '@cosmneo/onion-lasagna-yoga';
 *
 * const yoga = createYoga({
 *   schema,
 *   maskedErrors: { maskError: onionMaskError },
 * });
 * ```
 */
export function onionMaskError(error: unknown, _message: string, _isDev: boolean): Error {
  return mapToGraphQLError(error instanceof GraphQLError ? (error.originalError ?? error) : error);
}

/**
 * Maps an error thrown from the GraphQL context factory to a GraphQLError
 * carrying an `extensions.http.status`.
 *
 * Unlike resolver errors (which the GraphQL spec surfaces with HTTP 200),
 * a throw from the context factory aborts the whole request. Yoga only
 * derives a non-500 HTTP status from `extensions.http.status`; a bare onion
 * error has none, so Yoga treats it as unexpected and responds 500. Attaching
 * the onion taxonomy's status here makes auth/not-found/etc. surface with the
 * correct HTTP status (401/403/404/...).
 *
 * Status is classified via `getHttpStatusCode`, which matches by a stable
 * discriminant (error name) in addition to `instanceof`, so it stays correct
 * even when `@cosmneo/onion-lasagna` is duplicated across package boundaries.
 *
 * @param error - The error thrown by the context factory
 * @returns GraphQLError with onion code extensions and `extensions.http.status`
 */
export function mapContextErrorToGraphQLError(error: unknown): GraphQLError {
  if (error instanceof GraphQLError) {
    return error;
  }

  const mapped = mapErrorToGraphQLError(error);
  return new GraphQLError(mapped.message, {
    extensions: {
      ...mapped.extensions,
      http: { status: getHttpStatusCode(error) },
    },
  });
}
