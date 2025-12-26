import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerFastifyRoutes, type HttpController } from '../routing';
import type { HttpRequest } from '../../../core/onion-layers/presentation/interfaces/types/http/http-request';

describe('registerFastifyRoutes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
  });

  describe('route registration', () => {
    it('should register a single GET route', async () => {
      const controller: HttpController = {
        execute: async () => ({
          statusCode: 200,
          body: { message: 'Hello' },
        }),
      };

      registerFastifyRoutes(app, {
        metadata: { servicePath: '/hello', method: 'GET' },
        controller,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/hello',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ message: 'Hello' });
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

      registerFastifyRoutes(app, [
        { metadata: { servicePath: '/users', method: 'GET' }, controller: listController },
        { metadata: { servicePath: '/users/{id}', method: 'GET' }, controller: getController },
      ]);

      const listRes = await app.inject({
        method: 'GET',
        url: '/users',
      });
      expect(listRes.statusCode).toBe(200);
      expect(listRes.json()).toEqual([{ id: 1 }, { id: 2 }]);

      const getRes = await app.inject({
        method: 'GET',
        url: '/users/123',
      });
      expect(getRes.statusCode).toBe(200);
      expect(getRes.json()).toEqual({ id: '123' });
    });

    it('should register POST route and handle body', async () => {
      const createController: HttpController = {
        execute: async (req: HttpRequest) => ({
          statusCode: 201,
          body: { id: 1, ...(req.body as object) },
        }),
      };

      registerFastifyRoutes(app, {
        metadata: { servicePath: '/users', method: 'POST' },
        controller: createController,
      });

      const res = await app.inject({
        method: 'POST',
        url: '/users',
        headers: { 'Content-Type': 'application/json' },
        payload: { name: 'John' },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json()).toEqual({ id: 1, name: 'John' });
    });

    it('should register PUT route', async () => {
      const updateController: HttpController = {
        execute: async (req: HttpRequest) => ({
          statusCode: 200,
          body: { id: req.pathParams?.id, ...(req.body as object) },
        }),
      };

      registerFastifyRoutes(app, {
        metadata: { servicePath: '/users/{id}', method: 'PUT' },
        controller: updateController,
      });

      const res = await app.inject({
        method: 'PUT',
        url: '/users/123',
        headers: { 'Content-Type': 'application/json' },
        payload: { name: 'Updated' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ id: '123', name: 'Updated' });
    });

    it('should register PATCH route', async () => {
      const patchController: HttpController = {
        execute: async () => ({
          statusCode: 200,
          body: { patched: true },
        }),
      };

      registerFastifyRoutes(app, {
        metadata: { servicePath: '/users/{id}', method: 'PATCH' },
        controller: patchController,
      });

      const res = await app.inject({
        method: 'PATCH',
        url: '/users/123',
        headers: { 'Content-Type': 'application/json' },
        payload: { name: 'Patched' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ patched: true });
    });

    it('should register DELETE route', async () => {
      const deleteController: HttpController = {
        execute: async () => ({
          statusCode: 204,
          body: null,
        }),
      };

      registerFastifyRoutes(app, {
        metadata: { servicePath: '/users/{id}', method: 'DELETE' },
        controller: deleteController,
      });

      const res = await app.inject({
        method: 'DELETE',
        url: '/users/123',
      });

      expect(res.statusCode).toBe(204);
    });

    it('should register OPTIONS route', async () => {
      const optionsController: HttpController = {
        execute: async () => ({
          statusCode: 200,
          body: null,
          headers: { Allow: 'GET, POST, PUT, DELETE' },
        }),
      };

      registerFastifyRoutes(app, {
        metadata: { servicePath: '/users', method: 'OPTIONS' },
        controller: optionsController,
      });

      const res = await app.inject({
        method: 'OPTIONS',
        url: '/users',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['allow']).toBe('GET, POST, PUT, DELETE');
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

      registerFastifyRoutes(app, {
        metadata: { servicePath: '/users/{userId}/posts/{postId}', method: 'GET' },
        controller,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/users/abc/posts/xyz',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ userId: 'abc', postId: 'xyz' });
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

      registerFastifyRoutes(app, {
        metadata: { servicePath: '/search', method: 'GET' },
        controller,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/search?q=test&limit=10',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        query: { q: 'test', limit: '10' },
      });
    });

    it('should extract multiple values for same query key', async () => {
      const controller: HttpController = {
        execute: async (req: HttpRequest) => ({
          statusCode: 200,
          body: { query: req.queryParams },
        }),
      };

      registerFastifyRoutes(app, {
        metadata: { servicePath: '/filter', method: 'GET' },
        controller,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/filter?tag=a&tag=b&tag=c',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({
        query: { tag: ['a', 'b', 'c'] },
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

      registerFastifyRoutes(app, {
        metadata: { servicePath: '/protected', method: 'GET' },
        controller,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: { Authorization: 'Bearer token123' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ auth: 'Bearer token123' });
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

      registerFastifyRoutes(app, {
        metadata: { servicePath: '/headers', method: 'GET' },
        controller,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/headers',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-custom-header']).toBe('custom-value');
      expect(res.headers['x-request-id']).toBe('12345');
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

      registerFastifyRoutes(app, {
        metadata: { servicePath: '/json', method: 'GET' },
        controller,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/json',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.json()).toEqual({ data: 'test' });
    });

    it('should return text for string body', async () => {
      const controller: HttpController = {
        execute: async () => ({
          statusCode: 200,
          body: 'Hello, World!',
        }),
      };

      registerFastifyRoutes(app, {
        metadata: { servicePath: '/text', method: 'GET' },
        controller,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/text',
      });

      expect(res.statusCode).toBe(200);
      expect(res.payload).toBe('Hello, World!');
    });

    it('should return empty body for null', async () => {
      const controller: HttpController = {
        execute: async () => ({
          statusCode: 204,
          body: null,
        }),
      };

      registerFastifyRoutes(app, {
        metadata: { servicePath: '/empty', method: 'DELETE' },
        controller,
      });

      const res = await app.inject({
        method: 'DELETE',
        url: '/empty',
      });

      expect(res.statusCode).toBe(204);
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

      registerFastifyRoutes(
        app,
        [
          { metadata: { servicePath: '/users', method: 'GET' }, controller },
          { metadata: { servicePath: '/posts', method: 'GET' }, controller },
        ],
        { prefix: '/api/v1' },
      );

      const usersRes = await app.inject({
        method: 'GET',
        url: '/api/v1/users',
      });
      expect(usersRes.statusCode).toBe(200);

      const postsRes = await app.inject({
        method: 'GET',
        url: '/api/v1/posts',
      });
      expect(postsRes.statusCode).toBe(200);

      // Without prefix should 404
      const wrongRes = await app.inject({
        method: 'GET',
        url: '/users',
      });
      expect(wrongRes.statusCode).toBe(404);
    });
  });

  describe('middleware option', () => {
    it('should apply middlewares to routes', async () => {
      const middlewareCalled = vi.fn();

      const authMiddleware = async () => {
        middlewareCalled();
      };

      const controller: HttpController = {
        execute: async () => ({
          statusCode: 200,
          body: { authenticated: true },
        }),
      };

      registerFastifyRoutes(
        app,
        { metadata: { servicePath: '/protected', method: 'GET' }, controller },
        { middlewares: [authMiddleware] },
      );

      const res = await app.inject({
        method: 'GET',
        url: '/protected',
      });

      expect(res.statusCode).toBe(200);
      expect(middlewareCalled).toHaveBeenCalled();
    });

    it('should allow middleware to short-circuit', async () => {
      const authMiddleware = async (request: { headers: { authorization?: string } }, reply: { status: (code: number) => { send: (data: unknown) => void } }) => {
        const auth = request.headers.authorization;
        if (!auth) {
          reply.status(401).send({ error: 'Unauthorized' });
        }
      };

      const controller: HttpController = {
        execute: async () => ({
          statusCode: 200,
          body: { secret: 'data' },
        }),
      };

      registerFastifyRoutes(
        app,
        { metadata: { servicePath: '/secret', method: 'GET' }, controller },
        { middlewares: [authMiddleware] },
      );

      // Without auth header
      const noAuthRes = await app.inject({
        method: 'GET',
        url: '/secret',
      });
      expect(noAuthRes.statusCode).toBe(401);
      expect(noAuthRes.json()).toEqual({ error: 'Unauthorized' });

      // With auth header
      const authRes = await app.inject({
        method: 'GET',
        url: '/secret',
        headers: { Authorization: 'Bearer token' },
      });
      expect(authRes.statusCode).toBe(200);
      expect(authRes.json()).toEqual({ secret: 'data' });
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

      registerFastifyRoutes(app, {
        metadata: { servicePath: '/users/{id}', method: 'POST' },
        controller,
      });

      await app.inject({
        method: 'POST',
        url: '/users/123?filter=active',
        headers: {
          'Content-Type': 'application/json',
          'X-Custom': 'value',
        },
        payload: { name: 'Test' },
      });

      expect(receivedRequest).not.toBeNull();
      const req = receivedRequest as unknown as HttpRequest;
      expect(req.pathParams).toEqual({ id: '123' });
      expect(req.queryParams).toEqual({ filter: 'active' });
      expect(req.body).toEqual({ name: 'Test' });
      expect(req.headers?.['x-custom']).toBe('value');
    });
  });
});
