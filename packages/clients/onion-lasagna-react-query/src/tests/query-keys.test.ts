/**
 * @fileoverview Tests for query key generation.
 * Pure function tests — no React dependency needed.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { buildQueryKeys } from '../query-keys';
import { defineRoute, defineRouter } from '@cosmneo/onion-lasagna/http/route';
import { zodSchema } from '@cosmneo/onion-lasagna-zod';

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

const listPostsRoute = defineRoute({
  method: 'GET',
  path: '/posts',
  responses: { 200: { description: 'Success' } },
});

// ============================================================================
// Tests
// ============================================================================

describe('buildQueryKeys', () => {
  describe('flat router', () => {
    it('creates key functions for each route', () => {
      const keys = buildQueryKeys({
        list: listUsersRoute,
        get: getUserRoute,
        create: createUserRoute,
      });

      expect(typeof keys['list']).toBe('function');
      expect(typeof keys['get']).toBe('function');
      expect(typeof keys['create']).toBe('function');
    });

    it('returns key path without input', () => {
      const keys = buildQueryKeys({ list: listUsersRoute });
      const listKeyFn = keys['list'] as (input?: unknown) => readonly unknown[];

      expect(listKeyFn()).toEqual(['list']);
    });

    it('appends input to key path', () => {
      const keys = buildQueryKeys({ get: getUserRoute });
      const getKeyFn = keys['get'] as (input?: unknown) => readonly unknown[];

      const input = { pathParams: { userId: '123' } };
      expect(getKeyFn(input)).toEqual(['get', { pathParams: { userId: '123' } }]);
    });

    it('does not append empty input', () => {
      const keys = buildQueryKeys({ list: listUsersRoute });
      const listKeyFn = keys['list'] as (input?: unknown) => readonly unknown[];

      expect(listKeyFn({})).toEqual(['list']);
      expect(listKeyFn(undefined)).toEqual(['list']);
    });
  });

  describe('nested router', () => {
    it('creates namespace functions with children', () => {
      const keys = buildQueryKeys({
        users: {
          list: listUsersRoute,
          get: getUserRoute,
        },
      });

      const usersNs = keys['users'] as (() => readonly string[]) & Record<string, unknown>;

      // Namespace is callable
      expect(typeof usersNs).toBe('function');
      expect(usersNs()).toEqual(['users']);

      // Children accessible
      expect(typeof usersNs['list']).toBe('function');
      expect(typeof usersNs['get']).toBe('function');
    });

    it('builds correct key paths for nested routes', () => {
      const keys = buildQueryKeys({
        users: {
          list: listUsersRoute,
          get: getUserRoute,
        },
      });

      const usersNs = keys['users'] as (() => readonly string[]) & Record<string, unknown>;
      const listKeyFn = usersNs['list'] as (input?: unknown) => readonly unknown[];
      const getKeyFn = usersNs['get'] as (input?: unknown) => readonly unknown[];

      expect(listKeyFn()).toEqual(['users', 'list']);
      expect(getKeyFn({ pathParams: { userId: '456' } })).toEqual([
        'users',
        'get',
        { pathParams: { userId: '456' } },
      ]);
    });

    it('handles multiple nested groups', () => {
      const keys = buildQueryKeys({
        users: { list: listUsersRoute },
        posts: { list: listPostsRoute },
      });

      const usersNs = keys['users'] as (() => readonly string[]) & Record<string, unknown>;
      const postsNs = keys['posts'] as (() => readonly string[]) & Record<string, unknown>;

      expect(usersNs()).toEqual(['users']);
      expect(postsNs()).toEqual(['posts']);

      const usersListFn = usersNs['list'] as () => readonly unknown[];
      const postsListFn = postsNs['list'] as () => readonly unknown[];

      expect(usersListFn()).toEqual(['users', 'list']);
      expect(postsListFn()).toEqual(['posts', 'list']);
    });
  });

  describe('deeply nested router', () => {
    it('builds correct key paths at all levels', () => {
      const keys = buildQueryKeys({
        api: {
          v1: {
            users: {
              list: listUsersRoute,
            },
          },
        },
      });

      const apiNs = keys['api'] as (() => readonly string[]) & Record<string, unknown>;
      const v1Ns = apiNs['v1'] as (() => readonly string[]) & Record<string, unknown>;
      const usersNs = v1Ns['users'] as (() => readonly string[]) & Record<string, unknown>;
      const listFn = usersNs['list'] as () => readonly unknown[];

      expect(apiNs()).toEqual(['api']);
      expect(v1Ns()).toEqual(['api', 'v1']);
      expect(usersNs()).toEqual(['api', 'v1', 'users']);
      expect(listFn()).toEqual(['api', 'v1', 'users', 'list']);
    });
  });

  describe('RouterDefinition handling', () => {
    it('handles defineRouter output', () => {
      const router = defineRouter({
        users: {
          list: listUsersRoute,
          get: getUserRoute,
        },
      });

      const keys = buildQueryKeys(router);
      const usersNs = keys['users'] as (() => readonly string[]) & Record<string, unknown>;

      expect(usersNs()).toEqual(['users']);
      const listFn = usersNs['list'] as () => readonly unknown[];
      expect(listFn()).toEqual(['users', 'list']);
    });

    it('handles nested RouterDefinition', () => {
      const usersRouter = defineRouter({
        list: listUsersRoute,
        get: getUserRoute,
      });

      const keys = buildQueryKeys({
        users: usersRouter,
      } as Record<string, unknown>);

      const usersNs = keys['users'] as (() => readonly string[]) & Record<string, unknown>;
      expect(usersNs()).toEqual(['users']);

      const listFn = usersNs['list'] as () => readonly unknown[];
      expect(listFn()).toEqual(['users', 'list']);
    });
  });

  describe('mutation routes', () => {
    it('creates key functions for mutation routes too', () => {
      const keys = buildQueryKeys({
        create: createUserRoute,
        delete: deleteUserRoute,
      });

      const createKeyFn = keys['create'] as (input?: unknown) => readonly unknown[];
      const deleteKeyFn = keys['delete'] as (input?: unknown) => readonly unknown[];

      expect(createKeyFn()).toEqual(['create']);
      expect(deleteKeyFn({ pathParams: { userId: '123' } })).toEqual([
        'delete',
        { pathParams: { userId: '123' } },
      ]);
    });
  });

  describe('query input with data', () => {
    it('appends query params as input', () => {
      const keys = buildQueryKeys({ list: listUsersRoute });
      const listKeyFn = keys['list'] as (input?: unknown) => readonly unknown[];

      expect(listKeyFn({ query: { page: 2 } })).toEqual(['list', { query: { page: 2 } }]);
    });
  });

  describe('query key prefix', () => {
    it('prepends prefix to flat route keys', () => {
      const keys = buildQueryKeys({ list: listUsersRoute }, ['my-api']);
      const listKeyFn = keys['list'] as (input?: unknown) => readonly unknown[];

      expect(listKeyFn()).toEqual(['my-api', 'list']);
    });

    it('prepends prefix to nested route keys', () => {
      const keys = buildQueryKeys({ users: { list: listUsersRoute, get: getUserRoute } }, [
        'my-api',
      ]);

      const usersNs = keys['users'] as (() => readonly string[]) & Record<string, unknown>;
      const listKeyFn = usersNs['list'] as (input?: unknown) => readonly unknown[];
      const getKeyFn = usersNs['get'] as (input?: unknown) => readonly unknown[];

      expect(usersNs()).toEqual(['my-api', 'users']);
      expect(listKeyFn()).toEqual(['my-api', 'users', 'list']);
      expect(getKeyFn({ pathParams: { userId: '1' } })).toEqual([
        'my-api',
        'users',
        'get',
        { pathParams: { userId: '1' } },
      ]);
    });

    it('prevents collisions between routers with same key names', () => {
      const keysA = buildQueryKeys({ list: listUsersRoute }, ['users-api']);
      const keysB = buildQueryKeys({ list: listPostsRoute }, ['posts-api']);

      const listA = keysA['list'] as () => readonly unknown[];
      const listB = keysB['list'] as () => readonly unknown[];

      expect(listA()).toEqual(['users-api', 'list']);
      expect(listB()).toEqual(['posts-api', 'list']);
      expect(listA()).not.toEqual(listB());
    });
  });
});
