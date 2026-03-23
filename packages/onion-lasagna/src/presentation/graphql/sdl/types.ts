/**
 * @fileoverview Types for GraphQL SDL generation.
 *
 * @module graphql/sdl/types
 */

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for SDL generation.
 */
export interface GraphQLSDLConfig {
  /**
   * Additional SDL to prepend (e.g., custom scalars, directives).
   *
   * @example
   * ```typescript
   * generateGraphQLSDL(schema, {
   *   preamble: 'scalar DateTime\nscalar UUID',
   * })
   * ```
   */
  readonly preamble?: string;

  /**
   * Whether to include descriptions as SDL doc strings.
   * @default true
   */
  readonly includeDescriptions?: boolean;

  /**
   * Whether to include @deprecated directives.
   * @default true
   */
  readonly includeDeprecations?: boolean;
}
