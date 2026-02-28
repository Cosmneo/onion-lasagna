/**
 * @fileoverview Integration tests for Elysia route registration.
 *
 * Tests the complete flow from unified routes to Elysia handlers
 * using Elysia's built-in app.handle() testing utility.
 */

import { describe, it, expect } from 'vitest';
import { Elysia } from 'elysia';
import type { UnifiedRouteInput } from '@cosmneo/onion-lasagna/http/server';
import { NotFoundError, UseCaseError } from '@cosmneo/onion-lasagna';
import { registerElysiaRoutes } from '../register-routes';
import { onionErrorHandler } from '../error-handler';

describe('Elysia register-routes', () => {
  describe('registerElysiaRoutes', () => {
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

    const app = new Elysia().onError(onionErrorHandler);
    registerElysiaRoutes(app, routes);

    it('handles GET requests with path params', async () => {
      const res = await app.handle(new Request('http://localhost/users/123'));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ id: '123', name: 'Test User' });
    });

    it('handles POST requests with body and custom status', async () => {
      const res = await app.handle(
        new Request('http://localhost/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'New User', email: 'test@example.com' }),
        }),
      );
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toEqual({
        id: '1',
        name: 'New User',
        email: 'test@example.com',
      });
    });

    it('handles DELETE requests with 204 No Content', async () => {
      const res = await app.handle(new Request('http://localhost/users/456', { method: 'DELETE' }));
      expect(res.status).toBe(204);
    });

    it('handles PATCH requests with custom response headers', async () => {
      const res = await app.handle(
        new Request('http://localhost/users/789', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Updated' }),
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ id: '789', name: 'Updated' });
      expect(res.headers.get('x-custom-header')).toBe('custom-value');
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

    const app = new Elysia().onError(onionErrorHandler);
    registerElysiaRoutes(app, routes, { prefix: '/api/v1' });

    it('prepends prefix to all routes', async () => {
      const res = await app.handle(new Request('http://localhost/api/v1/items'));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual([{ id: '1', name: 'Item 1' }]);
    });

    it('returns 404 for routes without prefix', async () => {
      const res = await app.handle(new Request('http://localhost/items'));
      expect(res.status).toBe(404);
    });
  });

  describe('contextExtractor option', () => {
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

    const app = new Elysia().onError(onionErrorHandler);
    registerElysiaRoutes(app, routes, {
      contextExtractor: (ctx) => ({
        requestId: ctx.headers['x-request-id'] as string,
      }),
    });

    it('passes extracted context to handlers', async () => {
      const res = await app.handle(
        new Request('http://localhost/profile', {
          headers: { 'x-request-id': 'req-123' },
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ requestId: 'req-123' });
    });
  });

  describe('error handling', () => {
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

    const app = new Elysia().onError(onionErrorHandler);
    registerElysiaRoutes(app, routes);

    it('maps NotFoundError to 404', async () => {
      const res = await app.handle(new Request('http://localhost/items/999'));
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.message).toBe('Item not found');
      expect(body.errorCode).toBe('ITEM_NOT_FOUND');
    });

    it('maps UseCaseError to 400', async () => {
      const res = await app.handle(
        new Request('http://localhost/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toBe('Validation failed');
      expect(body.errorCode).toBe('VALIDATION_ERROR');
    });
  });

  describe('query parameters', () => {
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

    const app = new Elysia().onError(onionErrorHandler);
    registerElysiaRoutes(app, routes);

    it('passes query parameters to handlers', async () => {
      const res = await app.handle(new Request('http://localhost/search?q=test&page=1'));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.query.q).toBe('test');
      expect(body.query.page).toBe('1');
    });
  });

  describe('PUT method', () => {
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

    const app = new Elysia().onError(onionErrorHandler);
    registerElysiaRoutes(app, routes);

    it('handles PUT requests', async () => {
      const res = await app.handle(
        new Request('http://localhost/users/42', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Replaced User' }),
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ id: '42', name: 'Replaced User', replaced: true });
    });
  });
});
