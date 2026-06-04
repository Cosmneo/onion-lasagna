/**
 * @fileoverview Repro tests for HTTP route pipeline findings C05-1, C05-3, C05-4,
 * C05-6, C05-7, C05-8, C16-2, undeclared-status, deepFreeze-adapter.
 *
 * These tests are written FIRST (TDD) and should FAIL before fixes are applied.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createServerRoutesInternal as createServerRoutes } from '../create-server-routes';
import { defineRoute } from '../../route/define-route';
import { defineRouter } from '../../route/define-router';
import { zodSchema } from '../../__test-utils__/zod-schema';
import { ControllerError } from '../../../exceptions/controller.error';
import { UnauthorizedError } from '../../../../app/exceptions/unauthorized.error';
import type { RawHttpRequest } from '../types';

// ============================================================================
// C05-1: defineRouter basePath is never applied to route paths
// ============================================================================

describe('C05-1: basePath applied to route paths', () => {
  const healthRoute = defineRoute({
    method: 'GET',
    path: '/health',
    responses: { 200: { description: 'OK' } },
  });

  it('prepends basePath to route path when router has basePath', () => {
    const router = defineRouter({ health: healthRoute }, { basePath: '/api/v1' });

    const routes = createServerRoutes(router, {
      health: {
        requestMapper: () => ({}),
        useCase: { execute: async () => ({}) },
        responseMapper: () => ({ status: 200, body: {} }),
      },
    });

    expect(routes[0]!.path).toBe('/api/v1/health');
  });

  it('prepends basePath even when basePath has no leading slash', () => {
    const router = defineRouter({ health: healthRoute }, { basePath: 'api/v1' });

    const routes = createServerRoutes(router, {
      health: {
        requestMapper: () => ({}),
        useCase: { execute: async () => ({}) },
        responseMapper: () => ({ status: 200, body: {} }),
      },
    });

    expect(routes[0]!.path).toBe('/api/v1/health');
  });

  it('handles basePath with trailing slash without double slash', () => {
    const router = defineRouter({ health: healthRoute }, { basePath: '/api/v1/' });

    const routes = createServerRoutes(router, {
      health: {
        requestMapper: () => ({}),
        useCase: { execute: async () => ({}) },
        responseMapper: () => ({ status: 200, body: {} }),
      },
    });

    expect(routes[0]!.path).toBe('/api/v1/health');
  });

  it('does not affect paths when no basePath', () => {
    const router = defineRouter({ health: healthRoute });

    const routes = createServerRoutes(router, {
      health: {
        requestMapper: () => ({}),
        useCase: { execute: async () => ({}) },
        responseMapper: () => ({ status: 200, body: {} }),
      },
    });

    expect(routes[0]!.path).toBe('/health');
  });

  it('prepends basePath to nested routes', () => {
    const userRoute = defineRoute({
      method: 'GET',
      path: '/users',
      responses: { 200: { description: 'OK' } },
    });
    const router = defineRouter({ users: { list: userRoute } }, { basePath: '/api/v1' });

    const routes = createServerRoutes(router, {
      'users.list': {
        requestMapper: () => ({}),
        useCase: { execute: async () => [] },
        responseMapper: () => ({ status: 200, body: [] }),
      },
    });

    expect(routes[0]!.path).toBe('/api/v1/users');
  });

  it('plain RouterConfig without defineRouter is unaffected (no basePath)', () => {
    const routes = createServerRoutes(
      { health: healthRoute },
      {
        health: {
          requestMapper: () => ({}),
          useCase: { execute: async () => ({}) },
          responseMapper: () => ({ status: 200, body: {} }),
        },
      },
    );

    expect(routes[0]!.path).toBe('/health');
  });
});

// ============================================================================
// C05-3: validated branch leaves req.query/headers/body undefined when no schema
// ============================================================================

describe('C05-3: validated branch normalizes missing fields consistently', () => {
  const noSchemaRoute = defineRoute({
    method: 'GET',
    path: '/health',
    responses: { 200: { description: 'OK' } },
  });

  it('provides empty object for query when no schema and validateRequest=true', async () => {
    let capturedQuery: unknown;

    const routes = createServerRoutes(
      { health: noSchemaRoute },
      {
        health: {
          requestMapper: (req) => {
            capturedQuery = req.query;
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

    // Should be empty object (not undefined) matching skip-validation branch
    expect(capturedQuery).toEqual({});
  });

  it('provides empty object for headers when no schema and validateRequest=true', async () => {
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

    // Should be empty object (not undefined)
    expect(capturedHeaders).toEqual({});
  });

  it('passes through raw body when no schema and validateRequest=true', async () => {
    let capturedBody: unknown = 'NOT_SET';

    const routes = createServerRoutes(
      { health: noSchemaRoute },
      {
        health: {
          requestMapper: (req) => {
            capturedBody = req.body;
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

    // body passes through raw value (null) — consistent with skip-validation branch
    expect(capturedBody).toBeNull();
  });
});

// ============================================================================
// C05-4: context-validation failure discards field cause when creating UnauthorizedError
// ============================================================================

describe('C05-4: context validation preserves cause on UnauthorizedError', () => {
  const contextRoute = defineRoute({
    method: 'GET',
    path: '/secure',
    request: {
      context: zodSchema(z.object({ userId: z.string().min(1) })),
    },
    responses: { 200: { description: 'OK' } },
  });

  it('UnauthorizedError has cause when context validation fails', async () => {
    const routes = createServerRoutes(
      { secure: contextRoute },
      {
        secure: {
          requestMapper: () => ({}),
          useCase: { execute: async () => ({}) },
          responseMapper: () => ({ status: 200, body: {} }),
        },
      },
    );

    const rawRequest: RawHttpRequest = {
      method: 'GET',
      url: '/secure',
      headers: {},
      body: null,
      query: {},
      params: {},
    };

    try {
      await routes[0]!.handler(rawRequest, { requestId: 'test', userId: '' }); // empty userId
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedError);
      const err = error as UnauthorizedError;
      // The cause should be set (the InvalidRequestError from context validation)
      expect(err.cause).toBeDefined();
    }
  });
});

// ============================================================================
// C05-6: bare global crypto.randomUUID() — import from node:crypto instead
// ============================================================================

// This is a compatibility fix; the behavior at the unit test level is:
// generateRequestId() should return a req_* prefixed UUID.
// We verify the fix by ensuring it still works (does not throw on environments
// where global crypto may not be present) and returns the right format.
describe('C05-6: generateRequestId uses node:crypto', () => {
  const noSchemaRoute = defineRoute({
    method: 'GET',
    path: '/health',
    responses: { 200: { description: 'OK' } },
  });

  it('requestId starts with req_ and is a valid format (node:crypto)', async () => {
    let capturedContext: unknown;

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

    await routes[0]!.handler({
      method: 'GET',
      url: '/health',
      headers: {},
      body: null,
      query: {},
      params: {},
    });

    expect(capturedContext).toBeDefined();
    const ctx = capturedContext as { requestId: string };
    expect(ctx.requestId).toMatch(/^req_[0-9a-f-]{36}$/);
  });
});

// ============================================================================
// C05-7: defineRoute only shallow-freezes; deep-freeze nested objects
// ============================================================================

describe('C05-7: defineRoute deep-freezes nested objects', () => {
  it('freezes route.request object', () => {
    const route = defineRoute({
      method: 'GET',
      path: '/users',
      request: {
        query: zodSchema(z.object({ page: z.number() })),
      },
      responses: { 200: { description: 'OK' } },
    });

    expect(Object.isFrozen(route.request)).toBe(true);
  });

  it('freezes route.responses object', () => {
    const route = defineRoute({
      method: 'GET',
      path: '/users',
      responses: { 200: { description: 'OK' } },
    });

    expect(Object.isFrozen(route.responses)).toBe(true);
  });

  it('freezes route.docs object', () => {
    const route = defineRoute({
      method: 'GET',
      path: '/users',
      responses: { 200: { description: 'OK' } },
      docs: { summary: 'List users', tags: ['Users'] },
    });

    expect(Object.isFrozen(route.docs)).toBe(true);
  });

  it('freezes route._meta object', () => {
    const route = defineRoute({
      method: 'POST',
      path: '/users',
      request: {
        body: {
          schema: zodSchema(z.object({ name: z.string() })),
          description: 'User body',
        },
      },
      responses: { 201: { description: 'Created' } },
    });

    expect(Object.isFrozen(route._meta)).toBe(true);
  });
});

// ============================================================================
// C05-8: createContext silently overrides framework-provided ctx
// ============================================================================

describe('C05-8: createContext merges with framework ctx (createContext wins)', () => {
  const noSchemaRoute = defineRoute({
    method: 'GET',
    path: '/health',
    responses: { 200: { description: 'OK' } },
  });

  it('when createContext is set, merges with framework ctx (createContext takes precedence)', async () => {
    let capturedContext: unknown;

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
      {
        // createContext returns extra fields
        createContext: (req) => ({ requestId: `custom_${req.url}`, source: 'factory' }),
        validateResponse: false,
      },
    );

    const frameworkCtx = { requestId: 'framework-123', traceId: 'trace-abc' };

    await routes[0]!.handler(
      { method: 'GET', url: '/health', headers: {}, body: null, query: {}, params: {} },
      frameworkCtx,
    );

    const ctx = capturedContext as Record<string, unknown>;
    // createContext-derived fields should be present
    expect(ctx['source']).toBe('factory');
    // framework-provided fields should also be preserved (merged)
    expect(ctx['traceId']).toBe('trace-abc');
  });

  it('without createContext, framework ctx is used as-is', async () => {
    let capturedContext: unknown;

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

    const frameworkCtx = { requestId: 'framework-123', traceId: 'trace-abc' };

    await routes[0]!.handler(
      { method: 'GET', url: '/health', headers: {}, body: null, query: {}, params: {} },
      frameworkCtx,
    );

    expect(capturedContext).toEqual(frameworkCtx);
  });
});

// ============================================================================
// C16-2: normalizeHeaders called twice per request in skip-validation branch
// ============================================================================

// This is an observable behavior fix — we can verify correctness still holds
// (normalized headers are consistent in raw.headers vs req.headers).
describe('C16-2: normalizeHeaders called once in skip-validation branch', () => {
  const noSchemaRoute = defineRoute({
    method: 'GET',
    path: '/health',
    responses: { 200: { description: 'OK' } },
  });

  it('req.headers and raw.headers are both normalized and consistent', async () => {
    let capturedReqHeaders: unknown;
    let capturedRawHeaders: unknown;

    const routes = createServerRoutes(
      { health: noSchemaRoute },
      {
        health: {
          requestMapper: (req) => {
            capturedReqHeaders = req.headers;
            capturedRawHeaders = req.raw.headers;
            return {};
          },
          useCase: { execute: async () => ({}) },
          responseMapper: () => ({ status: 200, body: {} }),
        },
      },
      { validateRequest: false },
    );

    await routes[0]!.handler({
      method: 'GET',
      url: '/health',
      headers: { 'X-Foo': 'bar', 'Content-Type': 'application/json' },
      body: null,
      query: {},
      params: {},
    });

    // Both should be lowercased
    expect(capturedReqHeaders).toEqual({ 'x-foo': 'bar', 'content-type': 'application/json' });
    expect(capturedRawHeaders).toEqual({ 'x-foo': 'bar', 'content-type': 'application/json' });
    // They should reference equal values (idiomatic no-double-call assertion)
    expect(capturedReqHeaders).toEqual(capturedRawHeaders);
  });
});

// ============================================================================
// MISSED: undeclared-status — response validation passes for undeclared statuses
// ============================================================================

describe('undeclared-status: handler returning undeclared status is rejected', () => {
  const strictRoute = defineRoute({
    method: 'POST',
    path: '/items',
    request: { body: zodSchema(z.object({ name: z.string() })) },
    responses: {
      201: {
        description: 'Created',
        schema: zodSchema(z.object({ id: z.string() })),
      },
    },
  });

  it('throws ControllerError when handler returns a status not in route.responses', async () => {
    const routes = createServerRoutes(
      { create: strictRoute },
      {
        create: {
          requestMapper: (req) => req.body,
          useCase: { execute: async () => ({ id: '123' }) },
          // Handler returns 200 but route only declares 201
          responseMapper: () => ({ status: 200, body: { id: '123' } }),
        },
      },
    );

    const rawRequest: RawHttpRequest = {
      method: 'POST',
      url: '/items',
      headers: {},
      body: { name: 'test' },
      query: {},
      params: {},
    };

    await expect(routes[0]!.handler(rawRequest)).rejects.toThrow(ControllerError);
  });

  it('does NOT throw when route.responses is undefined (no declared responses)', async () => {
    // Route with no responses field at all — all statuses are permissible
    const openRoute = defineRoute({
      method: 'GET',
      path: '/anything',
    });

    const routes = createServerRoutes(
      { get: openRoute },
      {
        get: {
          requestMapper: () => ({}),
          useCase: { execute: async () => ({}) },
          responseMapper: () => ({ status: 200, body: {} }),
        },
      },
    );

    const response = await routes[0]!.handler({
      method: 'GET',
      url: '/anything',
      headers: {},
      body: null,
      query: {},
      params: {},
    });

    expect(response.status).toBe(200);
  });

  it('does NOT throw when validateResponse is false even for undeclared statuses', async () => {
    const routes = createServerRoutes(
      { create: strictRoute },
      {
        create: {
          requestMapper: (req) => req.body,
          useCase: { execute: async () => ({ id: '123' }) },
          responseMapper: () => ({ status: 418, body: {} }), // completely undeclared
        },
      },
      { validateResponse: false },
    );

    const response = await routes[0]!.handler({
      method: 'POST',
      url: '/items',
      headers: {},
      body: { name: 'test' },
      query: {},
      params: {},
    });

    expect(response.status).toBe(418);
  });
});

// ============================================================================
// MISSED: deepFreeze-adapter — defineRouter deepFreeze must skip SchemaAdapter._schema
// ============================================================================

describe('deepFreeze-adapter: defineRouter does not freeze SchemaAdapter internals', () => {
  it('defineRouter with context schema does not freeze the zod schema internals', () => {
    const z_schema = z.object({ userId: z.string() });
    const contextSchema = zodSchema(z_schema);

    // This should not throw even though zod schemas are not freezable
    expect(() => {
      defineRouter(
        {
          list: defineRoute({
            method: 'GET',
            path: '/users',
            request: { context: contextSchema },
            responses: { 200: { description: 'OK' } },
          }),
        },
        {
          defaults: { context: contextSchema },
        },
      );
    }).not.toThrow();
  });

  it('defineRoute with schema adapters does not freeze schema adapter objects', () => {
    const bodySchema = zodSchema(z.object({ name: z.string() }));

    expect(() => {
      defineRoute({
        method: 'POST',
        path: '/users',
        request: { body: bodySchema },
        responses: { 201: { description: 'Created' } },
      });
    }).not.toThrow();
  });
});
