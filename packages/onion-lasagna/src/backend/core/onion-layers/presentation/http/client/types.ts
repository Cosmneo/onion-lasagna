/**
 * @fileoverview Client types for the unified route system.
 *
 * @module unified/client/types
 */

import type {
  RouteDefinition,
  RouterConfig,
  ResponsesConfig,
  ResponseConfig,
  PathParams,
  HasPathParams,
} from '../route/types';

// ============================================================================
// Client Configuration
// ============================================================================

/**
 * Configuration for creating a client.
 */
export interface ClientConfig {
  /**
   * Base URL of the API server.
   * All route paths will be appended to this.
   *
   * @example 'http://localhost:3000'
   * @example 'https://api.example.com/v1'
   */
  readonly baseUrl: string;

  /**
   * Default headers to include in all requests.
   */
  readonly headers?: Record<string, string>;

  /**
   * Request timeout in milliseconds.
   * @default 30000
   */
  readonly timeout?: number;

  /**
   * Custom fetch implementation.
   * Defaults to global fetch.
   */
  readonly fetch?: typeof fetch;

  /**
   * Request interceptor.
   * Called before each request is sent.
   */
  readonly onRequest?: (request: Request) => Request | Promise<Request>;

  /**
   * Response interceptor.
   * Called after each response is received.
   */
  readonly onResponse?: (response: Response) => Response | Promise<Response>;

  /**
   * Error handler.
   * Called when a request fails.
   */
  readonly onError?: (error: ClientError) => void | Promise<void>;

  /**
   * Retry configuration.
   */
  readonly retry?: {
    /**
     * Number of retry attempts.
     * @default 0
     */
    readonly attempts?: number;

    /**
     * Delay between retries in milliseconds.
     * @default 1000
     */
    readonly delay?: number;

    /**
     * Status codes that should trigger a retry.
     * @default [408, 429, 500, 502, 503, 504]
     */
    readonly retryOn?: readonly number[];
  };
}

// ============================================================================
// Client Errors
// ============================================================================

/**
 * Error thrown by the client.
 */
export class ClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
    public readonly body?: unknown,
    public readonly response?: Response,
  ) {
    super(message);
    this.name = 'ClientError';
  }

  /**
   * Returns true if this is a client error (4xx).
   */
  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Returns true if this is a server error (5xx).
   */
  get isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Returns true if this is a network error.
   */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

// ============================================================================
// Request Types
// ============================================================================

/**
 * Input for a client request method.
 * Only includes properties that are actually needed based on the route.
 */
export type ClientRequestInput<TRoute extends RouteDefinition> =
  // Build the input type based on what the route needs
  (HasPathParams<TRoute['path']> extends true
    ? { pathParams: PathParams<TRoute['path']> }
    : object) &
    (TRoute['_types']['body'] extends undefined ? object : { body: TRoute['_types']['body'] }) &
    (TRoute['_types']['query'] extends undefined ? object : { query: TRoute['_types']['query'] }) &
    (TRoute['_types']['headers'] extends undefined
      ? object
      : { headers: TRoute['_types']['headers'] });

/**
 * Response from a client request.
 * Returns the successful response body type.
 */
export type ClientResponse<TRoute extends RouteDefinition> = ExtractSuccessResponse<
  TRoute['responses']
>;

/**
 * Extracts the success response type from responses config.
 *
 * Uses structural matching on the schema's _output phantom property to avoid
 * type identity issues when SchemaAdapter is imported from different paths.
 */
type ExtractSuccessResponse<T extends ResponsesConfig> = T extends {
  200: { schema: { _output: infer TBody } };
}
  ? TBody
  : T extends { 201: { schema: { _output: infer TBody } } }
    ? TBody
    : T extends { 202: { schema: { _output: infer TBody } } }
      ? TBody
      : T extends { 204: ResponseConfig }
        ? void // eslint-disable-line @typescript-eslint/no-invalid-void-type -- void is semantically correct for 204 No Content
        : unknown;

// ============================================================================
// Client Types
// ============================================================================

/**
 * A client method for a single route.
 */
export type ClientMethod<TRoute extends RouteDefinition> =
  // Check if input is required
  RequiresInput<TRoute> extends true
    ? (input: ClientRequestInput<TRoute>) => Promise<ClientResponse<TRoute>>
    : (input?: ClientRequestInput<TRoute>) => Promise<ClientResponse<TRoute>>;

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
 * Recursively builds the client type from a router config.
 *
 * Note: We use `RouteDefinition<any, any, any, any, any, any, any, any>` instead of
 * just `RouteDefinition` because TypeScript's extends check on generic interfaces
 * requires explicit type parameters for proper variance handling.
 */

export type InferClient<T extends RouterConfig> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Required for proper extends check on generic interface
  [K in keyof T]: T[K] extends RouteDefinition<any, any, any, any, any, any, any, any>
    ? ClientMethod<T[K]>
    : T[K] extends RouterConfig
      ? InferClient<T[K]>
      : never;
};
