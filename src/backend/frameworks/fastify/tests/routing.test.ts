import { describe, it, expect, beforeEach, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerFastifyRoutes } from '../routing';
import type { HttpRequest } from '../../../core/onion-layers/presentation/interfaces/types/http/http-request';
import type { HttpResponse } from '../../../core/onion-layers/presentation/interfaces/types/http/http-response';

/**
 * Mock request DTO that wraps HttpRequest for testing.
 */
interface MockRequestDto {
  data: HttpRequest;
}

/**
 * Mock response DTO that wraps HttpResponse for testing.
 */
interface MockResponseDto {
  data: HttpResponse;
}

/**
 * Creates a mock request DTO from HttpRequest.
 */
const createMockRequestDto = (httpRequest: HttpRequest): MockRequestDto => ({
  data: httpRequest,
});

/**
 * Creates a mock response DTO from HttpResponse.
 */
const createMockResponseDto = (httpResponse: HttpResponse): MockResponseDto => ({
  data: httpResponse,
});

/**
 * Request DTO factory for tests - wraps raw request in mock DTO.
 */
const mockRequestDtoFactory = (raw: unknown): MockRequestDto =>
  createMockRequestDto(raw as HttpRequest);

/**
 * Mock controller interface for tests.
 */
interface MockController {
  execute: (input: MockRequestDto) => Promise<MockResponseDto>;
}

describe('registerFastifyRoutes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify();
  });

  describe('route registration', () => {
    it('should register a single GET route', async () => {
      const controller: MockController = {
        execute: async () =>
          createMockResponseDto({
            statusCode: 200,
            body: { message: 'Hello' },
          }),
      };

      registerFastifyRoutes(app, {
        metadata: { path: '/hello', method: 'GET' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/hello',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ message: 'Hello' });
    });

    it('should register multiple routes', async () => {
      const listController: MockController = {
        execute: async () =>
          createMockResponseDto({
            statusCode: 200,
            body: [{ id: 1 }, { id: 2 }],
          }),
      };

      const getController: MockController = {
        execute: async (req: MockRequestDto) =>
          createMockResponseDto({
            statusCode: 200,
            body: { id: req.data.pathParams?.id },
          }),
      };

      registerFastifyRoutes(app, [
        {
          metadata: { path: '/users', method: 'GET' },
          controller: listController,
          requestDtoFactory: mockRequestDtoFactory,
        },
        {
          metadata: { path: '/users/{id}', method: 'GET' },
          controller: getController,
          requestDtoFactory: mockRequestDtoFactory,
        },
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
      const createController: MockController = {
        execute: async (req: MockRequestDto) =>
          createMockResponseDto({
            statusCode: 201,
            body: { id: 1, ...(req.data.body as object) },
          }),
      };

      registerFastifyRoutes(app, {
        metadata: { path: '/users', method: 'POST' },
        controller: createController,
        requestDtoFactory: mockRequestDtoFactory,
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
      const updateController: MockController = {
        execute: async (req: MockRequestDto) =>
          createMockResponseDto({
            statusCode: 200,
            body: { id: req.data.pathParams?.id, ...(req.data.body as object) },
          }),
      };

      registerFastifyRoutes(app, {
        metadata: { path: '/users/{id}', method: 'PUT' },
        controller: updateController,
        requestDtoFactory: mockRequestDtoFactory,
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
      const patchController: MockController = {
        execute: async () =>
          createMockResponseDto({
            statusCode: 200,
            body: { patched: true },
          }),
      };

      registerFastifyRoutes(app, {
        metadata: { path: '/users/{id}', method: 'PATCH' },
        controller: patchController,
        requestDtoFactory: mockRequestDtoFactory,
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
      const deleteController: MockController = {
        execute: async () =>
          createMockResponseDto({
            statusCode: 204,
            body: null,
          }),
      };

      registerFastifyRoutes(app, {
        metadata: { path: '/users/{id}', method: 'DELETE' },
        controller: deleteController,
        requestDtoFactory: mockRequestDtoFactory,
      });

      const res = await app.inject({
        method: 'DELETE',
        url: '/users/123',
      });

      expect(res.statusCode).toBe(204);
    });

    it('should register OPTIONS route', async () => {
      const optionsController: MockController = {
        execute: async () =>
          createMockResponseDto({
            statusCode: 200,
            body: null,
            headers: { Allow: 'GET, POST, PUT, DELETE' },
          }),
      };

      registerFastifyRoutes(app, {
        metadata: { path: '/users', method: 'OPTIONS' },
        controller: optionsController,
        requestDtoFactory: mockRequestDtoFactory,
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
      const controller: MockController = {
        execute: async (req: MockRequestDto) =>
          createMockResponseDto({
            statusCode: 200,
            body: {
              userId: req.data.pathParams?.userId,
              postId: req.data.pathParams?.postId,
            },
          }),
      };

      registerFastifyRoutes(app, {
        metadata: { path: '/users/{userId}/posts/{postId}', method: 'GET' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
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
      const controller: MockController = {
        execute: async (req: MockRequestDto) =>
          createMockResponseDto({
            statusCode: 200,
            body: { query: req.data.queryParams },
          }),
      };

      registerFastifyRoutes(app, {
        metadata: { path: '/search', method: 'GET' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
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
      const controller: MockController = {
        execute: async (req: MockRequestDto) =>
          createMockResponseDto({
            statusCode: 200,
            body: { query: req.data.queryParams },
          }),
      };

      registerFastifyRoutes(app, {
        metadata: { path: '/filter', method: 'GET' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
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
      const controller: MockController = {
        execute: async (req: MockRequestDto) =>
          createMockResponseDto({
            statusCode: 200,
            body: { auth: req.data.headers?.authorization },
          }),
      };

      registerFastifyRoutes(app, {
        metadata: { path: '/protected', method: 'GET' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
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
      const controller: MockController = {
        execute: async () =>
          createMockResponseDto({
            statusCode: 200,
            body: { ok: true },
            headers: {
              'X-Custom-Header': 'custom-value',
              'X-Request-Id': '12345',
            },
          }),
      };

      registerFastifyRoutes(app, {
        metadata: { path: '/headers', method: 'GET' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
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
      const controller: MockController = {
        execute: async () =>
          createMockResponseDto({
            statusCode: 200,
            body: { data: 'test' },
          }),
      };

      registerFastifyRoutes(app, {
        metadata: { path: '/json', method: 'GET' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
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
      const controller: MockController = {
        execute: async () =>
          createMockResponseDto({
            statusCode: 200,
            body: 'Hello, World!',
          }),
      };

      registerFastifyRoutes(app, {
        metadata: { path: '/text', method: 'GET' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/text',
      });

      expect(res.statusCode).toBe(200);
      expect(res.payload).toBe('Hello, World!');
    });

    it('should return empty body for null', async () => {
      const controller: MockController = {
        execute: async () =>
          createMockResponseDto({
            statusCode: 204,
            body: null,
          }),
      };

      registerFastifyRoutes(app, {
        metadata: { path: '/empty', method: 'DELETE' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
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
      const controller: MockController = {
        execute: async () =>
          createMockResponseDto({
            statusCode: 200,
            body: { prefixed: true },
          }),
      };

      registerFastifyRoutes(
        app,
        [
          {
            metadata: { path: '/users', method: 'GET' },
            controller,
            requestDtoFactory: mockRequestDtoFactory,
          },
          {
            metadata: { path: '/posts', method: 'GET' },
            controller,
            requestDtoFactory: mockRequestDtoFactory,
          },
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

      const controller: MockController = {
        execute: async () =>
          createMockResponseDto({
            statusCode: 200,
            body: { authenticated: true },
          }),
      };

      registerFastifyRoutes(
        app,
        {
          metadata: { path: '/protected', method: 'GET' },
          controller,
          requestDtoFactory: mockRequestDtoFactory,
        },
        { middlewares: [authMiddleware] },
      );

      const res = await app.inject({
        method: 'GET',
        url: '/protected',
      });

      expect(res.statusCode).toBe(200);
      expect(middlewareCalled).toHaveBeenCalled();
    });

    it('should allow middleware to modify request before controller', async () => {
      let middlewareExecuted = false;
      let authHeader: string | undefined;

      const authMiddleware = async (
        request: { headers: { authorization?: string } },
      ) => {
        middlewareExecuted = true;
        authHeader = request.headers.authorization;
      };

      const controller: MockController = {
        execute: async () =>
          createMockResponseDto({
            statusCode: 200,
            body: { secret: 'data', hasAuth: !!authHeader },
          }),
      };

      registerFastifyRoutes(
        app,
        {
          metadata: { path: '/secret', method: 'GET' },
          controller,
          requestDtoFactory: mockRequestDtoFactory,
        },
        { middlewares: [authMiddleware] },
      );

      const res = await app.inject({
        method: 'GET',
        url: '/secret',
        headers: { Authorization: 'Bearer token' },
      });

      expect(res.statusCode).toBe(200);
      expect(middlewareExecuted).toBe(true);
      expect(authHeader).toBe('Bearer token');
      expect(res.json()).toEqual({ secret: 'data', hasAuth: true });
    });
  });

  describe('controller execution', () => {
    it('should pass complete HttpRequest to controller via DTO', async () => {
      let receivedRequest: HttpRequest | null = null;

      const controller: MockController = {
        execute: async (req: MockRequestDto) => {
          receivedRequest = req.data;
          return createMockResponseDto({ statusCode: 200, body: null });
        },
      };

      registerFastifyRoutes(app, {
        metadata: { path: '/users/{id}', method: 'POST' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
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
