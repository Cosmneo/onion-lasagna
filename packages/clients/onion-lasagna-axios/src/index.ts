/**
 * @fileoverview Axios adapter for the onion-lasagna client.
 *
 * Provides a `fetch`-compatible function backed by Axios, so the
 * onion-lasagna client and query-hook packages can use Axios as
 * their HTTP transport.
 *
 * @module @cosmneo/onion-lasagna-axios
 *
 * @example
 * ```typescript
 * import { createAxiosAdapter } from '@cosmneo/onion-lasagna-axios';
 * import { createClient } from '@cosmneo/onion-lasagna-client';
 *
 * // Default axios
 * const client = createClient(api, {
 *   baseUrl: '/api',
 *   fetch: createAxiosAdapter(),
 * });
 *
 * // Custom instance with interceptors
 * import axios from 'axios';
 * const instance = axios.create({ timeout: 5000 });
 * const client2 = createClient(api, {
 *   baseUrl: '/api',
 *   fetch: createAxiosAdapter(instance),
 * });
 * ```
 */

export { createAxiosAdapter } from './create-axios-adapter';
