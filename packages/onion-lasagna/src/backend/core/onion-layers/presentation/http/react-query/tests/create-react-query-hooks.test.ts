/**
 * @fileoverview Tests for createReactQueryHooks factory.
 * Mocks @tanstack/react-query to test hook wiring without React.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { defineRoute } from '../../route/define-route';
import { defineRouter } from '../../route/define-router';
import { zodSchema } from '../../schema/adapters/zod.adapter';

// ============================================================================
// Mock @tanstack/react-query
// ============================================================================

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
}));

// Must import after vi.mock
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
let createReactQueryHooks: typeof import('../create-react-query-hooks').createReactQueryHooks;

beforeEach(async () => {
  vi.resetAllMocks();
  mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });
  mockUseMutation.mockReturnValue({ mutate: vi.fn(), isLoading: false });

  const mod = await import('../create-react-query-hooks');
  createReactQueryHooks = mod.createReactQueryHooks;
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

describe('createReactQueryHooks', () => {
  const config = { baseUrl: 'http://localhost:3000' };

  describe('hook structure', () => {
    it('returns hooks and queryKeys', () => {
      const result = createReactQueryHooks(
        { list: listUsersRoute },
        config,
      );

      expect(result).toHaveProperty('hooks');
      expect(result).toHaveProperty('queryKeys');
    });

    it('creates useQuery for GET routes', () => {
      const { hooks } = createReactQueryHooks(
        { list: listUsersRoute, get: getUserRoute },
        config,
      );

      expect(hooks).toHaveProperty('list');
      expect(hooks['list']).toHaveProperty('useQuery');
      expect(typeof (hooks['list'] as Record<string, unknown>)['useQuery']).toBe('function');
    });

    it('creates useQuery for HEAD routes', () => {
      const { hooks } = createReactQueryHooks(
        { head: headUsersRoute },
        config,
      );

      expect(hooks['head']).toHaveProperty('useQuery');
    });

    it('creates useMutation for POST routes', () => {
      const { hooks } = createReactQueryHooks(
        { create: createUserRoute },
        config,
      );

      expect(hooks['create']).toHaveProperty('useMutation');
      expect(typeof (hooks['create'] as Record<string, unknown>)['useMutation']).toBe('function');
    });

    it('creates useMutation for DELETE routes', () => {
      const { hooks } = createReactQueryHooks(
        { remove: deleteUserRoute },
        config,
      );

      expect(hooks['remove']).toHaveProperty('useMutation');
    });

    it('preserves nested structure', () => {
      const { hooks } = createReactQueryHooks(
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
      const { hooks } = createReactQueryHooks(
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
      const { hooks } = createReactQueryHooks(
        { list: listUsersRoute },
        config,
      );

      const hook = hooks['list'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery();

      expect(mockUseQuery).toHaveBeenCalledTimes(1);
      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs['queryKey']).toEqual(['list']);
      expect(typeof callArgs['queryFn']).toBe('function');
    });

    it('appends input to queryKey', () => {
      const { hooks } = createReactQueryHooks(
        { get: getUserRoute },
        config,
      );

      const hook = hooks['get'] as { useQuery: (...args: unknown[]) => unknown };
      const input = { pathParams: { userId: '123' } };
      hook.useQuery(input);

      expect(mockUseQuery).toHaveBeenCalledTimes(1);
      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs['queryKey']).toEqual(['get', { pathParams: { userId: '123' } }]);
    });

    it('passes additional options through', () => {
      const { hooks } = createReactQueryHooks(
        { list: listUsersRoute },
        config,
      );

      const hook = hooks['list'] as { useQuery: (...args: unknown[]) => unknown };
      hook.useQuery(undefined, { staleTime: 5000, enabled: false });

      const callArgs = mockUseQuery.mock.calls[0]![0] as Record<string, unknown>;
      expect(callArgs['staleTime']).toBe(5000);
      expect(callArgs['enabled']).toBe(false);
    });

    it('builds correct queryKey for nested routes', () => {
      const { hooks } = createReactQueryHooks(
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
      expect(getCallArgs['queryKey']).toEqual([
        'users',
        'get',
        { pathParams: { userId: '456' } },
      ]);
    });
  });

  describe('useMutation behavior', () => {
    it('calls useMutation with mutationFn', () => {
      const { hooks } = createReactQueryHooks(
        { create: createUserRoute },
        config,
      );

      const hook = hooks['create'] as { useMutation: (...args: unknown[]) => unknown };
      hook.useMutation();

      expect(mockUseMutation).toHaveBeenCalledTimes(1);
      const callArgs = mockUseMutation.mock.calls[0]![0] as Record<string, unknown>;
      expect(typeof callArgs['mutationFn']).toBe('function');
    });

    it('passes additional mutation options through', () => {
      const onSuccess = vi.fn();

      const { hooks } = createReactQueryHooks(
        { create: createUserRoute },
        config,
      );

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

      const { hooks, queryKeys } = createReactQueryHooks(router, config);

      const users = hooks['users'] as Record<string, Record<string, unknown>>;
      expect(users['list']).toHaveProperty('useQuery');
      expect(users['create']).toHaveProperty('useMutation');

      const usersKeys = queryKeys['users'] as (() => readonly string[]) & Record<string, unknown>;
      expect(usersKeys()).toEqual(['users']);
    });
  });

  describe('queryKeys integration', () => {
    it('returns query keys matching hook key paths', () => {
      const { queryKeys } = createReactQueryHooks(
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
});
