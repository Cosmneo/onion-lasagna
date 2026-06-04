/**
 * @fileoverview Tests for createSvelteQueryHooks factory.
 * Mocks @tanstack/svelte-query to test hook wiring without Svelte.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { get, writable, readable } from 'svelte/store';
import { defineRoute, defineRouter } from '@cosmneo/onion-lasagna/http/route';
import { zodSchema } from '@cosmneo/onion-lasagna-zod';
import type { Readable } from 'svelte/store';

// ============================================================================
// Mock @tanstack/svelte-query
// ============================================================================

const mockCreateQuery = vi.fn();
const mockCreateMutation = vi.fn();

vi.mock('@tanstack/svelte-query', () => ({
  createQuery: (...args: unknown[]) => mockCreateQuery(...args),
  createMutation: (...args: unknown[]) => mockCreateMutation(...args),
}));

// Must import after vi.mock
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let createSvelteQueryHooks: typeof import('../create-svelte-query-hooks').createSvelteQueryHooks;

beforeEach(async () => {
  vi.resetAllMocks();
  mockCreateQuery.mockReturnValue({ data: undefined, isLoading: true });
  mockCreateMutation.mockReturnValue({ mutate: vi.fn(), isLoading: false });

  const mod = await import('../create-svelte-query-hooks');
  createSvelteQueryHooks = mod.createSvelteQueryHooks;
});

// ============================================================================
// Helper: get current value from a store
// ============================================================================

function getStoreValue<T>(store: Readable<T>): T {
  return get(store);
}

// ============================================================================
// Test Routes
// ============================================================================

const listUsersRoute = defineRoute({
  method: 'GET',
  path: '/users',
  request: {
    query: {
      schema: zodSchema(z.object({ page: z.number().optional() })),
    },
  },
  responses: { 200: { description: 'Success' } },
});

const getUserRoute = defineRoute({
  method: 'GET',
  path: '/users/:userId',
  responses: { 200: { description: 'Success' } },
});

const createUserRoute = defineRoute({
  method: 'POST',
  path: '/users',
  request: {
    body: { schema: zodSchema(z.object({ name: z.string() })) },
  },
  responses: { 201: { description: 'Created' } },
});

const deleteUserRoute = defineRoute({
  method: 'DELETE',
  path: '/users/:userId',
  responses: { 204: { description: 'No Content' } },
});

const headUsersRoute = defineRoute({
  method: 'HEAD',
  path: '/users',
  responses: { 200: { description: 'Success' } },
});

// ============================================================================
// Tests
// ============================================================================

describe('createSvelteQueryHooks', () => {
  const config = { baseUrl: 'http://localhost:3000' };

  describe('hook structure', () => {
    it('returns hooks and queryKeys', () => {
      const result = createSvelteQueryHooks({ list: listUsersRoute }, config);

      expect(result).toHaveProperty('hooks');
      expect(result).toHaveProperty('queryKeys');
    });

    it('creates createQuery for GET routes', () => {
      const { hooks } = createSvelteQueryHooks({ list: listUsersRoute, get: getUserRoute }, config);

      expect(hooks).toHaveProperty('list');
      expect(hooks['list']).toHaveProperty('createQuery');
      expect(typeof (hooks['list'] as Record<string, unknown>)['createQuery']).toBe('function');
    });

    it('creates createQuery for HEAD routes', () => {
      const { hooks } = createSvelteQueryHooks({ head: headUsersRoute }, config);

      expect(hooks['head']).toHaveProperty('createQuery');
    });

    it('creates createMutation for POST routes', () => {
      const { hooks } = createSvelteQueryHooks({ create: createUserRoute }, config);

      expect(hooks['create']).toHaveProperty('createMutation');
      expect(typeof (hooks['create'] as Record<string, unknown>)['createMutation']).toBe(
        'function',
      );
    });

    it('creates createMutation for DELETE routes', () => {
      const { hooks } = createSvelteQueryHooks({ remove: deleteUserRoute }, config);

      expect(hooks['remove']).toHaveProperty('createMutation');
    });

    it('preserves nested structure', () => {
      const { hooks } = createSvelteQueryHooks(
        {
          users: {
            list: listUsersRoute,
            get: getUserRoute,
            create: createUserRoute,
            remove: deleteUserRoute,
          },
        },
        config,
      );

      const users = hooks['users'] as Record<string, Record<string, unknown>>;
      expect(users['list']).toHaveProperty('createQuery');
      expect(users['get']).toHaveProperty('createQuery');
      expect(users['create']).toHaveProperty('createMutation');
      expect(users['remove']).toHaveProperty('createMutation');
    });

    it('handles deeply nested routers', () => {
      const { hooks } = createSvelteQueryHooks(
        {
          api: {
            v1: {
              users: {
                list: listUsersRoute,
              },
            },
          },
        },
        config,
      );

      const api = hooks['api'] as Record<string, unknown>;
      const v1 = api['v1'] as Record<string, unknown>;
      const users = v1['users'] as Record<string, Record<string, unknown>>;
      expect(users['list']).toHaveProperty('createQuery');
    });
  });

  describe('createQuery behavior', () => {
    it('passes a reactive store (isSvelteStore) to createQuery', () => {
      const { hooks } = createSvelteQueryHooks({ list: listUsersRoute }, config);

      const hook = hooks['list'] as { createQuery: (...args: unknown[]) => unknown };
      hook.createQuery();

      expect(mockCreateQuery).toHaveBeenCalledTimes(1);
      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;
      // The argument must be a Svelte store (has a subscribe method)
      expect(typeof storeArg.subscribe).toBe('function');
    });

    it('calls createQuery with correct queryKey for route without input', () => {
      const { hooks } = createSvelteQueryHooks({ list: listUsersRoute }, config);

      const hook = hooks['list'] as { createQuery: (...args: unknown[]) => unknown };
      hook.createQuery();

      expect(mockCreateQuery).toHaveBeenCalledTimes(1);
      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;
      const options = getStoreValue(storeArg);
      expect(options['queryKey']).toEqual(['list']);
      expect(typeof options['queryFn']).toBe('function');
    });

    it('appends input to queryKey', () => {
      const { hooks } = createSvelteQueryHooks({ get: getUserRoute }, config);

      const hook = hooks['get'] as { createQuery: (...args: unknown[]) => unknown };
      const input = { pathParams: { userId: '123' } };
      hook.createQuery(input);

      expect(mockCreateQuery).toHaveBeenCalledTimes(1);
      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;
      const options = getStoreValue(storeArg);
      expect(options['queryKey']).toEqual(['get', { pathParams: { userId: '123' } }]);
    });

    it('passes additional options through', () => {
      const { hooks } = createSvelteQueryHooks({ list: listUsersRoute }, config);

      const hook = hooks['list'] as { createQuery: (...args: unknown[]) => unknown };
      hook.createQuery(undefined, { staleTime: 5000, enabled: false });

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;
      const options = getStoreValue(storeArg);
      expect(options['staleTime']).toBe(5000);
      expect(options['enabled']).toBe(false);
    });

    it('builds correct queryKey for nested routes', () => {
      const { hooks } = createSvelteQueryHooks(
        {
          users: {
            list: listUsersRoute,
            get: getUserRoute,
          },
        },
        config,
      );

      const users = hooks['users'] as Record<
        string,
        { createQuery: (...args: unknown[]) => unknown }
      >;
      users['list']!.createQuery();
      users['get']!.createQuery({ pathParams: { userId: '456' } });

      const listStoreArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;
      expect(getStoreValue(listStoreArg)['queryKey']).toEqual(['users', 'list']);

      const getStoreArg = mockCreateQuery.mock.calls[1]![0] as Readable<Record<string, unknown>>;
      expect(getStoreValue(getStoreArg)['queryKey']).toEqual([
        'users',
        'get',
        { pathParams: { userId: '456' } },
      ]);
    });

    it('queryKey updates reactively when reactive input store changes', () => {
      const { hooks } = createSvelteQueryHooks({ get: getUserRoute }, config);
      const hook = hooks['get'] as { createQuery: (...args: unknown[]) => unknown };

      const inputStore = writable({ pathParams: { userId: '1' } });
      hook.createQuery(inputStore);

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;

      // Initial state: queryKey includes userId '1'
      expect(getStoreValue(storeArg)['queryKey']).toEqual([
        'get',
        { pathParams: { userId: '1' } },
      ]);

      // Update the input store
      inputStore.set({ pathParams: { userId: '2' } });

      // The options store must re-evaluate with the new key
      expect(getStoreValue(storeArg)['queryKey']).toEqual([
        'get',
        { pathParams: { userId: '2' } },
      ]);
    });

    it('queryFn uses current input when input store changes', () => {
      const { hooks } = createSvelteQueryHooks({ get: getUserRoute }, config);
      const hook = hooks['get'] as { createQuery: (...args: unknown[]) => unknown };

      const inputStore = writable({ pathParams: { userId: '1' } });
      hook.createQuery(inputStore);

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;

      // Update input
      inputStore.set({ pathParams: { userId: '99' } });

      const options = getStoreValue(storeArg);
      // queryFn should use the latest input
      expect(options['queryKey']).toEqual(['get', { pathParams: { userId: '99' } }]);
    });
  });

  describe('createMutation behavior', () => {
    it('calls createMutation with mutationFn', () => {
      const { hooks } = createSvelteQueryHooks({ create: createUserRoute }, config);

      const hook = hooks['create'] as { createMutation: (...args: unknown[]) => unknown };
      hook.createMutation();

      expect(mockCreateMutation).toHaveBeenCalledTimes(1);
      const callArgs = mockCreateMutation.mock.calls[0]![0] as Record<string, unknown>;
      expect(typeof callArgs['mutationFn']).toBe('function');
    });

    it('passes additional mutation options through', () => {
      const onSuccess = vi.fn();

      const { hooks } = createSvelteQueryHooks({ create: createUserRoute }, config);

      const hook = hooks['create'] as { createMutation: (...args: unknown[]) => unknown };
      hook.createMutation({ onSuccess });

      const callArgs = mockCreateMutation.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs['onSuccess']).toBe(onSuccess);
    });
  });

  describe('RouterDefinition handling', () => {
    it('handles defineRouter output', () => {
      const router = defineRouter({
        users: {
          list: listUsersRoute,
          create: createUserRoute,
        },
      });

      const { hooks, queryKeys } = createSvelteQueryHooks(router, config);

      const users = hooks['users'] as Record<string, Record<string, unknown>>;
      expect(users['list']).toHaveProperty('createQuery');
      expect(users['create']).toHaveProperty('createMutation');

      const usersKeys = queryKeys['users'] as (() => readonly string[]) & Record<string, unknown>;
      expect(usersKeys()).toEqual(['users']);
    });
  });

  describe('queryKeys integration', () => {
    it('returns query keys matching hook key paths', () => {
      const { queryKeys } = createSvelteQueryHooks(
        {
          users: {
            list: listUsersRoute,
            get: getUserRoute,
          },
        },
        config,
      );

      const usersKeys = queryKeys['users'] as (() => readonly string[]) & Record<string, unknown>;
      expect(usersKeys()).toEqual(['users']);

      const listKeyFn = usersKeys['list'] as () => readonly unknown[];
      expect(listKeyFn()).toEqual(['users', 'list']);

      const getKeyFn = usersKeys['get'] as (input?: unknown) => readonly unknown[];
      expect(getKeyFn({ pathParams: { userId: '123' } })).toEqual([
        'users',
        'get',
        { pathParams: { userId: '123' } },
      ]);
    });
  });

  describe('useEnabled', () => {
    it('disables query when useEnabled returns false', () => {
      const { hooks } = createSvelteQueryHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => false },
      );

      const hook = hooks['list'] as { createQuery: (...args: unknown[]) => unknown };
      hook.createQuery();

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;
      expect(getStoreValue(storeArg)['enabled']).toBe(false);
    });

    it('enables query when useEnabled returns true', () => {
      const { hooks } = createSvelteQueryHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => true },
      );

      const hook = hooks['list'] as { createQuery: (...args: unknown[]) => unknown };
      hook.createQuery();

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;
      expect(getStoreValue(storeArg)['enabled']).toBe(true);
    });

    it('composes with per-query enabled (both must be true)', () => {
      const { hooks } = createSvelteQueryHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => true },
      );

      const hook = hooks['list'] as { createQuery: (...args: unknown[]) => unknown };
      hook.createQuery(undefined, { enabled: false });

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;
      expect(getStoreValue(storeArg)['enabled']).toBe(false);
    });

    it('composes with per-query enabled (useEnabled false overrides)', () => {
      const { hooks } = createSvelteQueryHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => false },
      );

      const hook = hooks['list'] as { createQuery: (...args: unknown[]) => unknown };
      hook.createQuery(undefined, { enabled: true });

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;
      expect(getStoreValue(storeArg)['enabled']).toBe(false);
    });

    it('defaults to enabled when useEnabled is not provided', () => {
      const { hooks } = createSvelteQueryHooks({ list: listUsersRoute }, config);

      const hook = hooks['list'] as { createQuery: (...args: unknown[]) => unknown };
      hook.createQuery();

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;
      expect(getStoreValue(storeArg)['enabled']).toBe(true);
    });

    it('does not affect mutations', () => {
      const { hooks } = createSvelteQueryHooks(
        { create: createUserRoute },
        { ...config, useEnabled: () => false },
      );

      const hook = hooks['create'] as { createMutation: (...args: unknown[]) => unknown };
      hook.createMutation();

      expect(mockCreateMutation).toHaveBeenCalledTimes(1);
      const callArgs = mockCreateMutation.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs).not.toHaveProperty('enabled');
    });

    it('preserves other options when composing enabled', () => {
      const { hooks } = createSvelteQueryHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => true },
      );

      const hook = hooks['list'] as { createQuery: (...args: unknown[]) => unknown };
      hook.createQuery(undefined, { staleTime: 5000, enabled: true });

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;
      const options = getStoreValue(storeArg);
      expect(options['staleTime']).toBe(5000);
      expect(options['enabled']).toBe(true);
    });

    // -------------------------------------------------------------------------
    // P05-1: Reactivity — useEnabled gate must re-enable when store flips
    // -------------------------------------------------------------------------

    it('P05-1: re-enables when useEnabled store flips from false to true', () => {
      const enabledStore = writable(false);
      const { hooks } = createSvelteQueryHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => enabledStore },
      );

      const hook = hooks['list'] as { createQuery: (...args: unknown[]) => unknown };
      hook.createQuery();

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;

      // Initially disabled
      expect(getStoreValue(storeArg)['enabled']).toBe(false);

      // Gate flips to true (e.g., auth session becomes valid)
      enabledStore.set(true);

      // Options store must re-evaluate
      expect(getStoreValue(storeArg)['enabled']).toBe(true);
    });

    it('P05-1: disables again when useEnabled store flips back to false', () => {
      const enabledStore = writable(true);
      const { hooks } = createSvelteQueryHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => enabledStore },
      );

      const hook = hooks['list'] as { createQuery: (...args: unknown[]) => unknown };
      hook.createQuery();

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;

      expect(getStoreValue(storeArg)['enabled']).toBe(true);

      enabledStore.set(false);

      expect(getStoreValue(storeArg)['enabled']).toBe(false);
    });

    it('P05-1: composes reactive useEnabled with reactive per-query enabled', () => {
      const globalEnabledStore = writable(false);
      const perQueryEnabled = writable(true);

      const { hooks } = createSvelteQueryHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => globalEnabledStore },
      );

      const hook = hooks['list'] as { createQuery: (...args: unknown[]) => unknown };
      hook.createQuery(undefined, { enabled: perQueryEnabled });

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;

      // Both false initially (globalEnabled is false)
      expect(getStoreValue(storeArg)['enabled']).toBe(false);

      // Enable global — both must be true
      globalEnabledStore.set(true);
      expect(getStoreValue(storeArg)['enabled']).toBe(true);

      // Disable per-query — result is false
      perQueryEnabled.set(false);
      expect(getStoreValue(storeArg)['enabled']).toBe(false);
    });

    it('P05-1: reactive useEnabled subscriber receives all changes', () => {
      const enabledStore = writable(false);
      const values: boolean[] = [];

      const { hooks } = createSvelteQueryHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => enabledStore },
      );

      const hook = hooks['list'] as { createQuery: (...args: unknown[]) => unknown };
      hook.createQuery();

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;
      const unsub = storeArg.subscribe((opts) => {
        values.push(opts['enabled'] as boolean);
      });

      enabledStore.set(true);
      enabledStore.set(false);
      enabledStore.set(true);

      unsub();

      // Should have received: false (initial), true, false, true
      expect(values).toEqual([false, true, false, true]);
    });
  });

  describe('queryKeyPrefix', () => {
    it('prefixes query keys in hooks', () => {
      const { hooks } = createSvelteQueryHooks(
        { list: listUsersRoute },
        { ...config, queryKeyPrefix: 'my-api' },
      );

      const hook = hooks['list'] as { createQuery: (...args: unknown[]) => unknown };
      hook.createQuery();

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;
      expect(getStoreValue(storeArg)['queryKey']).toEqual(['my-api', 'list']);
    });

    it('prefixes query keys with input', () => {
      const { hooks } = createSvelteQueryHooks(
        { get: getUserRoute },
        { ...config, queryKeyPrefix: 'my-api' },
      );

      const hook = hooks['get'] as { createQuery: (...args: unknown[]) => unknown };
      hook.createQuery({ pathParams: { userId: '1' } });

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;
      expect(getStoreValue(storeArg)['queryKey']).toEqual([
        'my-api',
        'get',
        { pathParams: { userId: '1' } },
      ]);
    });

    it('prefixes queryKeys object', () => {
      const { queryKeys } = createSvelteQueryHooks(
        { users: { list: listUsersRoute } },
        { ...config, queryKeyPrefix: 'my-api' },
      );

      const usersKeys = queryKeys['users'] as (() => readonly string[]) & Record<string, unknown>;
      expect(usersKeys()).toEqual(['my-api', 'users']);

      const listKeyFn = usersKeys['list'] as () => readonly unknown[];
      expect(listKeyFn()).toEqual(['my-api', 'users', 'list']);
    });

    it('prevents cache collisions between separate router instances', () => {
      const { queryKeys: keysA } = createSvelteQueryHooks(
        { list: listUsersRoute },
        { ...config, queryKeyPrefix: 'users-api' },
      );
      const { queryKeys: keysB } = createSvelteQueryHooks(
        { list: listUsersRoute },
        { ...config, queryKeyPrefix: 'products-api' },
      );

      const listA = keysA['list'] as () => readonly unknown[];
      const listB = keysB['list'] as () => readonly unknown[];

      expect(listA()).toEqual(['users-api', 'list']);
      expect(listB()).toEqual(['products-api', 'list']);
      expect(listA()).not.toEqual(listB());
    });
  });

  describe('P05-1: reactive input store', () => {
    it('options passed to createQuery are a Svelte store (have subscribe)', () => {
      const { hooks } = createSvelteQueryHooks({ get: getUserRoute }, config);
      const hook = hooks['get'] as { createQuery: (...args: unknown[]) => unknown };
      hook.createQuery({ pathParams: { userId: '1' } });

      const storeArg = mockCreateQuery.mock.calls[0]![0];
      // Must satisfy isSvelteStore: has subscribe as a function
      expect(typeof (storeArg as { subscribe: unknown })['subscribe']).toBe('function');
    });

    it('queryKey updates when writable input store changes value', () => {
      const { hooks } = createSvelteQueryHooks({ get: getUserRoute }, config);
      const hook = hooks['get'] as { createQuery: (...args: unknown[]) => unknown };

      const inputStore = writable({ pathParams: { userId: 'a' } });
      hook.createQuery(inputStore);

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;

      expect(getStoreValue(storeArg)['queryKey']).toEqual(['get', { pathParams: { userId: 'a' } }]);

      inputStore.set({ pathParams: { userId: 'b' } });

      expect(getStoreValue(storeArg)['queryKey']).toEqual(['get', { pathParams: { userId: 'b' } }]);
    });

    it('reactive input store emits all keypath changes to subscribers', () => {
      const { hooks } = createSvelteQueryHooks({ get: getUserRoute }, config);
      const hook = hooks['get'] as { createQuery: (...args: unknown[]) => unknown };

      const inputStore = writable({ pathParams: { userId: '1' } });
      hook.createQuery(inputStore);

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;
      const keys: unknown[] = [];
      const unsub = storeArg.subscribe((opts) => {
        keys.push(opts['queryKey']);
      });

      inputStore.set({ pathParams: { userId: '2' } });
      inputStore.set({ pathParams: { userId: '3' } });

      unsub();

      expect(keys).toEqual([
        ['get', { pathParams: { userId: '1' } }],
        ['get', { pathParams: { userId: '2' } }],
        ['get', { pathParams: { userId: '3' } }],
      ]);
    });

    it('plain input value still produces a store (backward compatible)', () => {
      const { hooks } = createSvelteQueryHooks({ list: listUsersRoute }, config);
      const hook = hooks['list'] as { createQuery: (...args: unknown[]) => unknown };
      hook.createQuery();

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;
      expect(typeof storeArg.subscribe).toBe('function');
      expect(getStoreValue(storeArg)['queryKey']).toEqual(['list']);
    });

    it('static boolean enabled is preserved and backward compatible', () => {
      const { hooks } = createSvelteQueryHooks({ list: listUsersRoute }, config);
      const hook = hooks['list'] as { createQuery: (...args: unknown[]) => unknown };
      hook.createQuery(undefined, { enabled: false });

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;
      expect(getStoreValue(storeArg)['enabled']).toBe(false);
    });

    it('reactive enabled store (Readable<boolean>) passed in options updates the query', () => {
      const { hooks } = createSvelteQueryHooks({ list: listUsersRoute }, config);
      const hook = hooks['list'] as { createQuery: (...args: unknown[]) => unknown };

      const enabledStore = writable(true);
      hook.createQuery(undefined, { enabled: enabledStore });

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;

      expect(getStoreValue(storeArg)['enabled']).toBe(true);

      enabledStore.set(false);

      expect(getStoreValue(storeArg)['enabled']).toBe(false);
    });
  });

  // ============================================================================
  // P05-4: queryFn and mutationFn invoke the client with the correct input
  // ============================================================================

  describe('P05-4: queryFn and mutationFn invoke client with correct input', () => {
    it('queryFn calls fetch with the correct URL for a path-param route', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );
      const { hooks } = createSvelteQueryHooks(
        { get: getUserRoute },
        { ...config, fetch: mockFetch },
      );

      const hook = hooks['get'] as { createQuery: (...args: unknown[]) => unknown };
      const input = { pathParams: { userId: 'abc' } };
      hook.createQuery(input);

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;
      const { queryFn } = getStoreValue(storeArg) as { queryFn: (ctx: { signal?: AbortSignal }) => Promise<unknown> };

      await queryFn({ signal: undefined });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchedRequest = mockFetch.mock.calls[0]![0] as Request;
      expect(fetchedRequest.url).toContain('/users/abc');
    });

    it('queryFn forwards signal to the underlying client method', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );
      const { hooks } = createSvelteQueryHooks(
        { list: listUsersRoute },
        { ...config, fetch: mockFetch },
      );

      const hook = hooks['list'] as { createQuery: (...args: unknown[]) => unknown };
      hook.createQuery();

      const storeArg = mockCreateQuery.mock.calls[0]![0] as Readable<Record<string, unknown>>;
      const { queryFn } = getStoreValue(storeArg) as { queryFn: (ctx: { signal?: AbortSignal }) => Promise<unknown> };

      const controller = new AbortController();
      await queryFn({ signal: controller.signal });

      // Signal was passed — the fetch call should have received it
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, fetchInit] = mockFetch.mock.calls[0]! as [Request, RequestInit];
      expect(fetchInit).toBeDefined();
    });

    it('mutationFn calls fetch with the correct body when invoked', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: '1' }), { status: 201, headers: { 'Content-Type': 'application/json' } }),
      );
      const { hooks } = createSvelteQueryHooks(
        { create: createUserRoute },
        { ...config, fetch: mockFetch },
      );

      const hook = hooks['create'] as { createMutation: (...args: unknown[]) => unknown };
      hook.createMutation();

      const callArgs = mockCreateMutation.mock.calls[0]![0] as {
        mutationFn: (input: unknown) => Promise<unknown>;
      };
      const { mutationFn } = callArgs;

      await mutationFn({ body: { name: 'Alice' } });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchedRequest = mockFetch.mock.calls[0]![0] as Request;
      expect(fetchedRequest.url).toContain('/users');
      expect(fetchedRequest.method).toBe('POST');
    });

    it('mutationFn calls fetch with correct path for a path-param mutation route', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(null, { status: 204 }),
      );
      const { hooks } = createSvelteQueryHooks(
        { remove: deleteUserRoute },
        { ...config, fetch: mockFetch },
      );

      const hook = hooks['remove'] as { createMutation: (...args: unknown[]) => unknown };
      hook.createMutation();

      const callArgs = mockCreateMutation.mock.calls[0]![0] as {
        mutationFn: (input: unknown) => Promise<unknown>;
      };

      await callArgs.mutationFn({ pathParams: { userId: 'xyz' } });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchedRequest = mockFetch.mock.calls[0]![0] as Request;
      expect(fetchedRequest.url).toContain('/users/xyz');
      expect(fetchedRequest.method).toBe('DELETE');
    });
  });
});
