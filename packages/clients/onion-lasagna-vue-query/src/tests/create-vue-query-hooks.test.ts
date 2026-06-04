/**
 * @fileoverview Tests for createVueQueryHooks factory.
 * Mocks @tanstack/vue-query to test hook wiring without Vue.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { z } from 'zod';
import { defineRoute, defineRouter } from '@cosmneo/onion-lasagna/http/route';
import { zodSchema } from '@cosmneo/onion-lasagna-zod';

// ============================================================================
// Mock @tanstack/vue-query
// ============================================================================

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@tanstack/vue-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

// Must import after vi.mock
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let createVueQueryHooks: typeof import('../create-vue-query-hooks').createVueQueryHooks;

beforeEach(async () => {
  vi.resetAllMocks();
  mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
  mockUseMutation.mockReturnValue({ mutate: vi.fn(), isLoading: false });

  const mod = await import('../create-vue-query-hooks');
  createVueQueryHooks = mod.createVueQueryHooks;
});

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

describe('createVueQueryHooks', () => {
  const config = { baseUrl: 'http://localhost:3000' };

  describe('hook structure', () => {
    it('returns hooks and queryKeys', () => {
      const result = createVueQueryHooks({ list: listUsersRoute }, config);

      expect(result).toHaveProperty('hooks');
      expect(result).toHaveProperty('queryKeys');
    });

    it('creates useQuery for GET routes', () => {
      const { hooks } = createVueQueryHooks({ list: listUsersRoute, get: getUserRoute }, config);

      expect(hooks).toHaveProperty('list');
      expect(hooks['list']).toHaveProperty('useQuery');
      expect(typeof (hooks['list'] as Record<string, unknown>)['useQuery']).toBe('function');
    });

    it('creates useQuery for HEAD routes', () => {
      const { hooks } = createVueQueryHooks({ head: headUsersRoute }, config);

      expect(hooks['head']).toHaveProperty('useQuery');
    });

    it('creates useMutation for POST routes', () => {
      const { hooks } = createVueQueryHooks({ create: createUserRoute }, config);

      expect(hooks['create']).toHaveProperty('useMutation');
      expect(typeof (hooks['create'] as Record<string, unknown>)['useMutation']).toBe('function');
    });

    it('creates useMutation for DELETE routes', () => {
      const { hooks } = createVueQueryHooks({ remove: deleteUserRoute }, config);

      expect(hooks['remove']).toHaveProperty('useMutation');
    });

    it('preserves nested structure', () => {
      const { hooks } = createVueQueryHooks(
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
      expect(users['list']).toHaveProperty('useQuery');
      expect(users['get']).toHaveProperty('useQuery');
      expect(users['create']).toHaveProperty('useMutation');
      expect(users['remove']).toHaveProperty('useMutation');
    });

    it('handles deeply nested routers', () => {
      const { hooks } = createVueQueryHooks(
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
      expect(users['list']).toHaveProperty('useQuery');
    });
  });

  describe('useQuery behavior', () => {
    it('calls useQuery with correct queryKey for route without input', () => {
      const { hooks } = createVueQueryHooks({ list: listUsersRoute }, config);

      const hook = hooks['list'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery();

      expect(mockUseQuery).toHaveBeenCalledTimes(1);
      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs['queryKey']).toEqual(['list']);
      expect(typeof callArgs['queryFn']).toBe('function');
    });

    it('appends input to queryKey', () => {
      const { hooks } = createVueQueryHooks({ get: getUserRoute }, config);

      const hook = hooks['get'] as { useQuery: (...args: unknown[]) => unknown };
      const input = { pathParams: { userId: '123' } };
      hook.useQuery(input);

      expect(mockUseQuery).toHaveBeenCalledTimes(1);
      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs['queryKey']).toEqual(['get', { pathParams: { userId: '123' } }]);
    });

    it('passes additional options through', () => {
      const { hooks } = createVueQueryHooks({ list: listUsersRoute }, config);

      const hook = hooks['list'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery(undefined, { staleTime: 5000, enabled: false });

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs['staleTime']).toBe(5000);
      // enabled is a getter — invoke to get the resolved boolean
      const enabledGetter = callArgs['enabled'] as () => boolean;
      expect(enabledGetter()).toBe(false);
    });

    it('builds correct queryKey for nested routes', () => {
      const { hooks } = createVueQueryHooks(
        {
          users: {
            list: listUsersRoute,
            get: getUserRoute,
          },
        },
        config,
      );

      const users = hooks['users'] as Record<string, { useQuery: (...args: unknown[]) => unknown }>;
      users['list']!.useQuery();
      users['get']!.useQuery({ pathParams: { userId: '456' } });

      const listCallArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      expect(listCallArgs['queryKey']).toEqual(['users', 'list']);

      const getCallArgs = mockUseQuery.mock.calls[1]![0] as Record<string, unknown>;
      expect(getCallArgs['queryKey']).toEqual(['users', 'get', { pathParams: { userId: '456' } }]);
    });
  });

  describe('useMutation behavior', () => {
    it('calls useMutation with mutationFn', () => {
      const { hooks } = createVueQueryHooks({ create: createUserRoute }, config);

      const hook = hooks['create'] as { useMutation: (...args: unknown[]) => unknown };
      hook.useMutation();

      expect(mockUseMutation).toHaveBeenCalledTimes(1);
      const callArgs = mockUseMutation.mock.calls[0]![0] as Record<string, unknown>;
      expect(typeof callArgs['mutationFn']).toBe('function');
    });

    it('passes additional mutation options through', () => {
      const onSuccess = vi.fn();

      const { hooks } = createVueQueryHooks({ create: createUserRoute }, config);

      const hook = hooks['create'] as { useMutation: (...args: unknown[]) => unknown };
      hook.useMutation({ onSuccess });

      const callArgs = mockUseMutation.mock.calls[0]![0] as Record<string, unknown>;
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

      const { hooks, queryKeys } = createVueQueryHooks(router, config);

      const users = hooks['users'] as Record<string, Record<string, unknown>>;
      expect(users['list']).toHaveProperty('useQuery');
      expect(users['create']).toHaveProperty('useMutation');

      const usersKeys = queryKeys['users'] as (() => readonly string[]) & Record<string, unknown>;
      expect(usersKeys()).toEqual(['users']);
    });
  });

  describe('queryKeys integration', () => {
    it('returns query keys matching hook key paths', () => {
      const { queryKeys } = createVueQueryHooks(
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
      const { hooks } = createVueQueryHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => false },
      );

      const hook = hooks['list'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery();

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      // enabled is now a getter — invoke it to get the current value
      const enabledGetter = callArgs['enabled'] as () => boolean;
      expect(typeof enabledGetter).toBe('function');
      expect(enabledGetter()).toBe(false);
    });

    it('enables query when useEnabled returns true', () => {
      const { hooks } = createVueQueryHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => true },
      );

      const hook = hooks['list'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery();

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      const enabledGetter = callArgs['enabled'] as () => boolean;
      expect(typeof enabledGetter).toBe('function');
      expect(enabledGetter()).toBe(true);
    });

    it('composes with per-query enabled (both must be true)', () => {
      const { hooks } = createVueQueryHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => true },
      );

      const hook = hooks['list'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery(undefined, { enabled: false });

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      const enabledGetter = callArgs['enabled'] as () => boolean;
      expect(enabledGetter()).toBe(false);
    });

    it('composes with per-query enabled (useEnabled false overrides)', () => {
      const { hooks } = createVueQueryHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => false },
      );

      const hook = hooks['list'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery(undefined, { enabled: true });

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      const enabledGetter = callArgs['enabled'] as () => boolean;
      expect(enabledGetter()).toBe(false);
    });

    it('defaults to enabled when useEnabled is not provided', () => {
      const { hooks } = createVueQueryHooks({ list: listUsersRoute }, config);

      const hook = hooks['list'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery();

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      const enabledGetter = callArgs['enabled'] as () => boolean;
      expect(typeof enabledGetter).toBe('function');
      expect(enabledGetter()).toBe(true);
    });

    it('does not affect mutations', () => {
      const { hooks } = createVueQueryHooks(
        { create: createUserRoute },
        { ...config, useEnabled: () => false },
      );

      const hook = hooks['create'] as { useMutation: (...args: unknown[]) => unknown };
      hook.useMutation();

      expect(mockUseMutation).toHaveBeenCalledTimes(1);
      const callArgs = mockUseMutation.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs).not.toHaveProperty('enabled');
    });

    it('preserves other options when composing enabled', () => {
      const { hooks } = createVueQueryHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => true },
      );

      const hook = hooks['list'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery(undefined, { staleTime: 5000, enabled: true });

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs['staleTime']).toBe(5000);
      const enabledGetter = callArgs['enabled'] as () => boolean;
      expect(enabledGetter()).toBe(true);
    });
  });

  describe('queryKeyPrefix', () => {
    it('prefixes query keys in hooks', () => {
      const { hooks } = createVueQueryHooks(
        { list: listUsersRoute },
        { ...config, queryKeyPrefix: 'my-api' },
      );

      const hook = hooks['list'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery();

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs['queryKey']).toEqual(['my-api', 'list']);
    });

    it('prefixes query keys with input', () => {
      const { hooks } = createVueQueryHooks(
        { get: getUserRoute },
        { ...config, queryKeyPrefix: 'my-api' },
      );

      const hook = hooks['get'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery({ pathParams: { userId: '1' } });

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs['queryKey']).toEqual(['my-api', 'get', { pathParams: { userId: '1' } }]);
    });

    it('prefixes queryKeys object', () => {
      const { queryKeys } = createVueQueryHooks(
        { users: { list: listUsersRoute } },
        { ...config, queryKeyPrefix: 'my-api' },
      );

      const usersKeys = queryKeys['users'] as (() => readonly string[]) & Record<string, unknown>;
      expect(usersKeys()).toEqual(['my-api', 'users']);

      const listKeyFn = usersKeys['list'] as () => readonly unknown[];
      expect(listKeyFn()).toEqual(['my-api', 'users', 'list']);
    });

    it('prevents cache collisions between separate router instances', () => {
      const { queryKeys: keysA } = createVueQueryHooks(
        { list: listUsersRoute },
        { ...config, queryKeyPrefix: 'users-api' },
      );
      const { queryKeys: keysB } = createVueQueryHooks(
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

  // ============================================================================
  // P07-1: reactive enabled getter + reactive input (bug fix tests)
  // ============================================================================

  describe('P07-1: reactive enabled getter', () => {
    it('passes enabled as a getter function, not a static boolean', () => {
      const { hooks } = createVueQueryHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => true },
      );

      const hook = hooks['list'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery();

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      // CRITICAL: enabled must be a function (getter), not a static boolean
      expect(typeof callArgs['enabled']).toBe('function');
    });

    it('enabled getter re-evaluates useEnabled on each call', () => {
      let sessionValid = false;
      const useEnabled = () => sessionValid;

      const { hooks } = createVueQueryHooks({ list: listUsersRoute }, { ...config, useEnabled });

      const hook = hooks['list'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery();

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      const enabledGetter = callArgs['enabled'] as () => boolean;

      // Initially false
      expect(enabledGetter()).toBe(false);

      // Session becomes valid — getter must re-evaluate
      sessionValid = true;
      expect(enabledGetter()).toBe(true);
    });

    it('enabled getter composes useEnabled AND per-query enabled (both true -> true)', () => {
      const { hooks } = createVueQueryHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => true },
      );

      const hook = hooks['list'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery(undefined, { enabled: () => true });

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      const enabledGetter = callArgs['enabled'] as () => boolean;
      expect(enabledGetter()).toBe(true);
    });

    it('enabled getter composes useEnabled AND per-query enabled (useEnabled false -> false)', () => {
      const { hooks } = createVueQueryHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => false },
      );

      const hook = hooks['list'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery(undefined, { enabled: () => true });

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      const enabledGetter = callArgs['enabled'] as () => boolean;
      expect(enabledGetter()).toBe(false);
    });

    it('enabled getter composes with reactive ref input', () => {
      const enabledRef = ref(false);
      const { hooks } = createVueQueryHooks({ list: listUsersRoute }, config);

      const hook = hooks['list'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery(undefined, { enabled: enabledRef });

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      const enabledGetter = callArgs['enabled'] as () => boolean;

      expect(enabledGetter()).toBe(false);
      enabledRef.value = true;
      expect(enabledGetter()).toBe(true);
    });

    it('enabled getter defaults to true when useEnabled not provided and no user enabled', () => {
      const { hooks } = createVueQueryHooks({ list: listUsersRoute }, config);

      const hook = hooks['list'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery();

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      const enabledGetter = callArgs['enabled'] as () => boolean;
      expect(typeof enabledGetter).toBe('function');
      expect(enabledGetter()).toBe(true);
    });
  });

  describe('P07-1: reactive input (MaybeRefOrGetter)', () => {
    it('applies toValue to input inside queryKey so a changed ref refetches', () => {
      const { hooks } = createVueQueryHooks({ get: getUserRoute }, config);

      const userIdRef = ref('123');
      const hook = hooks['get'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery(() => ({ pathParams: { userId: userIdRef.value } }));

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      // queryKey should include the resolved (toValue'd) input
      const qk = callArgs['queryKey'] as unknown[];
      expect(qk).toEqual(['get', { pathParams: { userId: '123' } }]);
    });

    it('queryFn resolves input via toValue so a ref input is unwrapped', () => {
      const { hooks } = createVueQueryHooks({ get: getUserRoute }, config);

      const inputRef = ref({ pathParams: { userId: '456' } });
      const hook = hooks['get'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery(inputRef);

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      const qk = callArgs['queryKey'] as unknown[];
      // The unwrapped ref value must appear in the key
      expect(qk).toEqual(['get', { pathParams: { userId: '456' } }]);
    });

    it('plain object input still works (non-reactive call path)', () => {
      const { hooks } = createVueQueryHooks({ get: getUserRoute }, config);

      const hook = hooks['get'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery({ pathParams: { userId: '789' } });

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs['queryKey']).toEqual(['get', { pathParams: { userId: '789' } }]);
    });
  });

  // ============================================================================
  // P07-2: Signal threading — queryFn must forward the AbortSignal to client
  // ============================================================================

  describe('P07-2: signal threading', () => {
    it('queryFn forwards the signal from Vue Query context to the underlying client', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const { hooks } = createVueQueryHooks({ list: listUsersRoute }, { ...config, fetch: mockFetch });

      const hook = hooks['list'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery();

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      const queryFn = callArgs['queryFn'] as (ctx: { signal?: AbortSignal }) => Promise<unknown>;

      const controller = new AbortController();
      await queryFn({ signal: controller.signal });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, fetchInit] = mockFetch.mock.calls[0]! as [Request, RequestInit];
      // signal was passed through to fetch
      expect(fetchInit).toBeDefined();
    });

    it('queryFn passes correct input (resolved from MaybeRefOrGetter) to the client', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      const { hooks } = createVueQueryHooks({ get: getUserRoute }, { ...config, fetch: mockFetch });

      const hook = hooks['get'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery({ pathParams: { userId: '77' } });

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      const queryFn = callArgs['queryFn'] as (ctx: { signal?: AbortSignal }) => Promise<unknown>;

      await queryFn({ signal: undefined });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchedRequest = mockFetch.mock.calls[0]![0] as Request;
      expect(fetchedRequest.url).toContain('/users/77');
    });
  });
});
