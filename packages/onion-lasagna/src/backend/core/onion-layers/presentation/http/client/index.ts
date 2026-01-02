/**
 * @fileoverview Client module exports.
 *
 * This module provides the type-safe HTTP client for the unified route system.
 *
 * @module unified/client
 *
 * @example Create a client
 * ```typescript
 * import { createClient } from '@cosmneo/onion-lasagna/http/client';
 * import { api } from './routes';
 *
 * const client = createClient(api, {
 *   baseUrl: 'http://localhost:3000',
 * });
 *
 * // Use the typed client
 * const users = await client.users.list({ query: { page: 1 } });
 * const user = await client.users.get({ pathParams: { id: '123' } });
 * ```
 */

export { createClient } from './create-client';
export type {
  ClientConfig,
  ClientRequestInput,
  ClientResponse,
  ClientMethod,
  InferClient,
} from './types';
export { ClientError } from './types';
