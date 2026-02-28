/**
 * @fileoverview Tests for serverRoutes builder pattern.
 */

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { serverRoutes } from '../server-routes-builder';
import { defineRoute } from '../../route/define-route';
import { defineRouter } from '../../route/define-router';
import { zodSchema } from '../../__test-utils__/zod-schema';
import type { RawHttpRequest, HandlerContext, HandlerResponse } from '../types';

// Sample schemas
const userBodySchema = zodSchema(
  z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }),
);

const paginationSchema = zodSchema(
  z.object({
    page: z.coerce.number().default(1),
    limit: z.coerce.number().default(10),
  }),
);

const contextSchema = zodSchema(
  z.object({
    userId: z.string(),
    roles: z.array(z.string()),
  }),
);

// Sample routes
const listUsersRoute = defineRoute({
  method: 'GET',
  path: '/users',
  request: {
    query: { schema: paginationSchema },
  },
  responses: {
    200: {
      description: 'Success',
      schema: zodSchema(z.array(z.object({ id: z.string(), name: z.string() }))),
    },
  },
});

const createUserRoute = defineRoute({
  method: 'POST',
  path: '/users',
  request: {
    body: { schema: userBodySchema },
    context: { schema: contextSchema },
  },
  responses: {
    201: {
      description: 'Created',
      schema: zodSchema(z.object({ id: z.string() })),
    },
  },
});

const getUserRoute = defineRoute({
  method: 'GET',
  path: '/users/:userId',
  responses: {
    200: { description: 'Success' },
  },
});

describe('serverRoutes builder', () => {
  describe('basic functionality', () => {
    it('creates routes from builder pattern', () => {
      const router = defineRouter({
        list: listUsersRoute,
        create: createUserRoute,
      });

      const routes = serverRoutes(router)
        .handle('list', {
          requestMapper: () => ({}),
          useCase: { execute: async () => [] },
          responseMapper: () => ({ status: 200, body: [] }),
        })
        .handle('create', {
          requestMapper: (req) => req.body,
          useCase: { execute: async () => ({ id: '123' }) },
          responseMapper: (out) => ({ status: 201, body: out }),
        })
        .build();

      expect(routes).toHaveLength(2);
      expect(routes[0]!.method).toBe('GET');
      expect(routes[0]!.path).toBe('/users');
      expect(routes[1]!.method).toBe('POST');
      expect(routes[1]!.path).toBe('/users');
    });

    it('creates routes from router config (without defineRouter)', () => {
      const routes = serverRoutes({ list: listUsersRoute })
        .handle('list', {
          requestMapper: () => ({}),
          useCase: { execute: async () => [] },
          responseMapper: () => ({ status: 200, body: [] }),
        })
        .build();

      expect(routes).toHaveLength(1);
    });

    it('handles nested routes', () => {
      const router = defineRouter({
        users: {
          list: listUsersRoute,
          create: createUserRoute,
        },
      });

      const routes = serverRoutes(router)
        .handle('users.list', {
          requestMapper: () => ({}),
          useCase: { execute: async () => [] },
          responseMapper: () => ({ status: 200, body: [] }),
        })
        .handle('users.create', {
          requestMapper: (req) => req.body,
          useCase: { execute: async () => ({ id: '123' }) },
          responseMapper: (out) => ({ status: 201, body: out }),
        })
        .build();

      expect(routes).toHaveLength(2);
    });
  });

  describe('buildPartial', () => {
    it('allows building with partial handlers', () => {
      const router = defineRouter({
        list: listUsersRoute,
        create: createUserRoute,
        get: getUserRoute,
      });

      // Only handle some routes
      const routes = serverRoutes(router)
        .handle('list', {
          requestMapper: () => ({}),
          useCase: { execute: async () => [] },
          responseMapper: () => ({ status: 200, body: [] }),
        })
        .buildPartial();

      expect(routes).toHaveLength(1);
      expect(routes[0]!.method).toBe('GET');
    });

    it('skips routes without handlers silently', () => {
      const router = defineRouter({
        list: listUsersRoute,
        create: createUserRoute,
      });

      // Only handle 'list', skip 'create'
      const routes = serverRoutes(router)
        .handle('list', {
          requestMapper: () => ({}),
          useCase: { execute: async () => [] },
          responseMapper: () => ({ status: 200, body: [] }),
        })
        .buildPartial();

      expect(routes).toHaveLength(1);
    });
  });

  describe('handler execution', () => {
    it('passes validated request data to requestMapper', async () => {
      const requestMapperSpy = vi.fn((req) => req.body);

      const router = defineRouter({ create: createUserRoute });
      const routes = serverRoutes(router)
        .handle('create', {
          requestMapper: requestMapperSpy,
          useCase: { execute: async () => ({ id: '123' }) },
          responseMapper: (out) => ({ status: 201, body: out }),
        })
        .build();

      const rawRequest: RawHttpRequest = {
        method: 'POST',
        url: '/users',
        headers: {},
        body: { name: 'John', email: 'john@example.com' },
        query: {},
        params: {},
      };

      await routes[0]!.handler(rawRequest, { userId: 'user-1', roles: ['admin'] });

      expect(requestMapperSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { name: 'John', email: 'john@example.com' },
        }),
        expect.any(Object),
      );
    });

    it('passes typed context to requestMapper', async () => {
      let capturedContext: unknown;

      const router = defineRouter({ create: createUserRoute });
      const routes = serverRoutes(router)
        .handle('create', {
          requestMapper: (req, ctx) => {
            capturedContext = ctx;
            return req.body;
          },
          useCase: { execute: async () => ({ id: '123' }) },
          responseMapper: (out) => ({ status: 201, body: out }),
        })
        .build();

      const rawRequest: RawHttpRequest = {
        method: 'POST',
        url: '/users',
        headers: {},
        body: { name: 'John', email: 'john@example.com' },
        query: {},
        params: {},
      };

      const context = { userId: 'user-123', roles: ['admin', 'editor'] };
      await routes[0]!.handler(rawRequest, context);

      expect(capturedContext).toEqual(context);
    });

    it('passes use case output to responseMapper', async () => {
      const responseMapperSpy = vi.fn((out) => ({ status: 201, body: out }));
      const useCaseOutput = { id: '123' };

      const router = defineRouter({ create: createUserRoute });
      const routes = serverRoutes(router)
        .handle('create', {
          requestMapper: (req) => req.body,
          useCase: { execute: async () => useCaseOutput },
          responseMapper: responseMapperSpy,
        })
        .build();

      const rawRequest: RawHttpRequest = {
        method: 'POST',
        url: '/users',
        headers: {},
        body: { name: 'John', email: 'john@example.com' },
        query: {},
        params: {},
      };

      await routes[0]!.handler(rawRequest, { userId: 'user-1', roles: [] });

      expect(responseMapperSpy).toHaveBeenCalledWith(useCaseOutput);
    });
  });

  describe('immutability', () => {
    it('returns a new builder on each handle call', () => {
      const router = defineRouter({
        list: listUsersRoute,
        create: createUserRoute,
      });

      const builder1 = serverRoutes(router);
      const builder2 = builder1.handle('list', {
        requestMapper: () => ({}),
        useCase: { execute: async () => [] },
        responseMapper: () => ({ status: 200, body: [] }),
      });

      expect(builder1).not.toBe(builder2);
    });

    it('does not modify previous builders', () => {
      const router = defineRouter({
        list: listUsersRoute,
        create: createUserRoute,
      });

      const builder1 = serverRoutes(router).handle('list', {
        requestMapper: () => ({}),
        useCase: { execute: async () => [] },
        responseMapper: () => ({ status: 200, body: [] }),
      });

      // This should not affect builder1
      builder1.handle('create', {
        requestMapper: (req) => req.body,
        useCase: { execute: async () => ({ id: '123' }) },
        responseMapper: (out) => ({ status: 201, body: out }),
      });

      // builder1 should only have 'list'
      const routes = builder1.buildPartial();
      expect(routes).toHaveLength(1);
    });
  });

  describe('options', () => {
    it('passes options to build()', async () => {
      const router = defineRouter({ create: createUserRoute });
      const routes = serverRoutes(router)
        .handle('create', {
          requestMapper: (req) => req.body,
          useCase: { execute: async () => ({ invalid: 'response' }) },
          responseMapper: (out) => ({ status: 201, body: out }),
        })
        .build({ validateResponse: false });

      const rawRequest: RawHttpRequest = {
        method: 'POST',
        url: '/users',
        headers: {},
        body: { name: 'John', email: 'john@example.com' },
        query: {},
        params: {},
      };

      // Should not throw despite invalid response shape
      const response = await routes[0]!.handler(rawRequest, { userId: 'x', roles: [] });
      expect(response.body).toEqual({ invalid: 'response' });
    });

    it('applies middleware from options', async () => {
      const middlewareSpy = vi.fn(
        async (_req: unknown, _ctx: HandlerContext, next: () => Promise<HandlerResponse>) => {
          return next();
        },
      );

      const router = defineRouter({ list: listUsersRoute });
      const routes = serverRoutes(router)
        .handle('list', {
          requestMapper: () => ({}),
          useCase: { execute: async () => [] },
          responseMapper: () => ({ status: 200, body: [] }),
        })
        .build({ middleware: [middlewareSpy] });

      const rawRequest: RawHttpRequest = {
        method: 'GET',
        url: '/users',
        headers: {},
        body: null,
        query: {},
        params: {},
      };

      await routes[0]!.handler(rawRequest);

      expect(middlewareSpy).toHaveBeenCalled();
    });
  });

  describe('middleware', () => {
    it('executes handler-level middleware', async () => {
      const middlewareSpy = vi.fn(
        async (_req: unknown, _ctx: HandlerContext, next: () => Promise<HandlerResponse>) => {
          return next();
        },
      );

      const router = defineRouter({ list: listUsersRoute });
      const routes = serverRoutes(router)
        .handle('list', {
          requestMapper: () => ({}),
          useCase: { execute: async () => [] },
          responseMapper: () => ({ status: 200, body: [] }),
          middleware: [middlewareSpy],
        })
        .build();

      const rawRequest: RawHttpRequest = {
        method: 'GET',
        url: '/users',
        headers: {},
        body: null,
        query: {},
        params: {},
      };

      await routes[0]!.handler(rawRequest);

      expect(middlewareSpy).toHaveBeenCalled();
    });
  });
});
