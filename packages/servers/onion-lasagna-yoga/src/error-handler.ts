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
