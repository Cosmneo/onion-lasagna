import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Elysia } from 'elysia';
import { registerElysiaRoutes, type HttpController } from '../routing';
import type { HttpRequest } from '../../../core/onion-layers/presentation/interfaces/types/http/http-request';

describe('registerElysiaRoutes', () => {
  let app: Elysia;

  beforeEach(() => {
    app = new Elysia();
  });

  describe('route registration', () => {
    it('should register a single GET route', async () => {
      const controller: HttpController = {
        execute: async () => ({
          statusCode: 200,
          body: { message: 'Hello' },
        }),
      };

      registerElysiaRoutes(app, {
        metadata: { servicePath: '/hello', method: 'GET' },
        controller,
      });

      const res = await app.handle(new Request('http://localhost/hello'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ message: 'Hello' });
    });

    it('should register multiple routes', async () => {
      const listController: HttpController = {
        execute: async () => ({
          statusCode: 200,
          body: [{ id: 1 }, { id: 2 }],
        }),
      };

      const getController: HttpController = {
        execute: async (req: HttpRequest) => ({
          statusCode: 200,
          body: { id: req.pathParams?.id },
        }),
      };

      registerElysiaRoutes(app, [
        { metadata: { servicePath: '/users', method: 'GET' }, controller: listController },
        { metadata: { servicePath: '/users/{id}', method: 'GET' }, controller: getController },
      ]);

      const listRes = await app.handle(new Request('http://localhost/users'));
      expect(listRes.status).toBe(200);
      expect(await listRes.json()).toEqual([{ id: 1 }, { id: 2 }]);

      const getRes = await app.handle(new Request('http://localhost/users/123'));
      expect(getRes.status).toBe(200);
      expect(await getRes.json()).toEqual({ id: '123' });
    });

    it('should register POST route and handle body', async () => {
      const createController: HttpController = {
        execute: async (req: HttpRequest) => ({
          statusCode: 201,
          body: { id: 1, ...(req.body as object) },
        }),
      };

      registerElysiaRoutes(app, {
        metadata: { servicePath: '/users', method: 'POST' },
        controller: createController,
      });

      const res = await app.handle(
        new Request('http://localhost/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'John' }),
        }),
      );

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ id: 1, name: 'John' });
    });

    it('should register PUT route', async () => {
      const updateController: HttpController = {
        execute: async (req: HttpRequest) => ({
          statusCode: 200,
          body: { id: req.pathParams?.id, ...(req.body as object) },
        }),
      };

      registerElysiaRoutes(app, {
        metadata: { servicePath: '/users/{id}', method: 'PUT' },
        controller: updateController,
      });

      const res = await app.handle(
        new Request('http://localhost/users/123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Updated' }),
        }),
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ id: '123', name: 'Updated' });
    });

    it('should register PATCH route', async () => {
      const patchController: HttpController = {
        execute: async () => ({
          statusCode: 200,
          body: { patched: true },
        }),
      };

      registerElysiaRoutes(app, {
        metadata: { servicePath: '/users/{id}', method: 'PATCH' },
        controller: patchController,
      });

      const res = await app.handle(
        new Request('http://localhost/users/123', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Patched' }),
        }),
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ patched: true });
    });

    it('should register DELETE route', async () => {
      const deleteController: HttpController = {
        execute: async () => ({
          statusCode: 204,
          body: null,
        }),
      };

      registerElysiaRoutes(app, {
        metadata: { servicePath: '/users/{id}', method: 'DELETE' },
        controller: deleteController,
      });

      const res = await app.handle(
        new Request('http://localhost/users/123', { method: 'DELETE' }),
      );
      expect(res.status).toBe(204);
    });

    it('should register OPTIONS route', async () => {
      const optionsController: HttpController = {
        execute: async () => ({
          statusCode: 200,
          body: null,
          headers: { Allow: 'GET, POST, PUT, DELETE' },
        }),
      };

      registerElysiaRoutes(app, {
        metadata: { servicePath: '/users', method: 'OPTIONS' },
        controller: optionsController,
      });

      const res = await app.handle(
        new Request('http://localhost/users', { method: 'OPTIONS' }),
      );
      expect(res.status).toBe(200);
      expect(res.headers.get('Allow')).toBe('GET, POST, PUT, DELETE');
    });
  });

  describe('path parameter conversion', () => {
    it('should convert {param} to :param format', async () => {
      const controller: HttpController = {
        execute: async (req: HttpRequest) => ({
          statusCode: 200,
          body: {
            userId: req.pathParams?.userId,
            postId: req.pathParams?.postId,
          },
        }),
      };

      registerElysiaRoutes(app, {
        metadata: { servicePath: '/users/{userId}/posts/{postId}', method: 'GET' },
        controller,
      });

      const res = await app.handle(
        new Request('http://localhost/users/abc/posts/xyz'),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ userId: 'abc', postId: 'xyz' });
    });
  });

  describe('query parameters', () => {
    it('should extract single query parameters', async () => {
      const controller: HttpController = {
        execute: async (req: HttpRequest) => ({
          statusCode: 200,
          body: { query: req.queryParams },
        }),
      };

      registerElysiaRoutes(app, {
        metadata: { servicePath: '/search', method: 'GET' },
        controller,
      });

      const res = await app.handle(
        new Request('http://localhost/search?q=test&limit=10'),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        query: { q: 'test', limit: '10' },
      });
    });
  });

  describe('headers', () => {
    it('should extract request headers in lowercase', async () => {
      const controller: HttpController = {
        execute: async (req: HttpRequest) => ({
          statusCode: 200,
          body: { auth: req.headers?.authorization },
        }),
      };

      registerElysiaRoutes(app, {
        metadata: { servicePath: '/protected', method: 'GET' },
        controller,
      });

      const res = await app.handle(
        new Request('http://localhost/protected', {
          headers: { Authorization: 'Bearer token123' },
        }),
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ auth: 'Bearer token123' });
    });

    it('should set response headers', async () => {
      const controller: HttpController = {
        execute: async () => ({
          statusCode: 200,
          body: { ok: true },
          headers: {
            'X-Custom-Header': 'custom-value',
            'X-Request-Id': '12345',
          },
        }),
      };

      registerElysiaRoutes(app, {
        metadata: { servicePath: '/headers', method: 'GET' },
        controller,
      });

      const res = await app.handle(new Request('http://localhost/headers'));
      expect(res.status).toBe(200);
      expect(res.headers.get('X-Custom-Header')).toBe('custom-value');
      expect(res.headers.get('X-Request-Id')).toBe('12345');
    });
  });

  describe('response body types', () => {
    it('should return JSON for object body', async () => {
      const controller: HttpController = {
        execute: async () => ({
          statusCode: 200,
          body: { data: 'test' },
        }),
      };

      registerElysiaRoutes(app, {
        metadata: { servicePath: '/json', method: 'GET' },
        controller,
      });

      const res = await app.handle(new Request('http://localhost/json'));
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('application/json');
      expect(await res.json()).toEqual({ data: 'test' });
    });

    it('should return text for string body', async () => {
      const controller: HttpController = {
        execute: async () => ({
          statusCode: 200,
          body: 'Hello, World!',
        }),
      };

      registerElysiaRoutes(app, {
        metadata: { servicePath: '/text', method: 'GET' },
        controller,
      });

      const res = await app.handle(new Request('http://localhost/text'));
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/plain');
      expect(await res.text()).toBe('Hello, World!');
    });

    it('should return empty body for null', async () => {
      const controller: HttpController = {
        execute: async () => ({
          statusCode: 204,
          body: null,
        }),
      };

      registerElysiaRoutes(app, {
        metadata: { servicePath: '/empty', method: 'DELETE' },
        controller,
      });

      const res = await app.handle(
        new Request('http://localhost/empty', { method: 'DELETE' }),
      );
      expect(res.status).toBe(204);
    });
  });

  describe('prefix option', () => {
    it('should apply prefix to all routes', async () => {
      const controller: HttpController = {
        execute: async () => ({
          statusCode: 200,
          body: { prefixed: true },
        }),
      };

      registerElysiaRoutes(
        app,
        [
          { metadata: { servicePath: '/users', method: 'GET' }, controller },
          { metadata: { servicePath: '/posts', method: 'GET' }, controller },
        ],
        { prefix: '/api/v1' },
      );

      const usersRes = await app.handle(
        new Request('http://localhost/api/v1/users'),
      );
      expect(usersRes.status).toBe(200);

      const postsRes = await app.handle(
        new Request('http://localhost/api/v1/posts'),
      );
      expect(postsRes.status).toBe(200);

      // Without prefix should 404
      const wrongRes = await app.handle(new Request('http://localhost/users'));
      expect(wrongRes.status).toBe(404);
    });
  });

  describe('middleware option', () => {
    it('should apply middlewares to routes', async () => {
      const middlewareCalled = vi.fn();

      const authMiddleware = () => {
        middlewareCalled();
        return undefined;
      };

      const controller: HttpController = {
        execute: async () => ({
          statusCode: 200,
          body: { authenticated: true },
        }),
      };

      registerElysiaRoutes(
        app,
        { metadata: { servicePath: '/protected', method: 'GET' }, controller },
        { middlewares: [authMiddleware] },
      );

      const res = await app.handle(new Request('http://localhost/protected'));
      expect(res.status).toBe(200);
      expect(middlewareCalled).toHaveBeenCalled();
    });

    it('should allow middleware to short-circuit', async () => {
      const authMiddleware = (context: { headers: Record<string, string | undefined> }) => {
        const auth = context.headers.authorization;
        if (!auth) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return undefined;
      };

      const controller: HttpController = {
        execute: async () => ({
          statusCode: 200,
          body: { secret: 'data' },
        }),
      };

      registerElysiaRoutes(
        app,
        { metadata: { servicePath: '/secret', method: 'GET' }, controller },
        { middlewares: [authMiddleware] },
      );

      // Without auth header
      const noAuthRes = await app.handle(new Request('http://localhost/secret'));
      expect(noAuthRes.status).toBe(401);
      expect(await noAuthRes.json()).toEqual({ error: 'Unauthorized' });

      // With auth header
      const authRes = await app.handle(
        new Request('http://localhost/secret', {
          headers: { Authorization: 'Bearer token' },
        }),
      );
      expect(authRes.status).toBe(200);
      expect(await authRes.json()).toEqual({ secret: 'data' });
    });
  });

  describe('controller execution', () => {
    it('should pass complete HttpRequest to controller', async () => {
      let receivedRequest: HttpRequest | null = null;

      const controller: HttpController = {
        execute: async (req: HttpRequest) => {
          receivedRequest = req;
          return { statusCode: 200, body: null };
        },
      };

      registerElysiaRoutes(app, {
        metadata: { servicePath: '/users/{id}', method: 'POST' },
        controller,
      });

      await app.handle(
        new Request('http://localhost/users/123?filter=active', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Custom': 'value',
          },
          body: JSON.stringify({ name: 'Test' }),
        }),
      );

      expect(receivedRequest).not.toBeNull();
      const req = receivedRequest as unknown as HttpRequest;
      expect(req.pathParams).toEqual({ id: '123' });
      expect(req.queryParams).toEqual({ filter: 'active' });
      expect(req.body).toEqual({ name: 'Test' });
      expect(req.headers?.['x-custom']).toBe('value');
    });
  });
});
