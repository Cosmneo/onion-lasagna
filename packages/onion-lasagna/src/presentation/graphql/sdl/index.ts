/**
 * @fileoverview GraphQL SDL generation module exports.
 *
 * @module graphql/sdl
 *
 * @example Generate SDL
 * ```typescript
 * import { generateGraphQLSDL } from '@cosmneo/onion-lasagna/graphql/sdl';
 *
 * const sdl = generateGraphQLSDL(schema);
 * ```
 */

export { generateGraphQLSDL, generateGraphQLSDLWithMeta } from './generate';
export type { GraphQLSDLConfig } from './types';
export type { GraphQLSDLResult, GraphQLUnionMetadata } from './generate';
