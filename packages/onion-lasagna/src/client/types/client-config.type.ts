import type { ClientError } from './client-error.type';

/**
 * Retry configuration for failed requests.
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts.
   * @default 3
   */
  attempts: number;

  /**
   * Initial delay in milliseconds between retries.
   * @default 1000
   */
  delay: number;

  /**
   * Backoff strategy for retry delays.
   * - 'linear': delay stays constant
   * - 'exponential': delay doubles each attempt
   * @default 'exponential'
   */
  backoff?: 'linear' | 'exponential';

  /**
   * Custom function to determine if a request should be retried.
   * By default, retries on network errors and 5xx status codes.
   */
  retryOn?: (error: ClientError, attempt: number) => boolean;
}

/**
 * Cache configuration for GET requests.
 */
export interface CacheConfig {
  /**
   * Time-to-live in milliseconds.
   * @default 60000 (1 minute)
   */
  ttl: number;

  /**
   * Storage mechanism for the cache.
   * - 'memory': In-memory cache (cleared on page refresh)
   * - 'localStorage': Persistent browser storage
   * @default 'memory'
   */
  storage?: 'memory' | 'localStorage';
}

/**
 * Full client configuration.
 */
export interface ClientConfig {
  /**
   * Base URL for all requests (e.g., 'http://localhost:3000').
   */
  baseUrl: string;

  /**
   * Default headers to include in all requests.
   */
  headers?: Record<string, string>;

  /**
   * Request timeout in milliseconds.
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Custom fetch implementation (useful for testing or polyfills).
   * @default globalThis.fetch
   */
  fetch?: typeof fetch;

  /**
   * Credentials mode for requests.
   * @default 'same-origin'
   */
  credentials?: RequestCredentials;

  /**
   * Hook to modify requests before they are sent.
   * Useful for adding authentication headers dynamically.
   */
  onRequest?: (request: RequestInit & { url: string }) => RequestInit & { url: string };

  /**
   * Hook to transform responses before they are returned.
   * Useful for unwrapping response envelopes.
   */
  onResponse?: <T>(response: T, context: ResponseContext) => T;

  /**
   * Hook called when an error occurs.
   * Useful for logging or error reporting.
   */
  onError?: (error: ClientError, context: RequestContext) => void;

  /**
   * Retry configuration for failed requests.
   */
  retry?: RetryConfig;

  /**
   * Cache configuration for GET requests.
   */
  cache?: CacheConfig;
}

/**
 * Context provided to the onResponse hook.
 */
export interface ResponseContext {
  url: string;
  method: string;
  status: number;
  headers: Headers;
}

/**
 * Context provided to the onError hook.
 */
export interface RequestContext {
  url: string;
  method: string;
  attempt: number;
}
