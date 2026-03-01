/**
 * @fileoverview Tests for defineRouter factory function.
 */

import { describe, it, expect, expectTypeOf } from 'vitest';
import { z } from 'zod';
import { defineRouter, mergeRouters } from '../define-router';
import { defineRoute } from '../define-route';
import { zodSchema } from '../../__test-utils__/zod-schema';
import { collectRoutes } from '../types';

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
        { defaults: { tags: ['Users', 'Admin'] } },
      );

      expect(router.defaults?.tags).toEqual(['Users', 'Admin']);
    });

    it('sets both basePath and tags', () => {
      const router = defineRouter(
        {
          list: listUsersRoute,
        },
        {
          basePath: '/admin',
          defaults: { tags: ['Admin'] },
        },
      );

      expect(router.basePath).toBe('/admin');
      expect(router.defaults?.tags).toEqual(['Admin']);
    });

    it('has undefined options when not provided', () => {
      const router = defineRouter({
        list: listUsersRoute,
      });

      expect(router.basePath).toBeUndefined();
      expect(router.defaults).toBeUndefined();
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

// ============================================================================
// Variadic merge
// ============================================================================

describe('mergeRouters (variadic)', () => {
  const listCommentsRoute = defineRoute({
    method: 'GET',
    path: '/comments',
    responses: { 200: { description: 'Success' } },
  });

  it('merges 3 routers', () => {
    const merged = mergeRouters(
      { users: { list: listUsersRoute } },
      { posts: { list: listPostsRoute } },
      { comments: { list: listCommentsRoute } },
    );

    expect(merged.routes.users.list).toBeDefined();
    expect(merged.routes.posts.list).toBeDefined();
    expect(merged.routes.comments.list).toBeDefined();
    expect(merged._isRouter).toBe(true);
  });

  it('merges 7 routers (matches omninode use case)', () => {
    const merged = mergeRouters(
      { feedback: { list: listPostsRoute } },
      { users: { list: listUsersRoute } },
      { organizations: { list: listPostsRoute } },
      { services: { list: listPostsRoute } },
      { orchestrations: { list: listPostsRoute } },
      { acmp: { list: listPostsRoute } },
      { weclapp: { list: listPostsRoute } },
    );

    expect(Object.keys(merged.routes)).toHaveLength(7);
    expect(merged.routes.feedback.list).toBeDefined();
    expect(merged.routes.weclapp.list).toBeDefined();
  });

  it('merges mix of RouterDefinition and RouterConfig inputs', () => {
    const r1 = defineRouter({ users: { list: listUsersRoute } });
    const r2 = { posts: { list: listPostsRoute } } as const;
    const r3 = defineRouter({ comments: { list: listCommentsRoute } });

    const merged = mergeRouters(r1, r2, r3);

    expect(merged.routes.users.list).toBeDefined();
    expect(merged.routes.posts.list).toBeDefined();
    expect(merged.routes.comments.list).toBeDefined();
  });

  it('returns frozen result', () => {
    const merged = mergeRouters(
      { a: { list: listUsersRoute } },
      { b: { list: listPostsRoute } },
      { c: { list: listCommentsRoute } },
    );

    expect(Object.isFrozen(merged)).toBe(true);
  });
});

// ============================================================================
// Deep merge
// ============================================================================

describe('mergeRouters (deep merge)', () => {
  const getMeRoute = defineRoute({
    method: 'GET',
    path: '/users/me',
    responses: { 200: { description: 'Current user' } },
  });

  const listOrgsRoute = defineRoute({
    method: 'GET',
    path: '/users/me/organizations',
    responses: { 200: { description: 'My organizations' } },
  });

  const listFeedbacksRoute = defineRoute({
    method: 'GET',
    path: '/users/feedbacks',
    responses: { 200: { description: 'User feedbacks' } },
  });

  const listInvitesRoute = defineRoute({
    method: 'GET',
    path: '/users/me/invites',
    responses: { 200: { description: 'My invites' } },
  });

  it('deep-merges overlapping sub-routers', () => {
    const merged = mergeRouters(
      { users: { list: listUsersRoute, get: getUserRoute } },
      { users: { feedbacks: listFeedbacksRoute } },
    );

    // Both sides preserved
    expect(merged.routes.users.list).toBeDefined();
    expect(merged.routes.users.get).toBeDefined();
    expect(merged.routes.users.feedbacks).toBeDefined();
  });

  it('deep-merges nested sub-routers (users.me)', () => {
    const merged = mergeRouters(
      { users: { list: listUsersRoute, me: { get: getMeRoute } } },
      { users: { feedbacks: listFeedbacksRoute, me: { organizations: listOrgsRoute } } },
      { users: { me: { invites: listInvitesRoute } } },
    );

    // All three levels merged
    expect(merged.routes.users.list).toBeDefined();
    expect(merged.routes.users.feedbacks).toBeDefined();
    expect(merged.routes.users.me.get).toBeDefined();
    expect(merged.routes.users.me.organizations).toBeDefined();
    expect(merged.routes.users.me.invites).toBeDefined();
  });

  it('last route wins on same leaf key', () => {
    const routeV1 = defineRoute({
      method: 'GET',
      path: '/v1/users',
      responses: { 200: { description: 'V1' } },
    });
    const routeV2 = defineRoute({
      method: 'GET',
      path: '/v2/users',
      responses: { 200: { description: 'V2' } },
    });

    const merged = mergeRouters({ users: { list: routeV1 } }, { users: { list: routeV2 } });

    expect(merged.routes.users.list.path).toBe('/v2/users');
  });

  it('route replaces sub-router when B has a leaf', () => {
    const flatRoute = defineRoute({
      method: 'GET',
      path: '/users',
      responses: { 200: { description: 'Flat' } },
    });

    const merged = mergeRouters(
      { users: { list: listUsersRoute, get: getUserRoute } },
      { users: flatRoute },
    );

    // B wins — users is now a leaf route
    expect(merged.routes.users).toHaveProperty('path', '/users');
  });

  it('sub-router replaces route when B has a sub-router', () => {
    const flatRoute = defineRoute({
      method: 'GET',
      path: '/users',
      responses: { 200: { description: 'Flat' } },
    });

    const merged = mergeRouters(
      { users: flatRoute },
      { users: { list: listUsersRoute, get: getUserRoute } },
    );

    // B wins — users is now a sub-router
    expect(merged.routes.users).toHaveProperty('list');
    expect(merged.routes.users).toHaveProperty('get');
  });

  it('non-overlapping keys are preserved alongside deep-merged keys', () => {
    const merged = mergeRouters(
      { users: { list: listUsersRoute }, posts: { list: listPostsRoute } },
      { users: { get: getUserRoute }, comments: { list: listPostsRoute } },
    );

    expect(merged.routes.users.list).toBeDefined();
    expect(merged.routes.users.get).toBeDefined();
    expect(merged.routes.posts.list).toBeDefined();
    expect(merged.routes.comments.list).toBeDefined();
  });
});

// ============================================================================
// Type safety
// ============================================================================

describe('mergeRouters (type safety)', () => {
  it('merged routes work with collectRoutes()', () => {
    const merged = mergeRouters(
      { users: { list: listUsersRoute, get: getUserRoute } },
      { users: { create: createUserRoute } },
      { posts: { list: listPostsRoute } },
    );

    const routes = collectRoutes(merged.routes);

    const keys = routes.map((r) => r.key);
    expect(keys).toContain('users.list');
    expect(keys).toContain('users.get');
    expect(keys).toContain('users.create');
    expect(keys).toContain('posts.list');
  });

  it('preserves individual route types in merged result', () => {
    const merged = mergeRouters(
      { users: { list: listUsersRoute } },
      { posts: { list: listPostsRoute } },
    );

    expectTypeOf(merged.routes.users.list).toMatchTypeOf(listUsersRoute);
    expectTypeOf(merged.routes.posts.list).toMatchTypeOf(listPostsRoute);
  });
});
