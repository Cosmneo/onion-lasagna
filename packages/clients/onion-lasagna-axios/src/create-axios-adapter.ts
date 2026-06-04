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
    const axiosModule = instance ?? (await import('axios')).default;

    const request = input instanceof Request ? input : new Request(String(input), init);

    const url = request.url;
    const method = request.method;

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const body = request.body ? await request.text() : undefined;

    // P02-3: prefer init.signal; fall back to request.signal (handles Request-embedded signals)
    const signal = (init?.signal ?? request.signal) as AbortSignal | undefined;

    let axiosResponse;
    try {
      axiosResponse = await axiosModule.request({
        url,
        method,
        headers,
        data: body,
        signal,
        validateStatus: () => true,
        // P02-4: use arraybuffer so binary responses are not lossily decoded as text;
        // JSON/text reads still work because ArrayBuffer is accepted by Response constructor
        responseType: 'arraybuffer',
        transformResponse: [(data: unknown) => data],
      });
    } catch (err) {
      // P02-1: Normalize axios cancellation errors to match the fetch contract so the
      // consuming client can detect aborts/timeouts via error.name checks.
      const { default: axiosLib } = await import('axios');

      if (axiosLib.isCancel(err)) {
        // User abort (CanceledError / name='CanceledError')
        throw new DOMException('The operation was aborted.', 'AbortError');
      }

      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code?: string }).code === 'ECONNABORTED'
      ) {
        // Axios connection-aborted timeout
        throw new DOMException('The operation timed out.', 'TimeoutError');
      }

      throw err;
    }

    // P02-2: multi-value response headers must be appended individually; using
    // set() or String(value) on an array would comma-join all values, corrupting
    // headers like set-cookie that must remain as separate entries.
    const responseHeaders = new Headers();
    const rawHeaders = axiosResponse.headers;
    if (rawHeaders && typeof rawHeaders === 'object') {
      for (const [key, value] of Object.entries(rawHeaders)) {
        if (value != null) {
          if (Array.isArray(value)) {
            for (const item of value) {
              responseHeaders.append(key, String(item));
            }
          } else {
            responseHeaders.set(key, String(value));
          }
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
