/**
 * @fileoverview Factory for creating in-memory mock clients from router definitions.
 *
 * `createMockClient` builds a client with the same shape as `createClient`,
 * backed by user-provided handler functions instead of HTTP calls.
 * Ideal for unit tests, integration tests, and CLI tool testing.
 *
 * @module unified/client/create-mock-client
 */

import type { RouterConfig, RouterDefinition, PrettifyDeep } from '@cosmneo/onion-lasagna/http/route';
import { isRouteDefinition, isRouterDefinition } from '@cosmneo/onion-lasagna/http/route';
import type { MockHandlers, MockCall, MockClientResult, InferMockClient, MockSequenceOptions } from './types';

/**
 * Creates an in-memory mock client from a router definition and handler map.
 *
 * The returned client mirrors the shape of `createClient` output — pass it
 * to any code that accepts the real client. Handlers are optional; calling
 * an unregistered route throws immediately with a descriptive error.
 *
 * @param router - Router definition or router config
 * @param handlers - Partial map of mock handlers matching the router structure
 * @returns `{ client, calls, callsFor, reset }`
 *
 * @example
 * ```typescript
 * import { createMockClient } from '@cosmneo/onion-lasagna-client';
 *
 * const { client, calls, callsFor, reset } = createMockClient(api, {
 *   users: {
 *     list: () => ({ items: [], total: 0 }),
 *     get: (input) => ({ id: input.pathParams.userId, name: 'Alice' }),
 *   },
 * });
 *
 * const users = await client.users.list();
 * expect(calls).toHaveLength(1);
 * expect(callsFor('users.list')).toHaveLength(1);
 * reset();
 * ```
 */
export function createMockClient<T extends RouterConfig>(
  router: T | RouterDefinition<T>,
  handlers: MockHandlers<T>,
): MockClientResult<T> {
  const routes = isRouterDefinition(router) ? router.routes : router;
  const calls: MockCall[] = [];

  const client = buildMockProxy(
    routes,
    handlers as Record<string, unknown>,
    calls,
    [],
  ) as PrettifyDeep<InferMockClient<T>>;

  return {
    client,
    calls,
    callsFor: (route: string) => calls.filter((c) => c.route === route),
    reset: () => {
      calls.length = 0;
    },
  };
}

/**
 * Recursively builds a mock client proxy from router config and handlers.
 */
function buildMockProxy(
  routes: RouterConfig,
  handlers: Record<string, unknown>,
  calls: MockCall[],
  keyPath: readonly string[],
): Record<string, unknown> {
  const proxy: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(routes)) {
    const currentKeyPath = [...keyPath, key];
    const handler = handlers[key];

    if (isRouteDefinition(value)) {
      proxy[key] = createMockMethod(currentKeyPath.join('.'), handler, calls);
    } else if (isRouterDefinition(value)) {
      proxy[key] = buildMockProxy(
        value.routes,
        (handler ?? {}) as Record<string, unknown>,
        calls,
        currentKeyPath,
      );
    } else if (typeof value === 'object' && value !== null) {
      proxy[key] = buildMockProxy(
        value as RouterConfig,
        (handler ?? {}) as Record<string, unknown>,
        calls,
        currentKeyPath,
      );
    }
  }

  return proxy;
}

/**
 * Creates a mock method for a single route.
 * Throws if no handler is registered; records successful calls.
 */
function createMockMethod(
  routeKey: string,
  handler: unknown,
  calls: MockCall[],
): (input?: unknown) => Promise<unknown> {
  return async (input?: unknown) => {
    if (typeof handler !== 'function') {
      throw new Error(`MockClient: no handler for route "${routeKey}"`);
    }

    const response = await handler(input);

    calls.push({
      route: routeKey,
      input,
      response,
      timestamp: Date.now(),
    });

    return response;
  };
}

/**
 * Creates a sequenced mock handler that returns different responses on each call.
 *
 * @param responses - Array of handler functions called in order
 * @param options - Behavior when responses are exhausted (default: `'throw'`)
 * @returns A handler function suitable for use in `createMockClient` handlers
 *
 * @example
 * ```typescript
 * import { createMockClient, mockSequence } from '@cosmneo/onion-lasagna-client';
 *
 * const { client } = createMockClient(api, {
 *   users: {
 *     list: mockSequence([
 *       () => ({ items: [], total: 0 }),
 *       () => ({ items: [{ id: '1' }], total: 1 }),
 *     ]),
 *   },
 * });
 *
 * await client.users.list(); // { items: [], total: 0 }
 * await client.users.list(); // { items: [{ id: '1' }], total: 1 }
 * await client.users.list(); // throws — exhausted
 * ```
 */
export function mockSequence<T>(
  responses: ReadonlyArray<(...args: unknown[]) => T | Promise<T>>,
  options?: MockSequenceOptions,
): (...args: unknown[]) => T | Promise<T> {
  const exhausted = options?.exhausted ?? 'throw';
  let index = 0;

  return (...args: unknown[]) => {
    if (index < responses.length) {
      const fn = responses[index]!;
      index++;
      return fn(...args);
    }

    switch (exhausted) {
      case 'cycle':
        index = 1;
        return responses[0]!(...args);
      case 'last':
        return responses[responses.length - 1]!(...args);
      case 'throw':
      default:
        throw new Error(
          `mockSequence: all ${responses.length} responses exhausted after ${responses.length} calls`,
        );
    }
  };
}
