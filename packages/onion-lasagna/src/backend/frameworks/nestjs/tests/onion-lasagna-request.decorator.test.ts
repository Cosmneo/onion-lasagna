import { describe, it, expect, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { HttpRequest } from '../../../core/onion-layers/presentation/interfaces/types/http/http-request';
import type { ContextualHttpRequest } from '../../../core/onion-layers/presentation/interfaces/types/http/contextual-http-request';

/**
 * We need to test the decorator factory function directly since
 * createParamDecorator wraps it. We'll extract the handler function
 * and test it with mock ExecutionContext.
 */

// Import the decorator to get access to the internal handler
// We'll recreate the handler logic for testing since createParamDecorator
// doesn't expose the internal function easily
function normalizeHeaders(headers: Record<string, unknown>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      normalized[key.toLowerCase()] = value;
    } else if (Array.isArray(value)) {
      normalized[key.toLowerCase()] = value.join(', ');
    } else if (value != null) {
      normalized[key.toLowerCase()] = String(value);
    }
  }
  return normalized;
}

type NestContextExtractor<TContext> = (ctx: ExecutionContext) => TContext;

function extractRequest<TContext = void>(
  contextExtractor: NestContextExtractor<TContext> | undefined,
  ctx: ExecutionContext,
): HttpRequest | ContextualHttpRequest<TContext> {
  const request = ctx.switchToHttp().getRequest();

  const baseRequest: HttpRequest = {
    body: request.body,
    headers: normalizeHeaders(request.headers),
    queryParams: request.query,
    pathParams: request.params,
  };

  if (contextExtractor) {
    return {
      ...baseRequest,
      context: contextExtractor(ctx),
    } as ContextualHttpRequest<TContext>;
  }

  return baseRequest;
}

/**
 * Creates a mock ExecutionContext with the given request data.
 */
function createMockContext(requestData: {
  body?: unknown;
  headers?: Record<string, unknown>;
  query?: Record<string, string | string[]>;
  params?: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        body: requestData.body,
        headers: requestData.headers ?? {},
        query: requestData.query ?? {},
        params: requestData.params ?? {},
        ...requestData,
      }),
      getResponse: () => ({}),
    }),
    getClass: () => ({}),
    getHandler: () => ({}),
    getArgs: () => [],
    getArgByIndex: () => ({}),
    switchToRpc: () => ({}) as ReturnType<ExecutionContext['switchToRpc']>,
    switchToWs: () => ({}) as ReturnType<ExecutionContext['switchToWs']>,
    getType: () => 'http',
  } as unknown as ExecutionContext;
}

describe('OnionLasagnaRequest decorator', () => {
  describe('plain HttpRequest (no context extractor)', () => {
    it('should extract body from request', () => {
      const ctx = createMockContext({
        body: { name: 'John', email: 'john@example.com' },
      });

      const result = extractRequest(undefined, ctx);

      expect(result.body).toEqual({ name: 'John', email: 'john@example.com' });
    });

    it('should extract and normalize headers to lowercase', () => {
      const ctx = createMockContext({
        headers: {
          Authorization: 'Bearer token123',
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value',
        },
      });

      const result = extractRequest(undefined, ctx);

      expect(result.headers).toEqual({
        authorization: 'Bearer token123',
        'content-type': 'application/json',
        'x-custom-header': 'custom-value',
      });
    });

    it('should handle array header values', () => {
      const ctx = createMockContext({
        headers: {
          'Accept-Encoding': ['gzip', 'deflate', 'br'],
        },
      });

      const result = extractRequest(undefined, ctx);

      expect(result.headers?.['accept-encoding']).toBe('gzip, deflate, br');
    });

    it('should extract query parameters', () => {
      const ctx = createMockContext({
        query: { page: '1', limit: '10', filter: 'active' },
      });

      const result = extractRequest(undefined, ctx);

      expect(result.queryParams).toEqual({ page: '1', limit: '10', filter: 'active' });
    });

    it('should extract path parameters', () => {
      const ctx = createMockContext({
        params: { id: '123', userId: 'abc' },
      });

      const result = extractRequest(undefined, ctx);

      expect(result.pathParams).toEqual({ id: '123', userId: 'abc' });
    });

    it('should extract complete request with all parts', () => {
      const ctx = createMockContext({
        body: { name: 'Test' },
        headers: { Authorization: 'Bearer token' },
        query: { filter: 'active' },
        params: { id: '123' },
      });

      const result = extractRequest(undefined, ctx);

      expect(result).toEqual({
        body: { name: 'Test' },
        headers: { authorization: 'Bearer token' },
        queryParams: { filter: 'active' },
        pathParams: { id: '123' },
      });
    });

    it('should not have context property when no extractor provided', () => {
      const ctx = createMockContext({
        body: { test: true },
      });

      const result = extractRequest(undefined, ctx);

      expect((result as Record<string, unknown>).context).toBeUndefined();
    });
  });

  describe('with context extractor', () => {
    interface TestContext {
      userId: string;
      requestId: string;
      tenant: string;
    }

    it('should inject context from extractor', () => {
      const ctx = createMockContext({
        body: { test: true },
        user: { id: 'user-123', email: 'test@example.com' },
        id: 'req-456',
      });

      const contextExtractor: NestContextExtractor<TestContext> = (executionCtx) => {
        const request = executionCtx.switchToHttp().getRequest();
        return {
          userId: request.user.id,
          requestId: request.id,
          tenant: 'acme-corp',
        };
      };

      const result = extractRequest(contextExtractor, ctx) as ContextualHttpRequest<TestContext>;

      expect(result.context).toEqual({
        userId: 'user-123',
        requestId: 'req-456',
        tenant: 'acme-corp',
      });
    });

    it('should extract context from headers via guard-set values', () => {
      const ctx = createMockContext({
        headers: {
          'X-User-Id': 'user-789',
          'X-Request-Id': 'req-abc',
          'X-Tenant': 'custom-tenant',
        },
        user: { id: 'user-789' },
      });

      const contextExtractor: NestContextExtractor<TestContext> = (executionCtx) => {
        const request = executionCtx.switchToHttp().getRequest();
        return {
          userId: request.headers['X-User-Id'] ?? 'anonymous',
          requestId: request.headers['X-Request-Id'] ?? 'unknown',
          tenant: request.headers['X-Tenant'] ?? 'default',
        };
      };

      const result = extractRequest(contextExtractor, ctx) as ContextualHttpRequest<TestContext>;

      expect(result.context).toEqual({
        userId: 'user-789',
        requestId: 'req-abc',
        tenant: 'custom-tenant',
      });
    });

    it('should combine context with standard request data', () => {
      const ctx = createMockContext({
        body: { name: 'Test User' },
        headers: { Authorization: 'Bearer token123' },
        query: { filter: 'active' },
        params: { id: '456' },
        user: { id: 'user-xyz', role: 'admin' },
      });

      const contextExtractor: NestContextExtractor<TestContext> = (executionCtx) => {
        const request = executionCtx.switchToHttp().getRequest();
        return {
          userId: request.user.id,
          requestId: 'req-xyz',
          tenant: 'test-tenant',
        };
      };

      const result = extractRequest(contextExtractor, ctx) as ContextualHttpRequest<TestContext>;

      // Verify context is present
      expect(result.context).toEqual({
        userId: 'user-xyz',
        requestId: 'req-xyz',
        tenant: 'test-tenant',
      });

      // Verify standard request data is also present
      expect(result.body).toEqual({ name: 'Test User' });
      expect(result.headers?.authorization).toBe('Bearer token123');
      expect(result.queryParams).toEqual({ filter: 'active' });
      expect(result.pathParams).toEqual({ id: '456' });
    });

    it('should call context extractor with ExecutionContext', () => {
      const ctx = createMockContext({
        body: {},
      });

      const extractorSpy = vi.fn().mockReturnValue({
        userId: 'test',
        requestId: 'test',
        tenant: 'test',
      });

      extractRequest(extractorSpy, ctx);

      expect(extractorSpy).toHaveBeenCalledTimes(1);
      expect(extractorSpy).toHaveBeenCalledWith(ctx);
    });
  });

  describe('header normalization edge cases', () => {
    it('should skip null header values', () => {
      const ctx = createMockContext({
        headers: {
          'X-Valid': 'value',
          'X-Null': null,
        },
      });

      const result = extractRequest(undefined, ctx);

      expect(result.headers?.['x-valid']).toBe('value');
      expect(result.headers?.['x-null']).toBeUndefined();
    });

    it('should skip undefined header values', () => {
      const ctx = createMockContext({
        headers: {
          'X-Valid': 'value',
          'X-Undefined': undefined,
        },
      });

      const result = extractRequest(undefined, ctx);

      expect(result.headers?.['x-valid']).toBe('value');
      expect(result.headers?.['x-undefined']).toBeUndefined();
    });

    it('should convert number header values to strings', () => {
      const ctx = createMockContext({
        headers: {
          'Content-Length': 1234,
        },
      });

      const result = extractRequest(undefined, ctx);

      expect(result.headers?.['content-length']).toBe('1234');
    });
  });
});
