/**
 * @fileoverview Integration tests for Fastify route registration.
 *
 * Tests the complete flow from unified routes to Fastify handlers
 * using Fastify's built-in app.inject() testing utility.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import type { UnifiedRouteInput } from '@cosmneo/onion-lasagna/http/server';
import { NotFoundError, UseCaseError } from '@cosmneo/onion-lasagna';
import { registerFastifyRoutes } from '../register-routes';
import { onionErrorHandler } from '../error-handler';

describe('Fastify register-routes', () => {
  describe('registerFastifyRoutes', () => {
    const routes: UnifiedRouteInput[] = [
      {
        method: 'GET',
        path: '/users/{id}',
        handler: async (req) => ({
          status: 200,
          body: { id: req.params?.id, name: 'Test User' },
        }),
        metadata: { operationId: 'getUser' },
      },
      {
        method: 'POST',
        path: '/users',
        handler: async (req) => ({
          status: 201,
          body: { id: '1', ...(req.body as object) },
        }),
        metadata: { operationId: 'createUser' },
      },
      {
        method: 'DELETE',
        path: '/users/{id}',
        handler: async () => ({
          status: 204,
        }),
        metadata: { operationId: 'deleteUser' },
      },
      {
        method: 'PATCH',
        path: '/users/{id}',
        handler: async (req) => ({
          status: 200,
          body: { id: req.params?.id, ...(req.body as object) },
          headers: { 'x-custom-header': 'custom-value' },
        }),
        metadata: { operationId: 'updateUser' },
      },
    ];

    let app: FastifyInstance;

    beforeAll(async () => {
      app = Fastify();
      app.setErrorHandler(onionErrorHandler);
      registerFastifyRoutes(app, routes);
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('handles GET requests with path params', async () => {
      const res = await app.inject({ method: 'GET', url: '/users/123' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ id: '123', name: 'Test User' });
    });

    it('handles POST requests with body and custom status', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/users',
        payload: { name: 'New User', email: 'test@example.com' },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json()).toEqual({
        id: '1',
        name: 'New User',
        email: 'test@example.com',
      });
    });

    it('handles DELETE requests with 204 No Content', async () => {
      const res = await app.inject({ method: 'DELETE', url: '/users/456' });
      expect(res.statusCode).toBe(204);
    });

    it('handles PATCH requests with custom response headers', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/users/789',
        payload: { name: 'Updated' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ id: '789', name: 'Updated' });
      expect(res.headers['x-custom-header']).toBe('custom-value');
    });
  });

  describe('prefix option', () => {
    const routes: UnifiedRouteInput[] = [
      {
        method: 'GET',
        path: '/items',
        handler: async () => ({
          status: 200,
          body: [{ id: '1', name: 'Item 1' }],
        }),
        metadata: { operationId: 'listItems' },
      },
    ];

    let app: FastifyInstance;

    beforeAll(async () => {
      app = Fastify();
      app.setErrorHandler(onionErrorHandler);
      registerFastifyRoutes(app, routes, { prefix: '/api/v1' });
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('prepends prefix to all routes', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/items' });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([{ id: '1', name: 'Item 1' }]);
    });

    it('returns 404 for routes without prefix', async () => {
      const res = await app.inject({ method: 'GET', url: '/items' });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('contextExtractor option', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      const routes: UnifiedRouteInput[] = [
        {
          method: 'GET',
          path: '/profile',
          handler: async (_req, ctx) => ({
            status: 200,
            body: { requestId: ctx?.requestId },
          }),
          metadata: { operationId: 'getProfile' },
        },
      ];

      app = Fastify();
      app.setErrorHandler(onionErrorHandler);
      registerFastifyRoutes(app, routes, {
        contextExtractor: (request) => ({
          requestId: request.headers['x-request-id'] as string,
        }),
      });
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('passes extracted context to handlers', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/profile',
        headers: { 'x-request-id': 'req-123' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ requestId: 'req-123' });
    });
  });

  describe('error handling', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      const routes: UnifiedRouteInput[] = [
        {
          method: 'GET',
          path: '/items/{id}',
          handler: async () => {
            throw new NotFoundError({ message: 'Item not found', code: 'ITEM_NOT_FOUND' });
          },
          metadata: { operationId: 'getItem' },
        },
        {
          method: 'POST',
          path: '/items',
          handler: async () => {
            throw new UseCaseError({ message: 'Validation failed', code: 'VALIDATION_ERROR' });
          },
          metadata: { operationId: 'createItem' },
        },
      ];

      app = Fastify();
      app.setErrorHandler(onionErrorHandler);
      registerFastifyRoutes(app, routes);
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('maps NotFoundError to 404', async () => {
      const res = await app.inject({ method: 'GET', url: '/items/999' });
      expect(res.statusCode).toBe(404);
      expect(res.json().message).toBe('Item not found');
      expect(res.json().errorCode).toBe('ITEM_NOT_FOUND');
    });

    it('maps UseCaseError to 400', async () => {
      const res = await app.inject({ method: 'POST', url: '/items', payload: {} });
      expect(res.statusCode).toBe(400);
      expect(res.json().message).toBe('Validation failed');
      expect(res.json().errorCode).toBe('VALIDATION_ERROR');
    });
  });

  describe('query parameters', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      const routes: UnifiedRouteInput[] = [
        {
          method: 'GET',
          path: '/search',
          handler: async (req) => ({
            status: 200,
            body: { query: req.query },
          }),
          metadata: { operationId: 'search' },
        },
      ];

      app = Fastify();
      app.setErrorHandler(onionErrorHandler);
      registerFastifyRoutes(app, routes);
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('passes query parameters to handlers', async () => {
      const res = await app.inject({ method: 'GET', url: '/search?q=test&page=1' });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.query.q).toBe('test');
      expect(body.query.page).toBe('1');
    });
  });

  describe('PUT method', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      const routes: UnifiedRouteInput[] = [
        {
          method: 'PUT',
          path: '/users/{id}',
          handler: async (req) => ({
            status: 200,
            body: { id: req.params?.id, ...(req.body as object), replaced: true },
          }),
          metadata: { operationId: 'replaceUser' },
        },
      ];

      app = Fastify();
      app.setErrorHandler(onionErrorHandler);
      registerFastifyRoutes(app, routes);
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('handles PUT requests', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: '/users/42',
        payload: { name: 'Replaced User' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ id: '42', name: 'Replaced User', replaced: true });
    });
  });
});
