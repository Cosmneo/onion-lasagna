/**
 * @fileoverview Axios adapter for the onion-lasagna client.
 *
 * Creates a `fetch`-compatible function backed by Axios, allowing the
 * onion-lasagna client (and all query-hook packages) to use Axios as
 * the HTTP transport layer.
 *
 * @module axios-adapter
 *
 * @example
 * ```typescript
 * import { createAxiosAdapter } from '@cosmneo/onion-lasagna-axios';
 * import { createClient } from '@cosmneo/onion-lasagna-client';
 *
 * const client = createClient(api, {
 *   baseUrl: '/api',
 *   fetch: createAxiosAdapter(),
 * });
 * ```
 */

import type { AxiosInstance } from 'axios';

/**
 * Creates a `fetch`-compatible function that delegates to Axios.
 *
 * @param instance - Optional Axios instance. When omitted, the default
 *   `axios` export is lazily imported on first call.
 * @returns A function matching the `typeof fetch` signature.
 */
export function createAxiosAdapter(instance?: AxiosInstance): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const axiosInstance = instance ?? (await import('axios')).default;

    const request = input instanceof Request ? input : new Request(String(input), init);

    const url = request.url;
    const method = request.method;

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const body = request.body ? await request.text() : undefined;

    const axiosResponse = await axiosInstance.request({
      url,
      method,
      headers,
      data: body,
      signal: init?.signal as AbortSignal | undefined,
      validateStatus: () => true,
      responseType: 'text',
      transformResponse: [(data: unknown) => data],
    });

    const responseHeaders = new Headers();
    const rawHeaders = axiosResponse.headers;
    if (rawHeaders && typeof rawHeaders === 'object') {
      for (const [key, value] of Object.entries(rawHeaders)) {
        if (value != null) {
          responseHeaders.set(key, String(value));
        }
      }
    }

    // 204, 205, 304 are null-body statuses — the Response constructor
    // throws if you pass a non-null body with these status codes.
    const isNullBody =
      axiosResponse.status === 204 || axiosResponse.status === 205 || axiosResponse.status === 304;

    return new Response(isNullBody ? null : (axiosResponse.data as BodyInit | null), {
      status: axiosResponse.status,
      statusText: axiosResponse.statusText,
      headers: responseHeaders,
    });
  };
}
