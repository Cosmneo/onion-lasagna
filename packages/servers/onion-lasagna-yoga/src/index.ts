/**
 * @fileoverview GraphQL Yoga adapter for onion-lasagna.
 *
 * @module graphql/frameworks/yoga
 *
 * @example
 * ```typescript
 * import { createOnionYoga } from '@cosmneo/onion-lasagna-yoga';
 * import { graphqlRoutes } from '@cosmneo/onion-lasagna/graphql/server';
 *
 * const fields = graphqlRoutes(schema)
 *   .handle('getUser', async (args) => getUserById(args.input.userId))
 *   .build();
 *
 * const yoga = createOnionYoga({ fields });
 * // Mount on any framework via yoga.fetch
 * ```
 */

export { createOnionYoga } from './create-yoga';
export { mapErrorToResponse, mapToGraphQLError, onionMaskError } from './error-handler';
export { buildSchemaFromFields } from './build-schema';
export type { BuiltSchema } from './build-schema';
export type {
  CreateOnionYogaOptions,
  UnifiedGraphQLField,
  GraphQLHandlerContext,
  MappedGraphQLError,
} from './types';
