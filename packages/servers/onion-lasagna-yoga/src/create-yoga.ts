/**
 * @fileoverview Factory function for creating an onion-lasagna Yoga server.
 *
 * Takes `UnifiedGraphQLField[]` from `graphqlRoutes().build()` and creates
 * a GraphQL Yoga instance ready to be mounted on any HTTP framework.
 *
 * @module graphql/frameworks/yoga/create-yoga
 */

import { createYoga, createSchema } from 'graphql-yoga';
import type { YogaServerInstance } from 'graphql-yoga';
import { buildSchemaFromFields } from './build-schema';
import type { CreateOnionYogaOptions } from './types';

/**
 * Creates a GraphQL Yoga server from onion-lasagna field definitions.
 *
 * The resolver layer is a thin passthrough — all validation, authorization,
 * and error handling is already done by the core field handler pipeline
 * (`create-graphql-routes.ts`).
 *
 * @param options - Configuration with fields and optional context factory
 * @returns A GraphQL Yoga instance
 *
 * @example With Hono
 * ```typescript
 * import { Hono } from 'hono';
 * import { createOnionYoga } from '@cosmneo/onion-lasagna-yoga';
 * import { graphqlRoutes } from '@cosmneo/onion-lasagna/graphql/server';
 *
 * const fields = graphqlRoutes(projectSchema)
 *   .handle('projects.list', async () => allProjects)
 *   .handleWithUseCase('projects.create', { argsMapper, useCase, responseMapper })
 *   .build();
 *
 * const yoga = createOnionYoga({
 *   fields,
 *   createContext: async (request) => ({
 *     userId: await extractUserId(request),
 *   }),
 * });
 *
 * const app = new Hono();
 * app.use('/graphql', async (c) => {
 *   const response = await yoga.fetch(c.req.raw);
 *   return new Response(response.body, response);
 * });
 * ```
 *
 * @example Standalone
 * ```typescript
 * import { createServer } from 'node:http';
 * import { createOnionYoga } from '@cosmneo/onion-lasagna-yoga';
 *
 * const yoga = createOnionYoga({ fields });
 * const server = createServer(yoga);
 * server.listen(4000);
 * ```
 */
export function createOnionYoga(
  options: CreateOnionYogaOptions,
): YogaServerInstance<Record<string, unknown>, Record<string, unknown>> {
  const { typeDefs, resolvers } = buildSchemaFromFields(
    options.fields,
    options.schema,
    options.onResolverError,
  );

  const schema = createSchema({ typeDefs, resolvers });

  // Build yoga options
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const yogaOptions: Record<string, any> = {
    schema,
    graphiql: options.yoga?.graphiql ?? true,
  };

  // Context factory — wrap with error logging
  if (options.createContext) {
    const createContext = options.createContext;
    const onError = options.onResolverError;
    yogaOptions['context'] = async ({ request }: { request: Request }) => {
      try {
        return await createContext(request);
      } catch (error) {
        if (onError) {
          try {
            onError(error, 'context');
          } catch {
            /* don't let logging break the response */
          }
        }
        throw error;
      }
    };
  }

  // Logging
  if (options.yoga?.logging !== undefined) {
    yogaOptions['logging'] = options.yoga.logging;
  }

  // Depth limiting — enabled by default (maxDepth: 20)
  const maxDepth = options.maxDepth !== false ? (options.maxDepth ?? 20) : undefined;
  if (maxDepth !== undefined) {
    yogaOptions['plugins'] = [...(options.plugins ?? []), createDepthLimitPlugin(maxDepth)];
  } else if (options.plugins && options.plugins.length > 0) {
    yogaOptions['plugins'] = options.plugins;
  }

  // Disable Yoga's built-in error masking.
  // Error mapping is handled in the resolver layer (build-schema.ts) where
  // onion-lasagna errors are converted to GraphQLError with proper extensions.
  yogaOptions['maskedErrors'] = false;

  return createYoga(yogaOptions);
}

/**
 * Simple depth-limiting plugin. Counts nesting levels in the GraphQL AST
 * before execution and rejects queries that exceed the limit.
 */
function createDepthLimitPlugin(maxDepth: number) {
  return {
    onParse() {
      return ({ result }: { result: unknown }) => {
        // result is the parsed DocumentNode
        if (!result || typeof result !== 'object' || !('definitions' in result)) return;
        const doc = result as { definitions: readonly unknown[] };
        for (const def of doc.definitions) {
          const depth = measureDepth(def, 0);
          if (depth > maxDepth) {
            throw new GraphQLError(
              `Query depth ${depth} exceeds maximum allowed depth of ${maxDepth}`,
              { extensions: { code: 'QUERY_DEPTH_LIMIT_EXCEEDED' } },
            );
          }
        }
      };
    },
  };
}

/**
 * Recursively measures the depth of a GraphQL AST node.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function measureDepth(node: any, currentDepth: number): number {
  if (!node || typeof node !== 'object') return currentDepth;

  const selectionSet = node.selectionSet;
  if (!selectionSet || !selectionSet.selections) return currentDepth;

  let maxChild = currentDepth;
  for (const selection of selectionSet.selections) {
    const childDepth = measureDepth(selection, currentDepth + 1);
    if (childDepth > maxChild) maxChild = childDepth;
  }
  return maxChild;
}

import { GraphQLError } from 'graphql';
