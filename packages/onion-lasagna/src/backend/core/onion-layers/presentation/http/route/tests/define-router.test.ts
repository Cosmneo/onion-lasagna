/**
 * @fileoverview Tests for defineRouter factory function.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineRouter, mergeRouters } from '../define-router';
import { defineRoute } from '../define-route';
import { zodSchema } from '../../schema/adapters/zod.adapter';

// Sample routes for testing
const listUsersRoute = defineRoute({
  method: 'GET',
  path: '/users',
  responses: { 200: { description: 'Success' } },
});

const getUserRoute = defineRoute({
  method: 'GET',
  path: '/users/:id',
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

const listPostsRoute = defineRoute({
  method: 'GET',
  path: '/posts',
  responses: { 200: { description: 'Success' } },
});

describe('defineRouter', () => {
  describe('basic router creation', () => {
    it('creates a router with flat routes', () => {
      const router = defineRouter({
        list: listUsersRoute,
        get: getUserRoute,
        create: createUserRoute,
      });

      expect(router.routes.list).toBeDefined();
      expect(router.routes.get).toBeDefined();
      expect(router.routes.create).toBeDefined();
      expect(router._isRouter).toBe(true);
    });

    it('creates a router with nested structure', () => {
      const router = defineRouter({
        users: {
          list: listUsersRoute,
          get: getUserRoute,
        },
        posts: {
          list: listPostsRoute,
        },
      });

      expect(router.routes.users.list).toBeDefined();
      expect(router.routes.users.get).toBeDefined();
      expect(router.routes.posts.list).toBeDefined();
    });

    it('creates deeply nested routers', () => {
      const router = defineRouter({
        api: {
          v1: {
            users: {
              list: listUsersRoute,
            },
          },
        },
      });

      expect(router.routes.api.v1.users.list).toBeDefined();
    });
  });

  describe('router options', () => {
    it('sets basePath option', () => {
      const router = defineRouter(
        {
          list: listUsersRoute,
        },
        { basePath: '/api/v1' },
      );

      expect(router.basePath).toBe('/api/v1');
    });

    it('sets tags option', () => {
      const router = defineRouter(
        {
          list: listUsersRoute,
        },
        { tags: ['Users', 'Admin'] },
      );

      expect(router.tags).toEqual(['Users', 'Admin']);
    });

    it('sets both basePath and tags', () => {
      const router = defineRouter(
        {
          list: listUsersRoute,
        },
        {
          basePath: '/admin',
          tags: ['Admin'],
        },
      );

      expect(router.basePath).toBe('/admin');
      expect(router.tags).toEqual(['Admin']);
    });

    it('has undefined options when not provided', () => {
      const router = defineRouter({
        list: listUsersRoute,
      });

      expect(router.basePath).toBeUndefined();
      expect(router.tags).toBeUndefined();
    });
  });

  describe('immutability', () => {
    it('returns frozen router', () => {
      const router = defineRouter({
        list: listUsersRoute,
      });

      expect(Object.isFrozen(router)).toBe(true);
    });

    it('deep freezes nested objects', () => {
      const router = defineRouter({
        users: {
          list: listUsersRoute,
        },
      });

      expect(Object.isFrozen(router.routes)).toBe(true);
      expect(Object.isFrozen(router.routes.users)).toBe(true);
    });

    it('prevents modification', () => {
      const router = defineRouter({
        list: listUsersRoute,
      });

      expect(() => {
        // @ts-expect-error - testing runtime immutability
        router.basePath = '/modified';
      }).toThrow();
    });
  });

  describe('router composition', () => {
    it('allows using router.routes in another router', () => {
      const usersRouter = defineRouter({
        list: listUsersRoute,
        get: getUserRoute,
      });

      const postsRouter = defineRouter({
        list: listPostsRoute,
      });

      const api = defineRouter({
        users: usersRouter.routes,
        posts: postsRouter.routes,
      });

      expect(api.routes.users.list).toBeDefined();
      expect(api.routes.posts.list).toBeDefined();
    });
  });
});

describe('mergeRouters', () => {
  it('merges two route configs', () => {
    const merged = mergeRouters(
      { users: { list: listUsersRoute } },
      { posts: { list: listPostsRoute } },
    );

    expect(merged.routes.users.list).toBeDefined();
    expect(merged.routes.posts.list).toBeDefined();
  });

  it('merges two router definitions', () => {
    const usersRouter = defineRouter({
      users: { list: listUsersRoute },
    });

    const postsRouter = defineRouter({
      posts: { list: listPostsRoute },
    });

    const merged = mergeRouters(usersRouter, postsRouter);

    expect(merged.routes.users.list).toBeDefined();
    expect(merged.routes.posts.list).toBeDefined();
    expect(merged._isRouter).toBe(true);
  });

  it('merges router definition with route config', () => {
    const usersRouter = defineRouter({
      users: { list: listUsersRoute },
    });

    const merged = mergeRouters(usersRouter, { posts: { list: listPostsRoute } });

    expect(merged.routes.users.list).toBeDefined();
    expect(merged.routes.posts.list).toBeDefined();
  });

  it('returns frozen result', () => {
    const merged = mergeRouters(
      { users: { list: listUsersRoute } },
      { posts: { list: listPostsRoute } },
    );

    expect(Object.isFrozen(merged)).toBe(true);
  });

  it('second router overrides first on conflict', () => {
    const route1 = defineRoute({
      method: 'GET',
      path: '/v1/users',
      responses: { 200: { description: 'V1' } },
    });

    const route2 = defineRoute({
      method: 'GET',
      path: '/v2/users',
      responses: { 200: { description: 'V2' } },
    });

    const merged = mergeRouters({ users: route1 }, { users: route2 });

    expect(merged.routes.users.path).toBe('/v2/users');
  });
});
