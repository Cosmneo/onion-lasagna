import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Elysia } from 'elysia';
import { registerElysiaRoutes, type ElysiaContext } from '../routing';
import type { HttpRequest } from '../../../core/onion-layers/presentation/interfaces/types/http/http-request';
import type { HttpResponse } from '../../../core/onion-layers/presentation/interfaces/types/http/http-response';
import type { ContextualHttpRequest } from '../../../core/onion-layers/presentation/interfaces/types/http/contextual-http-request';

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

describe('registerElysiaRoutes', () => {
  let app: Elysia;

  beforeEach(() => {
    app = new Elysia();
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

      registerElysiaRoutes(app, {
        metadata: { path: '/hello', method: 'GET' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
      });

      const res = await app.handle(new Request('http://localhost/hello'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ message: 'Hello' });
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

      registerElysiaRoutes(app, [
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

      const listRes = await app.handle(new Request('http://localhost/users'));
      expect(listRes.status).toBe(200);
      expect(await listRes.json()).toEqual([{ id: 1 }, { id: 2 }]);

      const getRes = await app.handle(new Request('http://localhost/users/123'));
      expect(getRes.status).toBe(200);
      expect(await getRes.json()).toEqual({ id: '123' });
    });

    it('should register POST route and handle body', async () => {
      const createController: MockController = {
        execute: async (req: MockRequestDto) =>
          createMockResponseDto({
            statusCode: 201,
            body: { id: 1, ...(req.data.body as object) },
          }),
      };

      registerElysiaRoutes(app, {
        metadata: { path: '/users', method: 'POST' },
        controller: createController,
        requestDtoFactory: mockRequestDtoFactory,
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
      const updateController: MockController = {
        execute: async (req: MockRequestDto) =>
          createMockResponseDto({
            statusCode: 200,
            body: { id: req.data.pathParams?.id, ...(req.data.body as object) },
          }),
      };

      registerElysiaRoutes(app, {
        metadata: { path: '/users/{id}', method: 'PUT' },
        controller: updateController,
        requestDtoFactory: mockRequestDtoFactory,
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
      const patchController: MockController = {
        execute: async () =>
          createMockResponseDto({
            statusCode: 200,
            body: { patched: true },
          }),
      };

      registerElysiaRoutes(app, {
        metadata: { path: '/users/{id}', method: 'PATCH' },
        controller: patchController,
        requestDtoFactory: mockRequestDtoFactory,
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
      const deleteController: MockController = {
        execute: async () =>
          createMockResponseDto({
            statusCode: 204,
            body: null,
          }),
      };

      registerElysiaRoutes(app, {
        metadata: { path: '/users/{id}', method: 'DELETE' },
        controller: deleteController,
        requestDtoFactory: mockRequestDtoFactory,
      });

      const res = await app.handle(new Request('http://localhost/users/123', { method: 'DELETE' }));
      expect(res.status).toBe(204);
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

      registerElysiaRoutes(app, {
        metadata: { path: '/users', method: 'OPTIONS' },
        controller: optionsController,
        requestDtoFactory: mockRequestDtoFactory,
      });

      const res = await app.handle(new Request('http://localhost/users', { method: 'OPTIONS' }));
      expect(res.status).toBe(200);
      expect(res.headers.get('Allow')).toBe('GET, POST, PUT, DELETE');
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

      registerElysiaRoutes(app, {
        metadata: { path: '/users/{userId}/posts/{postId}', method: 'GET' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
      });

      const res = await app.handle(new Request('http://localhost/users/abc/posts/xyz'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ userId: 'abc', postId: 'xyz' });
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

      registerElysiaRoutes(app, {
        metadata: { path: '/search', method: 'GET' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
      });

      const res = await app.handle(new Request('http://localhost/search?q=test&limit=10'));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        query: { q: 'test', limit: '10' },
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

      registerElysiaRoutes(app, {
        metadata: { path: '/protected', method: 'GET' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
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

      registerElysiaRoutes(app, {
        metadata: { path: '/headers', method: 'GET' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
      });

      const res = await app.handle(new Request('http://localhost/headers'));
      expect(res.status).toBe(200);
      expect(res.headers.get('X-Custom-Header')).toBe('custom-value');
      expect(res.headers.get('X-Request-Id')).toBe('12345');
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

      registerElysiaRoutes(app, {
        metadata: { path: '/json', method: 'GET' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
      });

      const res = await app.handle(new Request('http://localhost/json'));
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('application/json');
      expect(await res.json()).toEqual({ data: 'test' });
    });

    it('should return text for string body', async () => {
      const controller: MockController = {
        execute: async () =>
          createMockResponseDto({
            statusCode: 200,
            body: 'Hello, World!',
          }),
      };

      registerElysiaRoutes(app, {
        metadata: { path: '/text', method: 'GET' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
      });

      const res = await app.handle(new Request('http://localhost/text'));
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/plain');
      expect(await res.text()).toBe('Hello, World!');
    });

    it('should return empty body for null', async () => {
      const controller: MockController = {
        execute: async () =>
          createMockResponseDto({
            statusCode: 204,
            body: null,
          }),
      };

      registerElysiaRoutes(app, {
        metadata: { path: '/empty', method: 'DELETE' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
      });

      const res = await app.handle(new Request('http://localhost/empty', { method: 'DELETE' }));
      expect(res.status).toBe(204);
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

      registerElysiaRoutes(
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

      const usersRes = await app.handle(new Request('http://localhost/api/v1/users'));
      expect(usersRes.status).toBe(200);

      const postsRes = await app.handle(new Request('http://localhost/api/v1/posts'));
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

      const controller: MockController = {
        execute: async () =>
          createMockResponseDto({
            statusCode: 200,
            body: { authenticated: true },
          }),
      };

      registerElysiaRoutes(
        app,
        {
          metadata: { path: '/protected', method: 'GET' },
          controller,
          requestDtoFactory: mockRequestDtoFactory,
        },
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

      const controller: MockController = {
        execute: async () =>
          createMockResponseDto({
            statusCode: 200,
            body: { secret: 'data' },
          }),
      };

      registerElysiaRoutes(
        app,
        {
          metadata: { path: '/secret', method: 'GET' },
          controller,
          requestDtoFactory: mockRequestDtoFactory,
        },
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
    it('should pass complete HttpRequest to controller via DTO', async () => {
      let receivedRequest: HttpRequest | null = null;

      const controller: MockController = {
        execute: async (req: MockRequestDto) => {
          receivedRequest = req.data;
          return createMockResponseDto({ statusCode: 200, body: null });
        },
      };

      registerElysiaRoutes(app, {
        metadata: { path: '/users/{id}', method: 'POST' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
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

  describe('contextExtractor option', () => {
    /**
     * Type for the execution context injected by middleware.
     */
    interface TestContext {
      userId: string;
      requestId: string;
      tenant: string;
    }

    /**
     * Mock request DTO that wraps ContextualHttpRequest for testing.
     */
    interface MockContextualRequestDto {
      data: ContextualHttpRequest<TestContext>;
    }

    /**
     * Creates a mock contextual request DTO from ContextualHttpRequest.
     */
    const createMockContextualRequestDto = (
      httpRequest: ContextualHttpRequest<TestContext>,
    ): MockContextualRequestDto => ({
      data: httpRequest,
    });

    /**
     * Request DTO factory for contextual requests.
     */
    const contextualRequestDtoFactory = (
      raw: ContextualHttpRequest<TestContext>,
    ): MockContextualRequestDto => createMockContextualRequestDto(raw);

    /**
     * Mock controller interface for contextual tests.
     */
    interface MockContextualController {
      execute: (input: MockContextualRequestDto) => Promise<MockResponseDto>;
    }

    it('should inject context from contextExtractor into request', async () => {
      const typedApp = new Elysia().state('testContext', null as TestContext | null);
      let receivedContext: TestContext | null = null;

      // Middleware that sets context in Elysia store
      const contextMiddleware = (context: ElysiaContext) => {
        context.store.testContext = {
          userId: 'user-123',
          requestId: 'req-456',
          tenant: 'acme-corp',
        };
        return undefined;
      };

      const controller: MockContextualController = {
        execute: async (req: MockContextualRequestDto) => {
          receivedContext = req.data.context;
          return createMockResponseDto({
            statusCode: 200,
            body: { contextReceived: true },
          });
        },
      };

      registerElysiaRoutes<TestContext>(
        typedApp,
        {
          metadata: { path: '/protected', method: 'GET' },
          controller,
          requestDtoFactory: contextualRequestDtoFactory,
        },
        {
          middlewares: [contextMiddleware],
          contextExtractor: (ctx) => ctx.store.testContext as TestContext,
        },
      );

      const res = await typedApp.handle(new Request('http://localhost/protected'));
      expect(res.status).toBe(200);
      expect(receivedContext).not.toBeNull();
      expect(receivedContext).toEqual({
        userId: 'user-123',
        requestId: 'req-456',
        tenant: 'acme-corp',
      });
    });

    it('should work with context extracted from headers', async () => {
      const typedApp = new Elysia().state('testContext', null as TestContext | null);
      let receivedContext: TestContext | null = null;

      // Middleware that extracts context from headers
      const headerMiddleware = (context: ElysiaContext) => {
        context.store.testContext = {
          userId: context.headers['x-user-id'] ?? 'anonymous',
          requestId: context.headers['x-request-id'] ?? 'unknown',
          tenant: context.headers['x-tenant'] ?? 'default',
        };
        return undefined;
      };

      const controller: MockContextualController = {
        execute: async (req: MockContextualRequestDto) => {
          receivedContext = req.data.context;
          return createMockResponseDto({
            statusCode: 200,
            body: { tenant: req.data.context.tenant },
          });
        },
      };

      registerElysiaRoutes<TestContext>(
        typedApp,
        {
          metadata: { path: '/tenant-route', method: 'GET' },
          controller,
          requestDtoFactory: contextualRequestDtoFactory,
        },
        {
          middlewares: [headerMiddleware],
          contextExtractor: (ctx) => ctx.store.testContext as TestContext,
        },
      );

      const res = await typedApp.handle(
        new Request('http://localhost/tenant-route', {
          headers: {
            'X-User-Id': 'user-789',
            'X-Request-Id': 'req-abc',
            'X-Tenant': 'custom-tenant',
          },
        }),
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ tenant: 'custom-tenant' });
      expect(receivedContext).toEqual({
        userId: 'user-789',
        requestId: 'req-abc',
        tenant: 'custom-tenant',
      });
    });

    it('should combine context with standard request data', async () => {
      const typedApp = new Elysia().state('testContext', null as TestContext | null);
      let receivedRequest: ContextualHttpRequest<TestContext> | null = null;

      const contextMiddleware = (context: ElysiaContext) => {
        context.store.testContext = {
          userId: 'user-xyz',
          requestId: 'req-xyz',
          tenant: 'test-tenant',
        };
        return undefined;
      };

      const controller: MockContextualController = {
        execute: async (req: MockContextualRequestDto) => {
          receivedRequest = req.data;
          return createMockResponseDto({
            statusCode: 200,
            body: { ok: true },
          });
        },
      };

      registerElysiaRoutes<TestContext>(
        typedApp,
        {
          metadata: { path: '/users/{id}', method: 'POST' },
          controller,
          requestDtoFactory: contextualRequestDtoFactory,
        },
        {
          middlewares: [contextMiddleware],
          contextExtractor: (ctx) => ctx.store.testContext as TestContext,
        },
      );

      await typedApp.handle(
        new Request('http://localhost/users/456?filter=active', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Custom': 'value',
          },
          body: JSON.stringify({ name: 'Test User' }),
        }),
      );

      expect(receivedRequest).not.toBeNull();
      const req = receivedRequest!;

      // Verify context is present
      expect(req.context).toEqual({
        userId: 'user-xyz',
        requestId: 'req-xyz',
        tenant: 'test-tenant',
      });

      // Verify standard request data is also present
      expect(req.pathParams).toEqual({ id: '456' });
      expect(req.queryParams).toEqual({ filter: 'active' });
      expect(req.body).toEqual({ name: 'Test User' });
      expect(req.headers?.['x-custom']).toBe('value');
    });

    it('should work without contextExtractor (plain HttpRequest)', async () => {
      let receivedRequest: HttpRequest | null = null;

      const controller: MockController = {
        execute: async (req: MockRequestDto) => {
          receivedRequest = req.data;
          return createMockResponseDto({
            statusCode: 200,
            body: { ok: true },
          });
        },
      };

      // Register without contextExtractor
      registerElysiaRoutes(app, {
        metadata: { path: '/public', method: 'GET' },
        controller,
        requestDtoFactory: mockRequestDtoFactory,
      });

      const res = await app.handle(new Request('http://localhost/public'));
      expect(res.status).toBe(200);
      expect(receivedRequest).not.toBeNull();
      expect((receivedRequest as Record<string, unknown>).context).toBeUndefined();
    });

    it('should support multiple routes with same contextExtractor', async () => {
      const typedApp = new Elysia().state('testContext', null as TestContext | null);
      const executedRoutes: string[] = [];

      const contextMiddleware = (context: ElysiaContext) => {
        context.store.testContext = {
          userId: 'user-multi',
          requestId: 'req-multi',
          tenant: 'multi-tenant',
        };
        return undefined;
      };

      const createController = (routeName: string): MockContextualController => ({
        execute: async (req: MockContextualRequestDto) => {
          executedRoutes.push(`${routeName}:${req.data.context.tenant}`);
          return createMockResponseDto({
            statusCode: 200,
            body: { route: routeName },
          });
        },
      });

      registerElysiaRoutes<TestContext>(
        typedApp,
        [
          {
            metadata: { path: '/route-a', method: 'GET' },
            controller: createController('a'),
            requestDtoFactory: contextualRequestDtoFactory,
          },
          {
            metadata: { path: '/route-b', method: 'GET' },
            controller: createController('b'),
            requestDtoFactory: contextualRequestDtoFactory,
          },
        ],
        {
          middlewares: [contextMiddleware],
          contextExtractor: (ctx) => ctx.store.testContext as TestContext,
        },
      );

      await typedApp.handle(new Request('http://localhost/route-a'));
      await typedApp.handle(new Request('http://localhost/route-b'));

      expect(executedRoutes).toEqual(['a:multi-tenant', 'b:multi-tenant']);
    });
  });
});
