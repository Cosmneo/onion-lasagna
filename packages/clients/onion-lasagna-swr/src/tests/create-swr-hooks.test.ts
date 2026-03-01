/**
 * @fileoverview Tests for createSWRHooks factory.
 * Mocks swr and swr/mutation to test hook wiring without React.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { defineRoute, defineRouter } from '@cosmneo/onion-lasagna/http/route';
import { zodSchema } from '@cosmneo/onion-lasagna-zod';

// ============================================================================
// Mock swr (default exports)
// ============================================================================

const mockUseSWR = vi.fn();
const mockUseSWRMutation = vi.fn();

vi.mock('swr', () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

vi.mock('swr/mutation', () => ({
  default: (...args: unknown[]) => mockUseSWRMutation(...args),
}));

// Must import after vi.mock
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let createSWRHooks: typeof import('../create-swr-hooks').createSWRHooks;

beforeEach(async () => {
  vi.resetAllMocks();
  mockUseSWR.mockReturnValue({ data: undefined, isLoading: true });
  mockUseSWRMutation.mockReturnValue({ trigger: vi.fn(), isMutating: false });

  const mod = await import('../create-swr-hooks');
  createSWRHooks = mod.createSWRHooks;
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

describe('createSWRHooks', () => {
  const config = { baseUrl: 'http://localhost:3000' };

  describe('hook structure', () => {
    it('returns hooks and queryKeys', () => {
      const result = createSWRHooks({ list: listUsersRoute }, config);

      expect(result).toHaveProperty('hooks');
      expect(result).toHaveProperty('queryKeys');
    });

    it('creates useSWR for GET routes', () => {
      const { hooks } = createSWRHooks({ list: listUsersRoute, get: getUserRoute }, config);

      expect(hooks).toHaveProperty('list');
      expect(hooks['list']).toHaveProperty('useSWR');
      expect(typeof (hooks['list'] as Record<string, unknown>)['useSWR']).toBe('function');
    });

    it('creates useSWR for HEAD routes', () => {
      const { hooks } = createSWRHooks({ head: headUsersRoute }, config);

      expect(hooks['head']).toHaveProperty('useSWR');
    });

    it('creates useSWRMutation for POST routes', () => {
      const { hooks } = createSWRHooks({ create: createUserRoute }, config);

      expect(hooks['create']).toHaveProperty('useSWRMutation');
      expect(typeof (hooks['create'] as Record<string, unknown>)['useSWRMutation']).toBe(
        'function',
      );
    });

    it('creates useSWRMutation for DELETE routes', () => {
      const { hooks } = createSWRHooks({ remove: deleteUserRoute }, config);

      expect(hooks['remove']).toHaveProperty('useSWRMutation');
    });

    it('preserves nested structure', () => {
      const { hooks } = createSWRHooks(
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
      expect(users['list']).toHaveProperty('useSWR');
      expect(users['get']).toHaveProperty('useSWR');
      expect(users['create']).toHaveProperty('useSWRMutation');
      expect(users['remove']).toHaveProperty('useSWRMutation');
    });

    it('handles deeply nested routers', () => {
      const { hooks } = createSWRHooks(
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
      expect(users['list']).toHaveProperty('useSWR');
    });
  });

  describe('useSWR behavior', () => {
    it('calls useSWR with correct key for route without input', () => {
      const { hooks } = createSWRHooks({ list: listUsersRoute }, config);

      const hook = hooks['list'] as { useSWR: (...args: unknown[]) => unknown };
      hook.useSWR();

      expect(mockUseSWR).toHaveBeenCalledTimes(1);
      // SWR uses positional args: (key, fetcher, options)
      const [key, fetcher] = mockUseSWR.mock.calls[0]!;
      expect(key).toEqual(['list']);
      expect(typeof fetcher).toBe('function');
    });

    it('appends input to key', () => {
      const { hooks } = createSWRHooks({ get: getUserRoute }, config);

      const hook = hooks['get'] as { useSWR: (...args: unknown[]) => unknown };
      const input = { pathParams: { userId: '123' } };
      hook.useSWR(input);

      expect(mockUseSWR).toHaveBeenCalledTimes(1);
      const [key] = mockUseSWR.mock.calls[0]!;
      expect(key).toEqual(['get', { pathParams: { userId: '123' } }]);
    });

    it('passes additional options through', () => {
      const { hooks } = createSWRHooks({ list: listUsersRoute }, config);

      const hook = hooks['list'] as { useSWR: (...args: unknown[]) => unknown };
      hook.useSWR(undefined, { dedupingInterval: 5000 });

      // SWR: (key, fetcher, options)
      const [, , options] = mockUseSWR.mock.calls[0]! as [
        unknown,
        unknown,
        Record<string, unknown>,
      ];
      expect(options['dedupingInterval']).toBe(5000);
    });

    it('builds correct key for nested routes', () => {
      const { hooks } = createSWRHooks(
        {
          users: {
            list: listUsersRoute,
            get: getUserRoute,
          },
        },
        config,
      );

      const users = hooks['users'] as Record<string, { useSWR: (...args: unknown[]) => unknown }>;
      users['list']!.useSWR();
      users['get']!.useSWR({ pathParams: { userId: '456' } });

      const [listKey] = mockUseSWR.mock.calls[0]!;
      expect(listKey).toEqual(['users', 'list']);

      const [getKey] = mockUseSWR.mock.calls[1]!;
      expect(getKey).toEqual(['users', 'get', { pathParams: { userId: '456' } }]);
    });
  });

  describe('useSWRMutation behavior', () => {
    it('calls useSWRMutation with key and fetcher', () => {
      const { hooks } = createSWRHooks({ create: createUserRoute }, config);

      const hook = hooks['create'] as { useSWRMutation: (...args: unknown[]) => unknown };
      hook.useSWRMutation();

      expect(mockUseSWRMutation).toHaveBeenCalledTimes(1);
      // SWR mutation: (key, fetcher, options)
      const [key, fetcher] = mockUseSWRMutation.mock.calls[0]!;
      expect(key).toEqual(['create']);
      expect(typeof fetcher).toBe('function');
    });

    it('bridges fetcher to receive (key, { arg }) and call clientMethod(arg)', () => {
      const { hooks } = createSWRHooks({ create: createUserRoute }, config);

      const hook = hooks['create'] as { useSWRMutation: (...args: unknown[]) => unknown };
      hook.useSWRMutation();

      // Get the fetcher that was passed to useSWRMutation
      const [, fetcher] = mockUseSWRMutation.mock.calls[0]! as [
        unknown,
        (key: unknown, opts: { arg: unknown }) => Promise<unknown>,
      ];

      // The fetcher should accept (key, { arg }) format
      expect(typeof fetcher).toBe('function');
    });

    it('passes additional mutation options through', () => {
      const onSuccess = vi.fn();

      const { hooks } = createSWRHooks({ create: createUserRoute }, config);

      const hook = hooks['create'] as { useSWRMutation: (...args: unknown[]) => unknown };
      hook.useSWRMutation({ onSuccess });

      const [, , options] = mockUseSWRMutation.mock.calls[0]! as [
        unknown,
        unknown,
        Record<string, unknown>,
      ];
      expect(options['onSuccess']).toBe(onSuccess);
    });

    it('uses keyPath for nested mutation routes', () => {
      const { hooks } = createSWRHooks(
        {
          users: {
            create: createUserRoute,
          },
        },
        config,
      );

      const users = hooks['users'] as Record<
        string,
        { useSWRMutation: (...args: unknown[]) => unknown }
      >;
      users['create']!.useSWRMutation();

      const [key] = mockUseSWRMutation.mock.calls[0]!;
      expect(key).toEqual(['users', 'create']);
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

      const { hooks, queryKeys } = createSWRHooks(router, config);

      const users = hooks['users'] as Record<string, Record<string, unknown>>;
      expect(users['list']).toHaveProperty('useSWR');
      expect(users['create']).toHaveProperty('useSWRMutation');

      const usersKeys = queryKeys['users'] as (() => readonly string[]) & Record<string, unknown>;
      expect(usersKeys()).toEqual(['users']);
    });
  });

  describe('queryKeys integration', () => {
    it('returns query keys matching hook key paths', () => {
      const { queryKeys } = createSWRHooks(
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
    it('sets key to null when useEnabled returns false', () => {
      const { hooks } = createSWRHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => false },
      );

      const hook = hooks['list'] as { useSWR: (...args: unknown[]) => unknown };
      hook.useSWR();

      const [key] = mockUseSWR.mock.calls[0]!;
      expect(key).toBeNull();
    });

    it('uses normal key when useEnabled returns true', () => {
      const { hooks } = createSWRHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => true },
      );

      const hook = hooks['list'] as { useSWR: (...args: unknown[]) => unknown };
      hook.useSWR();

      const [key] = mockUseSWR.mock.calls[0]!;
      expect(key).toEqual(['list']);
    });

    it('composes with per-query enabled (both must be true)', () => {
      const { hooks } = createSWRHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => true },
      );

      const hook = hooks['list'] as { useSWR: (...args: unknown[]) => unknown };
      hook.useSWR(undefined, { enabled: false });

      const [key] = mockUseSWR.mock.calls[0]!;
      expect(key).toBeNull();
    });

    it('composes with per-query enabled (useEnabled false overrides)', () => {
      const { hooks } = createSWRHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => false },
      );

      const hook = hooks['list'] as { useSWR: (...args: unknown[]) => unknown };
      hook.useSWR(undefined, { enabled: true });

      const [key] = mockUseSWR.mock.calls[0]!;
      expect(key).toBeNull();
    });

    it('defaults to enabled when useEnabled is not provided', () => {
      const { hooks } = createSWRHooks({ list: listUsersRoute }, config);

      const hook = hooks['list'] as { useSWR: (...args: unknown[]) => unknown };
      hook.useSWR();

      const [key] = mockUseSWR.mock.calls[0]!;
      expect(key).toEqual(['list']);
    });

    it('does not affect mutations', () => {
      const { hooks } = createSWRHooks(
        { create: createUserRoute },
        { ...config, useEnabled: () => false },
      );

      const hook = hooks['create'] as { useSWRMutation: (...args: unknown[]) => unknown };
      hook.useSWRMutation();

      expect(mockUseSWRMutation).toHaveBeenCalledTimes(1);
      // Mutation key should still be the keyPath, not null
      const [key] = mockUseSWRMutation.mock.calls[0]!;
      expect(key).toEqual(['create']);
    });

    it('preserves other options when composing enabled', () => {
      const { hooks } = createSWRHooks(
        { list: listUsersRoute },
        { ...config, useEnabled: () => true },
      );

      const hook = hooks['list'] as { useSWR: (...args: unknown[]) => unknown };
      hook.useSWR(undefined, { dedupingInterval: 5000, enabled: true });

      // enabled should be extracted; other options passed through
      const [key, , options] = mockUseSWR.mock.calls[0]! as [
        unknown,
        unknown,
        Record<string, unknown>,
      ];
      expect(key).toEqual(['list']);
      expect(options['dedupingInterval']).toBe(5000);
      // enabled should NOT be in the options passed to SWR
      expect(options).not.toHaveProperty('enabled');
    });
  });

  describe('queryKeyPrefix', () => {
    it('prefixes query keys in hooks', () => {
      const { hooks } = createSWRHooks(
        { list: listUsersRoute },
        { ...config, queryKeyPrefix: 'my-api' },
      );

      const hook = hooks['list'] as { useSWR: (...args: unknown[]) => unknown };
      hook.useSWR();

      const [key] = mockUseSWR.mock.calls[0]!;
      expect(key).toEqual(['my-api', 'list']);
    });

    it('prefixes query keys with input', () => {
      const { hooks } = createSWRHooks(
        { get: getUserRoute },
        { ...config, queryKeyPrefix: 'my-api' },
      );

      const hook = hooks['get'] as { useSWR: (...args: unknown[]) => unknown };
      hook.useSWR({ pathParams: { userId: '1' } });

      const [key] = mockUseSWR.mock.calls[0]!;
      expect(key).toEqual(['my-api', 'get', { pathParams: { userId: '1' } }]);
    });

    it('prefixes queryKeys object', () => {
      const { queryKeys } = createSWRHooks(
        { users: { list: listUsersRoute } },
        { ...config, queryKeyPrefix: 'my-api' },
      );

      const usersKeys = queryKeys['users'] as (() => readonly string[]) & Record<string, unknown>;
      expect(usersKeys()).toEqual(['my-api', 'users']);

      const listKeyFn = usersKeys['list'] as () => readonly unknown[];
      expect(listKeyFn()).toEqual(['my-api', 'users', 'list']);
    });

    it('prevents cache collisions between separate router instances', () => {
      const { queryKeys: keysA } = createSWRHooks(
        { list: listUsersRoute },
        { ...config, queryKeyPrefix: 'users-api' },
      );
      const { queryKeys: keysB } = createSWRHooks(
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
});
