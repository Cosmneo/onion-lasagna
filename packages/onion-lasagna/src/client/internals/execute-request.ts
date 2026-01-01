import type { ClientConfig, HttpMethod, RequestContext, ResponseContext } from '../types';
import { ClientError } from '../types';
import { withRetry } from './retry';
import { generateCacheKey, getFromCache, setInCache } from './cache';

/**
 * Default client configuration values.
 */
export const DEFAULT_CONFIG: Partial<ClientConfig> = {
  timeout: 30000,
  credentials: 'same-origin',
};

/**
 * Execute an HTTP request with the given configuration.
 *
 * @param url - The complete URL to request
 * @param method - The HTTP method
 * @param body - The request body (for POST/PUT/PATCH)
 * @param config - Client configuration
 * @returns The response body
 */
export async function executeRequest<T>(
  url: string,
  method: HttpMethod,
  body: unknown,
  config: ClientConfig,
): Promise<T> {
  const fetchFn = config.fetch ?? fetch;
  const timeout = config.timeout ?? (DEFAULT_CONFIG.timeout as number);

  // Check cache for GET requests
  if (method === 'GET' && config.cache) {
    const cacheKey = generateCacheKey(url, method);
    const cached = getFromCache<T>(cacheKey, config.cache);
    if (cached !== undefined) {
      return cached;
    }
  }

  // Build the request
  const requestInit: RequestInit & { url: string } = {
    url,
    method,
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
    credentials: config.credentials ?? DEFAULT_CONFIG.credentials,
  };

  // Add body for methods that support it
  if (body !== undefined && method !== 'GET' && method !== 'DELETE') {
    requestInit.body = JSON.stringify(body);
  }

  // Apply onRequest hook
  const finalRequest = config.onRequest ? config.onRequest(requestInit) : requestInit;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const executeOnce = async (): Promise<T> => {
    try {
      const response = await fetchFn(finalRequest.url, {
        ...finalRequest,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response body
      let responseBody: unknown;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }

      // Handle error responses
      if (!response.ok) {
        throw ClientError.fromResponse(response.status, responseBody);
      }

      // Apply onResponse hook
      const responseContext: ResponseContext = {
        url: finalRequest.url,
        method,
        status: response.status,
        headers: response.headers,
      };

      const result = config.onResponse
        ? config.onResponse(responseBody as T, responseContext)
        : (responseBody as T);

      // Cache successful GET responses
      if (method === 'GET' && config.cache) {
        const cacheKey = generateCacheKey(url, method);
        setInCache(cacheKey, result, config.cache);
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw ClientError.timeoutError(finalRequest.url, timeout);
      }

      // Re-throw ClientError as-is
      if (error instanceof ClientError) {
        throw error;
      }

      // Wrap other errors
      throw ClientError.networkError(
        error instanceof Error ? error.message : 'Network error',
        error instanceof Error ? error : undefined,
      );
    }
  };

  // Execute with retry if configured
  if (config.retry) {
    const requestContext: RequestContext = {
      url: finalRequest.url,
      method,
      attempt: 0,
    };

    try {
      return await withRetry(executeOnce, config.retry);
    } catch (error) {
      // Call onError hook
      if (config.onError && error instanceof ClientError) {
        config.onError(error, requestContext);
      }
      throw error;
    }
  }

  try {
    return await executeOnce();
  } catch (error) {
    // Call onError hook
    if (config.onError && error instanceof ClientError) {
      const requestContext: RequestContext = {
        url: finalRequest.url,
        method,
        attempt: 1,
      };
      config.onError(error, requestContext);
    }
    throw error;
  }
}
