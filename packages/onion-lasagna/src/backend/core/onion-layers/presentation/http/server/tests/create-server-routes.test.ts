/**
 * @fileoverview Tests for createServerRoutes factory function.
 */

import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { createServerRoutes } from '../create-server-routes';
import { defineRoute } from '../../route/define-route';
import { defineRouter } from '../../route/define-router';
import { zodSchema } from '../../schema/adapters/zod.adapter';
import { InvalidRequestError } from '../../../exceptions/invalid-request.error';
import { ControllerError } from '../../../exceptions/controller.error';
import type { RawHttpRequest, HandlerContext, HandlerResponse, Middleware } from '../types';

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

const userIdParamsSchema = zodSchema(
  z.object({
    userId: z.string().uuid(),
  }),
);

const authHeadersSchema = zodSchema(
  z.object({
    authorization: z.string(),
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
  request: {
    params: { schema: userIdParamsSchema },
    headers: { schema: authHeadersSchema },
  },
  responses: {
    200: { description: 'Success' },
  },
});

const noSchemaRoute = defineRoute({
  method: 'GET',
  path: '/health',
  responses: {
    200: { description: 'Healthy' },
  },
});

describe('createServerRoutes', () => {
  describe('route collection', () => {
    it('creates routes from router definition', () => {
      const router = defineRouter({
        list: listUsersRoute,
        create: createUserRoute,
      });

      const routes = createServerRoutes(router, {
        list: {
          requestMapper: () => ({}),
          useCase: { execute: async () => [] },
          responseMapper: () => ({ status: 200, body: [] }),
        },
        create: {
          requestMapper: (req) => req.body,
          useCase: { execute: async () => ({ id: '123' }) },
          responseMapper: (out) => ({ status: 201, body: out }),
        },
      });

      expect(routes).toHaveLength(2);
      expect(routes[0]!.method).toBe('GET');
      expect(routes[0]!.path).toBe('/users');
      expect(routes[1]!.method).toBe('POST');
      expect(routes[1]!.path).toBe('/users');
    });

    it('creates routes from router config (without defineRouter)', () => {
      const routes = createServerRoutes(
        { list: listUsersRoute },
        {
          list: {
            requestMapper: () => ({}),
            useCase: { execute: async () => [] },
            responseMapper: () => ({ status: 200, body: [] }),
          },
        },
      );

      expect(routes).toHaveLength(1);
    });

    it('handles nested routes', () => {
      const router = defineRouter({
        users: {
          list: listUsersRoute,
          create: createUserRoute,
        },
      });

      const routes = createServerRoutes(router, {
        'users.list': {
          requestMapper: () => ({}),
          useCase: { execute: async () => [] },
          responseMapper: () => ({ status: 200, body: [] }),
        },
        'users.create': {
          requestMapper: (req) => req.body,
          useCase: { execute: async () => ({ id: '123' }) },
          responseMapper: (out) => ({ status: 201, body: out }),
        },
      });

      expect(routes).toHaveLength(2);
    });

    it('throws error for missing handler', () => {
      const router = defineRouter({
        list: listUsersRoute,
        create: createUserRoute,
      });

      expect(() =>
        createServerRoutes(router, {
          list: {
            requestMapper: () => ({}),
            useCase: { execute: async () => [] },
            responseMapper: () => ({ status: 200, body: [] }),
          },
          // Missing 'create' handler
        }),
      ).toThrow('Missing handler for route "create"');
    });
  });

  describe('route metadata', () => {
    it('includes route metadata in output', () => {
      const route = defineRoute({
        method: 'GET',
        path: '/users',
        responses: { 200: { description: 'Success' } },
        docs: {
          operationId: 'listUsers',
          summary: 'List users',
          description: 'Returns all users',
          tags: ['Users'],
          deprecated: false,
        },
      });

      const routes = createServerRoutes(
        { list: route },
        {
          list: {
            requestMapper: () => ({}),
            useCase: { execute: async () => [] },
            responseMapper: () => ({ status: 200, body: [] }),
          },
        },
      );

      expect(routes[0]!.metadata).toEqual({
        operationId: 'listUsers',
        summary: 'List users',
        description: 'Returns all users',
        tags: ['Users'],
        deprecated: false,
      });
    });

    it('normalizes path params format', () => {
      const route = defineRoute({
        method: 'GET',
        path: '/users/{userId}',
        responses: { 200: { description: 'Success' } },
      });

      const routes = createServerRoutes(
        { get: route },
        {
          get: {
            requestMapper: () => ({}),
            useCase: { execute: async () => ({}) },
            responseMapper: () => ({ status: 200, body: {} }),
          },
        },
      );

      // Brace params are converted to colon params
      expect(routes[0]!.path).toBe('/users/:userId');
    });
  });

  describe('request validation', () => {
    it('validates body schema', async () => {
      const routes = createServerRoutes(
        { create: createUserRoute },
        {
          create: {
            requestMapper: (req) => req.body,
            useCase: { execute: async (input) => ({ id: '123', ...input }) },
            responseMapper: (out) => ({ status: 201, body: out }),
          },
        },
      );

      const rawRequest: RawHttpRequest = {
        method: 'POST',
        url: '/users',
        headers: {},
        body: { name: 'John', email: 'invalid-email' }, // Invalid email
        query: {},
        params: {},
      };

      await expect(routes[0]!.handler(rawRequest)).rejects.toThrow(InvalidRequestError);
    });

    it('validates query schema with valid data', async () => {
      const routes = createServerRoutes(
        { list: listUsersRoute },
        {
          list: {
            requestMapper: (req) => req.query,
            useCase: { execute: async () => [] },
            responseMapper: () => ({ status: 200, body: [] }),
          },
        },
      );

      const rawRequest: RawHttpRequest = {
        method: 'GET',
        url: '/users',
        headers: {},
        body: null,
        query: { page: '2', limit: '25' },
        params: {},
      };

      const response = await routes[0]!.handler(rawRequest);
      expect(response.status).toBe(200);
    });

    it('validates query schema with coercion', async () => {
      let capturedQuery: unknown;

      const routes = createServerRoutes(
        { list: listUsersRoute },
        {
          list: {
            requestMapper: (req) => {
              capturedQuery = req.query;
              return {};
            },
            useCase: { execute: async () => [] },
            responseMapper: () => ({ status: 200, body: [] }),
          },
        },
      );

      const rawRequest: RawHttpRequest = {
        method: 'GET',
        url: '/users',
        headers: {},
        body: null,
        query: { page: '5' },
        params: {},
      };

      await routes[0]!.handler(rawRequest);

      // Zod coerces string "5" to number 5
      expect(capturedQuery).toEqual({ page: 5, limit: 10 }); // limit defaults to 10
    });

    it('validates path params schema', async () => {
      const routes = createServerRoutes(
        { get: getUserRoute },
        {
          get: {
            requestMapper: (req) => req.pathParams,
            useCase: { execute: async () => ({}) },
            responseMapper: () => ({ status: 200, body: {} }),
          },
        },
      );

      const rawRequest: RawHttpRequest = {
        method: 'GET',
        url: '/users/not-a-uuid',
        headers: { authorization: 'Bearer token' },
        body: null,
        query: {},
        params: { userId: 'not-a-uuid' },
      };

      await expect(routes[0]!.handler(rawRequest)).rejects.toThrow(InvalidRequestError);
    });

    it('validates headers schema', async () => {
      const routes = createServerRoutes(
        { get: getUserRoute },
        {
          get: {
            requestMapper: (req) => req.pathParams,
            useCase: { execute: async () => ({}) },
            responseMapper: () => ({ status: 200, body: {} }),
          },
        },
      );

      const rawRequest: RawHttpRequest = {
        method: 'GET',
        url: '/users/123e4567-e89b-12d3-a456-426614174000',
        headers: {}, // Missing authorization header
        body: null,
        query: {},
        params: { userId: '123e4567-e89b-12d3-a456-426614174000' },
      };

      await expect(routes[0]!.handler(rawRequest)).rejects.toThrow(InvalidRequestError);
    });

    it('includes validation errors in InvalidRequestError', async () => {
      const routes = createServerRoutes(
        { create: createUserRoute },
        {
          create: {
            requestMapper: (req) => req.body,
            useCase: { execute: async () => ({ id: '123' }) },
            responseMapper: (out) => ({ status: 201, body: out }),
          },
        },
      );

      const rawRequest: RawHttpRequest = {
        method: 'POST',
        url: '/users',
        headers: {},
        body: { name: '', email: 'bad' },
        query: {},
        params: {},
      };

      try {
        await routes[0]!.handler(rawRequest);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidRequestError);
        const err = error as InvalidRequestError;
        expect(err.validationErrors.length).toBeGreaterThan(0);
      }
    });

    it('skips validation when validateRequest is false', async () => {
      const routes = createServerRoutes(
        { create: createUserRoute },
        {
          create: {
            requestMapper: (req) => req.body,
            useCase: { execute: async () => ({ id: '123' }) },
            responseMapper: (out) => ({ status: 201, body: out }),
          },
        },
        { validateRequest: false },
      );

      const rawRequest: RawHttpRequest = {
        method: 'POST',
        url: '/users',
        headers: {},
        body: { invalid: 'data' }, // Invalid but validation skipped
        query: {},
        params: {},
      };

      const response = await routes[0]!.handler(rawRequest);
      expect(response.status).toBe(201);
    });
  });

  describe('response validation', () => {
    it('validates response body schema', async () => {
      const routes = createServerRoutes(
        { create: createUserRoute },
        {
          create: {
            requestMapper: (req) => req.body,
            useCase: { execute: async () => ({ invalid: 'response' }) }, // Wrong shape
            responseMapper: (out) => ({ status: 201, body: out }),
          },
        },
      );

      const rawRequest: RawHttpRequest = {
        method: 'POST',
        url: '/users',
        headers: {},
        body: { name: 'John', email: 'john@example.com' },
        query: {},
        params: {},
      };

      await expect(routes[0]!.handler(rawRequest)).rejects.toThrow(ControllerError);
    });

    it('skips validation when validateResponse is false', async () => {
      const routes = createServerRoutes(
        { create: createUserRoute },
        {
          create: {
            requestMapper: (req) => req.body,
            useCase: { execute: async () => ({ invalid: 'response' }) },
            responseMapper: (out) => ({ status: 201, body: out }),
          },
        },
        { validateResponse: false },
      );

      const rawRequest: RawHttpRequest = {
        method: 'POST',
        url: '/users',
        headers: {},
        body: { name: 'John', email: 'john@example.com' },
        query: {},
        params: {},
      };

      const response = await routes[0]!.handler(rawRequest);
      expect(response.body).toEqual({ invalid: 'response' });
    });

    it('skips validation when no schema for status code', async () => {
      const routes = createServerRoutes(
        { health: noSchemaRoute },
        {
          health: {
            requestMapper: () => ({}),
            useCase: { execute: async () => ({ status: 'ok' }) },
            responseMapper: () => ({ status: 200, body: { anything: 'works' } }),
          },
        },
      );

      const rawRequest: RawHttpRequest = {
        method: 'GET',
        url: '/health',
        headers: {},
        body: null,
        query: {},
        params: {},
      };

      const response = await routes[0]!.handler(rawRequest);
      expect(response.body).toEqual({ anything: 'works' });
    });
  });

  describe('status code validation', () => {
    it('throws for status below 100', async () => {
      const routes = createServerRoutes(
        { health: noSchemaRoute },
        {
          health: {
            requestMapper: () => ({}),
            useCase: { execute: async () => ({}) },
            responseMapper: () => ({ status: 99, body: {} }),
          },
        },
        { validateResponse: false },
      );

      const rawRequest: RawHttpRequest = {
        method: 'GET',
        url: '/health',
        headers: {},
        body: null,
        query: {},
        params: {},
      };

      await expect(routes[0]!.handler(rawRequest)).rejects.toThrow(ControllerError);
    });

    it('throws for status above 599', async () => {
      const routes = createServerRoutes(
        { health: noSchemaRoute },
        {
          health: {
            requestMapper: () => ({}),
            useCase: { execute: async () => ({}) },
            responseMapper: () => ({ status: 600, body: {} }),
          },
        },
        { validateResponse: false },
      );

      const rawRequest: RawHttpRequest = {
        method: 'GET',
        url: '/health',
        headers: {},
        body: null,
        query: {},
        params: {},
      };

      await expect(routes[0]!.handler(rawRequest)).rejects.toThrow(ControllerError);
    });

    it('throws for non-integer status', async () => {
      const routes = createServerRoutes(
        { health: noSchemaRoute },
        {
          health: {
            requestMapper: () => ({}),
            useCase: { execute: async () => ({}) },
            responseMapper: () => ({ status: 200.5, body: {} }),
          },
        },
        { validateResponse: false },
      );

      const rawRequest: RawHttpRequest = {
        method: 'GET',
        url: '/health',
        headers: {},
        body: null,
        query: {},
        params: {},
      };

      await expect(routes[0]!.handler(rawRequest)).rejects.toThrow(ControllerError);
    });

    it('accepts valid status codes', async () => {
      const validStatuses = [100, 200, 201, 301, 400, 404, 500, 599];

      for (const status of validStatuses) {
        const routes = createServerRoutes(
          { health: noSchemaRoute },
          {
            health: {
              requestMapper: () => ({}),
              useCase: { execute: async () => ({}) },
              responseMapper: () => ({ status, body: {} }),
            },
          },
          { validateResponse: false },
        );

        const rawRequest: RawHttpRequest = {
          method: 'GET',
          url: '/health',
          headers: {},
          body: null,
          query: {},
          params: {},
        };

        const response = await routes[0]!.handler(rawRequest);
        expect(response.status).toBe(status);
      }
    });
  });

  describe('handler pipeline', () => {
    it('passes validated data to requestMapper', async () => {
      const requestMapperSpy = vi.fn((req) => req.body);

      const routes = createServerRoutes(
        { create: createUserRoute },
        {
          create: {
            requestMapper: requestMapperSpy,
            useCase: { execute: async () => ({ id: '123' }) },
            responseMapper: (out) => ({ status: 201, body: out }),
          },
        },
      );

      const rawRequest: RawHttpRequest = {
        method: 'POST',
        url: '/users',
        headers: {},
        body: { name: 'John', email: 'john@example.com' },
        query: {},
        params: {},
      };

      await routes[0]!.handler(rawRequest);

      expect(requestMapperSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          body: { name: 'John', email: 'john@example.com' },
        }),
        expect.any(Object),
      );
    });

    it('passes use case output to responseMapper', async () => {
      const responseMapperSpy = vi.fn((out) => ({ status: 201, body: out }));
      const useCaseOutput = { id: '123' };

      const routes = createServerRoutes(
        { create: createUserRoute },
        {
          create: {
            requestMapper: (req) => req.body,
            useCase: { execute: async () => useCaseOutput },
            responseMapper: responseMapperSpy,
          },
        },
      );

      const rawRequest: RawHttpRequest = {
        method: 'POST',
        url: '/users',
        headers: {},
        body: { name: 'John', email: 'john@example.com' },
        query: {},
        params: {},
      };

      await routes[0]!.handler(rawRequest);

      expect(responseMapperSpy).toHaveBeenCalledWith(useCaseOutput);
    });

    it('propagates use case errors', async () => {
      const useCaseError = new Error('Use case failed');

      const routes = createServerRoutes(
        { create: createUserRoute },
        {
          create: {
            requestMapper: (req) => req.body,
            useCase: {
              execute: async () => {
                throw useCaseError;
              },
            },
            responseMapper: (out) => ({ status: 201, body: out }),
          },
        },
      );

      const rawRequest: RawHttpRequest = {
        method: 'POST',
        url: '/users',
        headers: {},
        body: { name: 'John', email: 'john@example.com' },
        query: {},
        params: {},
      };

      await expect(routes[0]!.handler(rawRequest)).rejects.toThrow('Use case failed');
    });
  });

  describe('middleware', () => {
    it('executes route-level middleware', async () => {
      const middlewareSpy = vi.fn(
        async (
          _req: RawHttpRequest,
          _ctx: HandlerContext,
          next: () => Promise<HandlerResponse>,
        ) => {
          return next();
        },
      );

      const routes = createServerRoutes(
        { health: noSchemaRoute },
        {
          health: {
            requestMapper: () => ({}),
            useCase: { execute: async () => ({}) },
            responseMapper: () => ({ status: 200, body: { ok: true } }),
            middleware: [middlewareSpy],
          },
        },
      );

      const rawRequest: RawHttpRequest = {
        method: 'GET',
        url: '/health',
        headers: {},
        body: null,
        query: {},
        params: {},
      };

      await routes[0]!.handler(rawRequest);

      expect(middlewareSpy).toHaveBeenCalled();
    });

    it('executes global middleware', async () => {
      const globalMiddleware = vi.fn(
        async (
          _req: RawHttpRequest,
          _ctx: HandlerContext,
          next: () => Promise<HandlerResponse>,
        ) => {
          return next();
        },
      );

      const routes = createServerRoutes(
        { health: noSchemaRoute },
        {
          health: {
            requestMapper: () => ({}),
            useCase: { execute: async () => ({}) },
            responseMapper: () => ({ status: 200, body: { ok: true } }),
          },
        },
        { middleware: [globalMiddleware] },
      );

      const rawRequest: RawHttpRequest = {
        method: 'GET',
        url: '/health',
        headers: {},
        body: null,
        query: {},
        params: {},
      };

      await routes[0]!.handler(rawRequest);

      expect(globalMiddleware).toHaveBeenCalled();
    });

    it('executes middleware in order: global then route', async () => {
      const order: string[] = [];

      const globalMiddleware: Middleware = async (_req, _ctx, next) => {
        order.push('global');
        return next();
      };

      const routeMiddleware: Middleware = async (_req, _ctx, next) => {
        order.push('route');
        return next();
      };

      const routes = createServerRoutes(
        { health: noSchemaRoute },
        {
          health: {
            requestMapper: () => ({}),
            useCase: { execute: async () => ({}) },
            responseMapper: () => ({ status: 200, body: {} }),
            middleware: [routeMiddleware],
          },
        },
        { middleware: [globalMiddleware] },
      );

      const rawRequest: RawHttpRequest = {
        method: 'GET',
        url: '/health',
        headers: {},
        body: null,
        query: {},
        params: {},
      };

      await routes[0]!.handler(rawRequest);

      expect(order).toEqual(['global', 'route']);
    });

    it('middleware can modify response', async () => {
      const modifyingMiddleware: Middleware = async (_req, _ctx, next) => {
        const response = await next();
        return {
          ...response,
          headers: { 'x-custom': 'header' },
        };
      };

      const routes = createServerRoutes(
        { health: noSchemaRoute },
        {
          health: {
            requestMapper: () => ({}),
            useCase: { execute: async () => ({}) },
            responseMapper: () => ({ status: 200, body: {} }),
            middleware: [modifyingMiddleware],
          },
        },
      );

      const rawRequest: RawHttpRequest = {
        method: 'GET',
        url: '/health',
        headers: {},
        body: null,
        query: {},
        params: {},
      };

      const response = await routes[0]!.handler(rawRequest);

      expect(response.headers).toEqual({ 'x-custom': 'header' });
    });

    it('middleware can short-circuit request', async () => {
      const shortCircuitMiddleware: Middleware = async () => {
        return { status: 401, body: { error: 'Unauthorized' } };
      };

      const useCaseSpy = vi.fn(async () => ({}));

      const routes = createServerRoutes(
        { health: noSchemaRoute },
        {
          health: {
            requestMapper: () => ({}),
            useCase: { execute: useCaseSpy },
            responseMapper: () => ({ status: 200, body: {} }),
            middleware: [shortCircuitMiddleware],
          },
        },
        { validateResponse: false },
      );

      const rawRequest: RawHttpRequest = {
        method: 'GET',
        url: '/health',
        headers: {},
        body: null,
        query: {},
        params: {},
      };

      const response = await routes[0]!.handler(rawRequest);

      expect(response.status).toBe(401);
      expect(useCaseSpy).not.toHaveBeenCalled();
    });
  });

  describe('context', () => {
    it('creates default context with requestId', async () => {
      let capturedContext: HandlerContext | undefined;

      const routes = createServerRoutes(
        { health: noSchemaRoute },
        {
          health: {
            requestMapper: (_, ctx) => {
              capturedContext = ctx;
              return {};
            },
            useCase: { execute: async () => ({}) },
            responseMapper: () => ({ status: 200, body: {} }),
          },
        },
      );

      const rawRequest: RawHttpRequest = {
        method: 'GET',
        url: '/health',
        headers: {},
        body: null,
        query: {},
        params: {},
      };

      await routes[0]!.handler(rawRequest);

      expect(capturedContext).toBeDefined();
      expect(capturedContext!.requestId).toMatch(/^req_/);
    });

    it('uses custom context creator', async () => {
      const customContext = { requestId: 'custom-123', userId: 'user-456' };

      const routes = createServerRoutes(
        { health: noSchemaRoute },
        {
          health: {
            requestMapper: (_, ctx) => ctx,
            useCase: { execute: async (input) => input },
            responseMapper: (out) => ({ status: 200, body: out }),
          },
        },
        {
          createContext: () => customContext,
          validateResponse: false,
        },
      );

      const rawRequest: RawHttpRequest = {
        method: 'GET',
        url: '/health',
        headers: {},
        body: null,
        query: {},
        params: {},
      };

      const response = await routes[0]!.handler(rawRequest);

      expect(response.body).toEqual(customContext);
    });

    it('passes existing context when provided', async () => {
      let capturedContext: HandlerContext | undefined;
      const existingContext = { requestId: 'existing-123' };

      const routes = createServerRoutes(
        { health: noSchemaRoute },
        {
          health: {
            requestMapper: (_, ctx) => {
              capturedContext = ctx;
              return {};
            },
            useCase: { execute: async () => ({}) },
            responseMapper: () => ({ status: 200, body: {} }),
          },
        },
      );

      const rawRequest: RawHttpRequest = {
        method: 'GET',
        url: '/health',
        headers: {},
        body: null,
        query: {},
        params: {},
      };

      await routes[0]!.handler(rawRequest, existingContext);

      expect(capturedContext).toEqual(existingContext);
    });
  });

  describe('normalization', () => {
    describe('query params', () => {
      it('normalizes array values to first element', async () => {
        let capturedQuery: unknown;

        const routes = createServerRoutes(
          { list: listUsersRoute },
          {
            list: {
              requestMapper: (req) => {
                capturedQuery = req.query;
                return {};
              },
              useCase: { execute: async () => [] },
              responseMapper: () => ({ status: 200, body: [] }),
            },
          },
          { validateRequest: false },
        );

        const rawRequest: RawHttpRequest = {
          method: 'GET',
          url: '/users',
          headers: {},
          body: null,
          query: { page: ['1', '2', '3'] },
          params: {},
        };

        await routes[0]!.handler(rawRequest);

        expect(capturedQuery).toEqual({ page: '1' });
      });

      it('allows empty string values', async () => {
        let capturedQuery: unknown;

        const routes = createServerRoutes(
          { list: listUsersRoute },
          {
            list: {
              requestMapper: (req) => {
                capturedQuery = req.query;
                return {};
              },
              useCase: { execute: async () => [] },
              responseMapper: () => ({ status: 200, body: [] }),
            },
          },
          { validateRequest: false },
        );

        const rawRequest: RawHttpRequest = {
          method: 'GET',
          url: '/users',
          headers: {},
          body: null,
          query: { flag: '' },
          params: {},
        };

        await routes[0]!.handler(rawRequest);

        expect(capturedQuery).toEqual({ flag: '' });
      });
    });

    describe('path params', () => {
      it('throws InvalidRequestError for empty path params', async () => {
        const routes = createServerRoutes(
          { health: noSchemaRoute },
          {
            health: {
              requestMapper: () => ({}),
              useCase: { execute: async () => ({}) },
              responseMapper: () => ({ status: 200, body: {} }),
            },
          },
          { validateRequest: false },
        );

        const rawRequest: RawHttpRequest = {
          method: 'GET',
          url: '/users/',
          headers: {},
          body: null,
          query: {},
          params: { id: '' },
        };

        await expect(routes[0]!.handler(rawRequest)).rejects.toThrow(InvalidRequestError);
      });

      it('converts non-string params to strings', async () => {
        let capturedParams: unknown;

        const routes = createServerRoutes(
          { health: noSchemaRoute },
          {
            health: {
              requestMapper: (req) => {
                capturedParams = req.pathParams;
                return {};
              },
              useCase: { execute: async () => ({}) },
              responseMapper: () => ({ status: 200, body: {} }),
            },
          },
          { validateRequest: false },
        );

        const rawRequest: RawHttpRequest = {
          method: 'GET',
          url: '/users/123',
          headers: {},
          body: null,
          query: {},
          // @ts-expect-error - testing runtime behavior with non-string
          params: { id: 123 },
        };

        await routes[0]!.handler(rawRequest);

        expect(capturedParams).toEqual({ id: '123' });
      });
    });

    describe('headers', () => {
      it('lowercases header keys', async () => {
        let capturedHeaders: unknown;

        const routes = createServerRoutes(
          { health: noSchemaRoute },
          {
            health: {
              requestMapper: (req) => {
                capturedHeaders = req.headers;
                return {};
              },
              useCase: { execute: async () => ({}) },
              responseMapper: () => ({ status: 200, body: {} }),
            },
          },
          { validateRequest: false },
        );

        const rawRequest: RawHttpRequest = {
          method: 'GET',
          url: '/health',
          headers: { 'Content-Type': 'application/json', 'X-Custom-Header': 'value' },
          body: null,
          query: {},
          params: {},
        };

        await routes[0]!.handler(rawRequest);

        expect(capturedHeaders).toEqual({
          'content-type': 'application/json',
          'x-custom-header': 'value',
        });
      });

      it('joins array headers with comma per RFC 7230', async () => {
        let capturedHeaders: unknown;

        const routes = createServerRoutes(
          { health: noSchemaRoute },
          {
            health: {
              requestMapper: (req) => {
                capturedHeaders = req.headers;
                return {};
              },
              useCase: { execute: async () => ({}) },
              responseMapper: () => ({ status: 200, body: {} }),
            },
          },
          { validateRequest: false },
        );

        const rawRequest: RawHttpRequest = {
          method: 'GET',
          url: '/health',
          headers: { accept: ['text/html', 'application/json'] },
          body: null,
          query: {},
          params: {},
        };

        await routes[0]!.handler(rawRequest);

        expect(capturedHeaders).toEqual({
          accept: 'text/html, application/json',
        });
      });
    });
  });

  describe('raw request data', () => {
    it('includes raw request data in validated request', async () => {
      let capturedRaw: unknown;

      const routes = createServerRoutes(
        { health: noSchemaRoute },
        {
          health: {
            requestMapper: (req) => {
              capturedRaw = req.raw;
              return {};
            },
            useCase: { execute: async () => ({}) },
            responseMapper: () => ({ status: 200, body: {} }),
          },
        },
      );

      const rawRequest: RawHttpRequest = {
        method: 'GET',
        url: '/health?foo=bar',
        headers: { 'X-Request-Id': '123' },
        body: null,
        query: { foo: 'bar' },
        params: {},
      };

      await routes[0]!.handler(rawRequest);

      expect(capturedRaw).toEqual({
        method: 'GET',
        url: '/health?foo=bar',
        headers: { 'x-request-id': '123' },
      });
    });
  });
});
