/**
 * @fileoverview Factory function for creating type-safe API clients.
 *
 * The `createClient` function generates a fully-typed HTTP client from
 * a router definition. The client provides methods for each route with
 * complete type safety for request and response data.
 *
 * @module unified/client/create-client
 */

import type {
  RouterConfig,
  RouterDefinition,
  PrettifyDeep,
} from '@cosmneo/onion-lasagna/http/route';
import {
  isRouteDefinition,
  isRouterDefinition,
  buildPath,
  hasPathParams,
} from '@cosmneo/onion-lasagna/http/route';
import type { ClientConfig, InferClient } from './client-types';
import { ClientError } from './client-types';

/**
 * Default retry status codes.
 */
const DEFAULT_RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Creates a type-safe API client from a router definition.
 *
 * The client mirrors the structure of the router, providing methods
 * for each route with full TypeScript type inference.
 *
 * @param router - Router definition or router config
 * @param config - Client configuration
 * @returns A fully-typed API client
 *
 * @example Basic usage
 * ```typescript
 * import { createClient } from '@cosmneo/onion-lasagna-client';
 *
 * const api = defineRouter({
 *   users: {
 *     list: listUsersRoute,
 *     get: getUserRoute,
 *     create: createUserRoute,
 *   },
 * });
 *
 * const client = createClient(api, {
 *   baseUrl: 'http://localhost:3000',
 * });
 *
 * // Fully typed API calls
 * const users = await client.users.list();
 * const user = await client.users.get({ pathParams: { userId: '123' } });
 * const newUser = await client.users.create({ body: { name: 'John' } });
 * ```
 *
 * @example With interceptors
 * ```typescript
 * const client = createClient(api, {
 *   baseUrl: 'http://localhost:3000',
 *   headers: {
 *     'Content-Type': 'application/json',
 *   },
 *   onRequest: async (request) => {
 *     // Add auth token
 *     const token = await getAuthToken();
 *     request.headers.set('Authorization', `Bearer ${token}`);
 *     return request;
 *   },
 *   onResponse: async (response) => {
 *     // Log responses
 *     console.log(`${response.status} ${response.url}`);
 *     return response;
 *   },
 *   onError: async (error) => {
 *     // Handle errors globally
 *     if (error.status === 401) {
 *       await refreshToken();
 *     }
 *   },
 * });
 * ```
 *
 * @example With retry
 * ```typescript
 * const client = createClient(api, {
 *   baseUrl: 'http://localhost:3000',
 *   retry: {
 *     attempts: 3,
 *     delay: 1000,
 *     retryOn: [500, 502, 503, 504],
 *   },
 * });
 * ```
 */
export function createClient<T extends RouterConfig>(
  router: T | RouterDefinition<T>,
  config: ClientConfig,
): PrettifyDeep<InferClient<T>> {
  const routes = isRouterDefinition(router) ? router.routes : router;
  return buildClientProxy(routes, config) as PrettifyDeep<InferClient<T>>;
}

/**
 * Recursively builds a client proxy from router config.
 */
function buildClientProxy<T extends RouterConfig>(routes: T, config: ClientConfig): InferClient<T> {
  const client: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(routes)) {
    if (isRouteDefinition(value)) {
      // Create a method for this route
      client[key] = createRouteMethod(value, config);
    } else if (isRouterDefinition(value)) {
      // Recursively build nested router
      client[key] = buildClientProxy(value.routes, config);
    } else if (typeof value === 'object' && value !== null) {
      // Plain object - recurse
      client[key] = buildClientProxy(value as RouterConfig, config);
    }
  }

  return client as InferClient<T>;
}

/**
 * Creates a method for a single route.
 */
function createRouteMethod(
  route: { method: string; path: string; request?: unknown },
  config: ClientConfig,
): (input?: Record<string, unknown>) => Promise<unknown> {
  return async (input?: Record<string, unknown>) => {
    const fetchFn = config.fetch ?? fetch;

    // Build the URL (joinUrl handles trailing/leading slash normalization)
    let url = joinUrl(config.baseUrl, route.path);

    // Replace path parameters
    const pathParams = input?.['pathParams'];
    if (pathParams && hasPathParams(route.path)) {
      url = buildPath(url, pathParams as Record<string, string>);
    }

    // Add query parameters
    const queryInput = input?.['query'];
    if (queryInput) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(queryInput as Record<string, unknown>)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Build headers
    const headers = new Headers(config.headers);
    const headersInput = input?.['headers'];
    if (headersInput) {
      for (const [key, value] of Object.entries(headersInput as Record<string, string>)) {
        headers.set(key, value);
      }
    }

    // Set content type for body
    const bodyInput = input?.['body'];
    if (bodyInput && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Build request options
    const requestInit: RequestInit = {
      method: route.method,
      headers,
      body: bodyInput ? JSON.stringify(bodyInput) : undefined,
    };

    // Create the request
    let request = new Request(url, requestInit);

    // Apply request interceptor
    if (config.onRequest) {
      request = await config.onRequest(request);
    }

    // Execute with retry logic
    const retryAttempts = config.retry?.attempts ?? 0;
    const retryDelay = config.retry?.delay ?? 1000;
    const retryOn = config.retry?.retryOn ?? DEFAULT_RETRY_STATUS_CODES;

    let lastError: ClientError | undefined;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      // Setup timeout if configured
      const controller = new AbortController();
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      let didTimeout = false;

      if (config.timeout) {
        timeoutId = setTimeout(() => {
          didTimeout = true;
          controller.abort();
        }, config.timeout);
      }

      try {
        let response = await fetchFn(request.clone(), {
          signal: controller.signal,
        });

        // Apply response interceptor
        if (config.onResponse) {
          response = await config.onResponse(response);
        }

        // Handle non-OK responses
        if (!response.ok) {
          let body: unknown;
          let parseError: Error | undefined;

          // Try JSON first, fall back to text, preserve parse errors for debugging
          try {
            body = await response.json();
          } catch (jsonError) {
            parseError = jsonError instanceof Error ? jsonError : new Error('JSON parse failed');
            try {
              body = await response.text();
            } catch (textError) {
              // Both parsing methods failed - include parse errors in body for debugging
              body = {
                _parseError: 'Failed to parse response body',
                _jsonError: parseError.message,
                _textError: textError instanceof Error ? textError.message : 'Text parse failed',
              };
            }
          }

          const error = new ClientError(
            `Request failed with status ${response.status}`,
            response.status,
            response.statusText,
            body,
            response,
          );

          // Check if we should retry
          if (attempt < retryAttempts && retryOn.includes(response.status)) {
            lastError = error;
            await sleep(retryDelay);
            continue;
          }

          // Call error handler
          if (config.onError) {
            await config.onError(error);
          }

          throw error;
        }

        // Parse successful response
        // 204 No Content, 205 Reset Content, 304 Not Modified have no body
        if (response.status === 204 || response.status === 205 || response.status === 304) {
          return undefined;
        }

        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('application/json')) {
          return await response.json();
        }

        return await response.text();
      } catch (error) {
        if (error instanceof ClientError) {
          throw error;
        }

        // Determine error type: timeout, abort, or network error
        const isAbortError =
          error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');

        let errorMessage: string;
        let errorStatus: string;

        if (didTimeout) {
          errorMessage = `Request timeout after ${config.timeout}ms`;
          errorStatus = 'Timeout';
        } else if (isAbortError) {
          errorMessage = 'Request was aborted';
          errorStatus = 'Aborted';
        } else {
          errorMessage = error instanceof Error ? error.message : 'Network error';
          errorStatus = 'Network Error';
        }

        const clientError = new ClientError(errorMessage, 0, errorStatus, undefined, undefined);

        // Don't retry timeouts or user-initiated aborts
        if (attempt < retryAttempts && !isAbortError) {
          lastError = clientError;
          await sleep(retryDelay);
          continue;
        }

        if (config.onError) {
          await config.onError(clientError);
        }

        throw clientError;
      } finally {
        // Always clear timeout to prevent memory leaks
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    }

    // Should not reach here, but just in case
    throw lastError ?? new ClientError('Request failed', 0, 'Unknown Error');
  };
}

/**
 * Sleep helper for retry delays.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Joins base URL and path, ensuring exactly one slash between them.
 *
 * Handles cases where:
 * - baseUrl ends with `/` and path starts with `/` → no double slash
 * - baseUrl doesn't end with `/` and path doesn't start with `/` → adds slash
 * - Either one has the slash → uses it
 */
function joinUrl(baseUrl: string, path: string): string {
  const hasTrailingSlash = baseUrl.endsWith('/');
  const hasLeadingSlash = path.startsWith('/');

  if (hasTrailingSlash && hasLeadingSlash) {
    // Remove duplicate slash: "http://localhost/" + "/api" → "http://localhost/api"
    return baseUrl.slice(0, -1) + path;
  }
  if (!hasTrailingSlash && !hasLeadingSlash) {
    // Add missing slash: "http://localhost" + "api" → "http://localhost/api"
    return baseUrl + '/' + path;
  }
  // One has the slash already
  return baseUrl + path;
}
