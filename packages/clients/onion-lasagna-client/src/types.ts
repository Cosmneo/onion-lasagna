/**
 * @fileoverview Type definitions for the mock client (v2 — flat API).
 *
 * Provides types for creating in-memory mock clients that mirror
 * the shape of `createClient` for use in tests.
 *
 * @module unified/client/types
 */

import type {
  RouteDefinition,
  RouterConfig,
  HasPathParams,
  PathParams,
  PrettifyDeep,
} from '@cosmneo/onion-lasagna/http/route';

// ============================================================================
// Input / Response Types (mirrored from core client for independence)
// ============================================================================

/**
 * Input for a mock handler.
 * Mirrors ClientRequestInput but defined locally to avoid coupling.
 */
export type MockRequestInput<TRoute extends RouteDefinition> = PrettifyDeep<
  (HasPathParams<TRoute['path']> extends true
    ? { pathParams: PathParams<TRoute['path']> }
    : object) &
    (TRoute['_types']['body'] extends undefined ? object : { body: TRoute['_types']['body'] }) &
    (TRoute['_types']['query'] extends undefined ? object : { query: TRoute['_types']['query'] }) &
    (TRoute['_types']['headers'] extends undefined
      ? object
      : { headers: TRoute['_types']['headers'] })
>;

/**
 * Response type extraction.
 * Reads the response type directly from the route's `_types.response`.
 */
export type MockResponse<TRoute extends RouteDefinition> =
  TRoute['_types']['response'] extends undefined ? void : TRoute['_types']['response'];

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Checks if a route requires input (has body, params, or required query).
 */
type RequiresInput<TRoute extends RouteDefinition> =
  HasPathParams<TRoute['path']> extends true
    ? true
    : TRoute['_types']['body'] extends undefined
      ? false
      : true;

/**
 * A mock handler function for a single route.
 * Receives the same input as the real client and returns the response type.
 */
export type MockHandler<TRoute extends RouteDefinition> =
  RequiresInput<TRoute> extends true
    ? (input: MockRequestInput<TRoute>) => MockResponse<TRoute> | Promise<MockResponse<TRoute>>
    : (input?: MockRequestInput<TRoute>) => MockResponse<TRoute> | Promise<MockResponse<TRoute>>;

/**
 * Recursively maps a router config to mock handler objects.
 * Handlers are optional — only mock the routes you test.
 */
export type MockHandlers<T extends RouterConfig> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for proper extends check on generic interface
  [K in keyof T]?: T[K] extends RouteDefinition<any, any, any, any, any, any, any, any>
    ? MockHandler<T[K]>
    : T[K] extends RouterConfig
      ? MockHandlers<T[K]>
      : never;
};

// ============================================================================
// Client Types
// ============================================================================

/**
 * A mock client method for a single route.
 */
export type MockClientMethod<TRoute extends RouteDefinition> =
  RequiresInput<TRoute> extends true
    ? (input: MockRequestInput<TRoute>) => Promise<MockResponse<TRoute>>
    : (input?: MockRequestInput<TRoute>) => Promise<MockResponse<TRoute>>;

/**
 * Recursively builds the mock client type from a router config.
 */
export type InferMockClient<T extends RouterConfig> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for proper extends check on generic interface
  [K in keyof T]: T[K] extends RouteDefinition<any, any, any, any, any, any, any, any>
    ? MockClientMethod<T[K]>
    : T[K] extends RouterConfig
      ? InferMockClient<T[K]>
      : never;
};

// ============================================================================
// Call Recording
// ============================================================================

/**
 * A recorded mock client call.
 */
export interface MockCall {
  /** Dot-separated route key (e.g. "users.list") */
  readonly route: string;
  /** The input passed to the mock method */
  readonly input: unknown;
  /** The response returned by the handler */
  readonly response: unknown;
  /** Timestamp of the call */
  readonly timestamp: number;
}

// ============================================================================
// Factory Result
// ============================================================================

/**
 * Result of `createMockClient()`.
 */
export interface MockClientResult<T extends RouterConfig> {
  /** Mock client with the same shape as `createClient` output */
  readonly client: PrettifyDeep<InferMockClient<T>>;
  /** All recorded calls in order */
  readonly calls: MockCall[];
  /** Filter calls by dot-separated route key */
  readonly callsFor: (route: string) => MockCall[];
  /** Clear all recorded calls */
  readonly reset: () => void;
}

// ============================================================================
// Sequence Options
// ============================================================================

/**
 * Options for `mockSequence()`.
 */
export interface MockSequenceOptions {
  /**
   * Behavior when all responses have been exhausted.
   * - `'throw'` — throw an error (default)
   * - `'cycle'` — restart from the beginning
   * - `'last'` — repeat the last response
   */
  readonly exhausted?: 'throw' | 'cycle' | 'last';
}
