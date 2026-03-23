/**
 * @fileoverview Client types for the GraphQL client.
 *
 * @module graphql/client/types
 */

import type {
  GraphQLFieldDefinition,
  GraphQLSchemaConfig,
} from '@cosmneo/onion-lasagna/graphql/field';

// ============================================================================
// Client Configuration
// ============================================================================

/**
 * Configuration for creating a GraphQL client.
 */
export interface GraphQLClientConfig {
  /**
   * GraphQL endpoint URL.
   *
   * @example 'http://localhost:4000/graphql'
   */
  readonly url: string;

  /**
   * Default headers to include in all requests.
   * Can be a static object or a function for dynamic headers.
   */
  readonly headers?:
    | Record<string, string>
    | (() => Record<string, string> | Promise<Record<string, string>>);

  /**
   * Request interceptor.
   * Called before each request is sent. Can modify the request init.
   */
  readonly onRequest?: (init: RequestInit) => RequestInit | Promise<RequestInit>;

  /**
   * Error handler.
   * Called when a request fails (network or GraphQL errors).
   */
  readonly onError?: (error: GraphQLClientError) => void | Promise<void>;

  /**
   * Custom fetch implementation.
   * Defaults to global fetch.
   */
  readonly fetch?: typeof fetch;
}

// ============================================================================
// Client Errors
// ============================================================================

/**
 * Error thrown by the GraphQL client.
 */
export class GraphQLClientError extends Error {
  constructor(
    message: string,
    public readonly errors: readonly GraphQLResponseError[],
    public readonly response?: Response,
  ) {
    super(message);
    this.name = 'GraphQLClientError';
  }
}

/**
 * A single GraphQL error from the response.
 */
export interface GraphQLResponseError {
  readonly message: string;
  readonly locations?: readonly { line: number; column: number }[];
  readonly path?: readonly (string | number)[];
  readonly extensions?: Record<string, unknown>;
}

// ============================================================================
// Field Selection Types
// ============================================================================

/**
 * Extracts the element type from an output type.
 * Arrays → element type, objects → the object itself.
 */
type OutputElement<TOutput> = TOutput extends readonly (infer E)[] ? E : TOutput;

/**
 * Extracts the selectable field keys from an output type.
 * Works with both `{ id, title }` and `{ id, title }[]`.
 */
export type OutputKeys<TOutput> = TOutput extends undefined
  ? never
  : keyof OutputElement<TOutput> & string;

/**
 * Field selection — supports both flat arrays and nested object syntax.
 *
 * @example Flat (array of keys)
 * ```typescript
 * { select: ['id', 'title'] }
 * ```
 *
 * @example Nested (object with sub-selections)
 * ```typescript
 * { select: { id: true, title: true, category: { label: true } } }
 * ```
 */
export type FieldSelection<T> =
  | readonly (keyof T & string)[]
  | { readonly [K in keyof T & string]?: SelectionValue<T[K]> };

/**
 * A selection value: `true` (include field) or a nested selection for objects.
 */
type SelectionValue<T> =
  | true
  | (NonNullable<T> extends readonly (infer E)[]
      ? FieldSelection<E>
      : NonNullable<T> extends Record<string, unknown>
        ? FieldSelection<NonNullable<T>>
        : never);

/**
 * Applies a field selection to narrow the output type.
 *
 * - Array selection: `['id', 'title']` → `Pick<T, 'id' | 'title'>`
 * - Object selection: `{ id: true, category: { label: true } }` → `{ id: ..., category: { label: ... } }`
 * - Preserves array wrapping on the output type.
 */
export type ApplySelection<TOutput, S> = TOutput extends readonly (infer E)[]
  ? ApplyToElement<E, S>[]
  : ApplyToElement<TOutput, S>;

/**
 * Applies selection to a single element (unwrapped from array).
 */
type ApplyToElement<T, S> =
  // Flat array of keys
  S extends readonly (infer K extends string)[]
    ? Pick<T & Record<string, unknown>, K & keyof T>
    : // Object selection
      S extends Record<string, unknown>
      ? {
          [K in keyof S & keyof T & string]: S[K] extends true
            ? T[K]
            : NonNullable<T[K]> extends readonly unknown[]
              ? ApplySelection<T[K], S[K]>
              : NonNullable<T[K]> extends Record<string, unknown>
                ? ApplySelection<NonNullable<T[K]>, S[K]> | Extract<T[K], undefined | null>
                : T[K];
        }
      : T;

/**
 * Per-query options with type-safe field selection.
 */
export interface GraphQLQueryOptions<S> {
  readonly select: S;
}

/**
 * Type helper for creating typed field selections.
 * Use with `as const satisfies SelectionOf<...>` for compile-time validation
 * and literal type preservation.
 *
 * @example
 * ```typescript
 * const headerFields = {
 *   subject: true,
 *   status: true,
 * } as const satisfies SelectionOf<typeof schema.fields.tickets.get>;
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SelectionOf<TField extends GraphQLFieldDefinition<any, any, any, any>> = FieldSelection<
  OutputElement<TField['_types']['output']>
>;

// ============================================================================
// Client Method Types
// ============================================================================

/**
 * Determines if a field requires input.
 */
type RequiresInput<TField extends GraphQLFieldDefinition> =
  TField['_types']['input'] extends undefined ? false : true;

/**
 * A client method for a single GraphQL field.
 *
 * Uses overloaded call signatures so that:
 * - No `select` → returns full `TOutput`
 * - With `select: ['id']` → returns `Pick<TOutput, 'id'>`
 * - With `select: { id: true, category: { label: true } }` → nested narrowing
 *
 * @example Flat select
 * ```typescript
 * const partial = await client.todos.list(undefined, { select: ['id', 'title'] });
 * partial[0].title     // OK
 * partial[0].completed // TS error
 * ```
 *
 * @example Nested select
 * ```typescript
 * const nested = await client.todos.list(undefined, {
 *   select: { id: true, category: { label: true } },
 * });
 * nested[0].id              // OK
 * nested[0].category.label  // OK
 * nested[0].category.color  // TS error
 * ```
 */
export type GraphQLClientMethod<TField extends GraphQLFieldDefinition> =
  RequiresInput<TField> extends true
    ? {
        // Full output (no options)
        (input: TField['_types']['input']): Promise<TField['_types']['output']>;
        // Selected output (flat array or nested object)
        <S extends FieldSelection<OutputElement<TField['_types']['output']>>>(
          input: TField['_types']['input'],
          options: GraphQLQueryOptions<S>,
        ): Promise<ApplySelection<TField['_types']['output'], S>>;
      }
    : {
        // Full output (no args)
        (input?: undefined): Promise<TField['_types']['output']>;
        // Selected output (flat array or nested object)
        <S extends FieldSelection<OutputElement<TField['_types']['output']>>>(
          input: undefined,
          options: GraphQLQueryOptions<S>,
        ): Promise<ApplySelection<TField['_types']['output'], S>>;
      };

/**
 * Recursively builds the client type from a schema config.
 */
export type InferGraphQLClient<T extends GraphQLSchemaConfig> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof T]: T[K] extends GraphQLFieldDefinition<any, any, any, any>
    ? GraphQLClientMethod<T[K]>
    : T[K] extends GraphQLSchemaConfig
      ? InferGraphQLClient<T[K]>
      : never;
};

// ============================================================================
// Batch Query Types
// ============================================================================

/**
 * A single entry in a batch query.
 */
export interface BatchQueryEntry {
  /** Dot-separated field key (e.g., 'tickets.get') */
  readonly fieldKey: string;
  /** Input for this field (undefined if no input required) */
  readonly input?: unknown;
  /** Field selection (which fields to request) */
  readonly select?: unknown;
}

/**
 * Function that executes a batch query.
 * Keys in the input record are aliases; values describe each field to fetch.
 * Returns a record with the same aliases mapping to their response data.
 */
export type BatchQueryFn = (
  entries: Record<string, BatchQueryEntry>,
) => Promise<Record<string, unknown>>;
