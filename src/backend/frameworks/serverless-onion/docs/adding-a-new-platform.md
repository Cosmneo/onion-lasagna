# Adding a New Platform to Serverless-Onion

This guide explains how to add support for a new serverless platform (e.g., Deno Deploy, Bun, Vercel Edge, Fastly Compute).

## Overview

The serverless-onion framework uses an **adapter pattern** to remain platform-agnostic. To add a new platform, you implement a single interface: `PlatformProxyAdapter`.

```
┌─────────────────────────────────────────────┐
│                   CORE                      │
│  createBaseProxyHandler + PlatformProxyAdapter │
└────────────────────┬────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌───────────────────┐   ┌───────────────────┐
│   Your Platform   │   │ Existing Platforms│
│   (implement      │   │ (AWS, Cloudflare) │
│   adapter)        │   │                   │
└───────────────────┘   └───────────────────┘
```

## Prerequisites

- Understanding of your target platform's request/response format
- Familiarity with the framework's adapter pattern

## Step-by-Step Guide

### 1. Create Runtime Directory Structure

```
runtimes/your-platform/
├── adapters/
│   ├── request/
│   │   ├── map-request-body.ts
│   │   ├── map-request-headers.ts
│   │   ├── map-request-query-params.ts
│   │   └── index.ts
│   └── response/
│       └── map-response.ts
├── handlers/
│   └── create-your-handler.ts
├── middleware/
│   ├── types/
│   │   └── middleware.type.ts
│   └── index.ts
├── types.ts
└── index.ts
```

### 2. Implement the PlatformProxyAdapter

The `PlatformProxyAdapter` interface is the contract between core and your platform:

```typescript
import type { PlatformProxyAdapter } from '../../core/handlers';
import type { HttpResponse } from '../../core/onion-layers/presentation';
import type { HttpException } from '../../core/exceptions';

// Your platform's native types
type YourRequest = Request; // or platform-specific type
type YourResponse = Response; // or platform-specific type

const yourPlatformAdapter: PlatformProxyAdapter<YourRequest, YourResponse> = {
  // Extract route info for routing
  extractRouteInfo: (request) => ({
    path: new URL(request.url).pathname,
    method: request.method,
  }),

  // Extract request body (can be async for streaming platforms)
  extractBody: async (request) => {
    try {
      return await request.clone().json();
    } catch {
      return undefined;
    }
  },

  // Extract headers as flat key-value map
  extractHeaders: (request) => Object.fromEntries(request.headers.entries()),

  // Extract query parameters
  extractQueryParams: (request) => Object.fromEntries(new URL(request.url).searchParams),

  // Convert HttpResponse to platform response
  mapResponse: (response: HttpResponse) =>
    new Response(JSON.stringify(response.body), {
      status: response.statusCode,
      headers: { 'Content-Type': 'application/json', ...response.headers },
    }),

  // Convert HttpException to platform response
  mapExceptionToResponse: (exception: HttpException) =>
    new Response(JSON.stringify(exception.toResponse()), {
      status: exception.statusCode,
      headers: { 'Content-Type': 'application/json' },
    }),
};
```

### 3. Create Handler Factory

Use `createBaseProxyHandler` with your adapter:

```typescript
import { createBaseProxyHandler } from '../../core/handlers';

export function createYourPlatformHandler<
  TController extends Controller = Controller,
  TMiddlewares extends readonly Middleware<object, object, TEnv>[] = readonly [],
  TEnv = undefined,
>(config: YourPlatformHandlerConfig<TController, TMiddlewares, TEnv>) {
  const { serviceName, routes, middlewares = [], handleExceptions = true } = config;

  const baseProxyHandlerFactory = createBaseProxyHandler<YourRequest, YourResponse, TEnv>(
    yourPlatformAdapter,
  );

  return baseProxyHandlerFactory({
    serviceName,
    routes,
    middlewares,
    handleExceptions,
    extractMetadata: (request) => ({
      path: new URL(request.url).pathname,
      method: request.method,
      url: request.url,
    }),
    // mapRequest is optional - uses adapter extraction methods by default
  });
}
```

### 4. Export Public API

```typescript
// index.ts
export { createYourPlatformHandler } from './handlers/create-your-handler';
export type { YourPlatformHandlerConfig } from './handlers/create-your-handler';

// Re-export core utilities
export { defineMiddleware, runMiddlewareChain } from '../../core/middleware';

// Platform-specific middleware type
export type { Middleware, AccumulatedContext } from './middleware';
```

## Platform-Specific Considerations

### Async vs Sync Body Reading

| Platform           | Body Reading | Notes                                     |
| ------------------ | ------------ | ----------------------------------------- |
| AWS Lambda         | Sync         | Body is pre-parsed string in `event.body` |
| Cloudflare Workers | Async        | Must clone request, read as text/json     |
| Deno Deploy        | Async        | Same as Cloudflare (Web API)              |
| Bun                | Async        | Same as Cloudflare (Web API)              |

```typescript
// AWS (sync)
extractBody: (event) => {
  if (!event.body) return undefined;
  try { return JSON.parse(event.body); }
  catch { return event.body; }
},

// Web API platforms (async)
extractBody: async (request) => {
  if (!request.body) return undefined;
  try { return await request.clone().json(); }
  catch { return await request.clone().text(); }
},
```

### Environment Bindings

| Platform           | Env Type                   | How to Access             |
| ------------------ | -------------------------- | ------------------------- |
| AWS Lambda         | Optional injected `env`    | Via handler config        |
| Cloudflare Workers | `WorkerEnv` bindings       | Second parameter to fetch |
| Deno Deploy        | `Deno.env`                 | Global access             |
| Bun                | `Bun.env` or `process.env` | Global access             |

### Request Metadata

Extract platform-specific metadata for logging/tracing:

```typescript
// AWS
extractMetadata: (event) => ({
  path: event.rawPath,
  method: event.requestContext.http.method,
  requestId: event.requestContext.requestId,
  sourceIp: event.requestContext.http.sourceIp,
  userAgent: event.requestContext.http.userAgent,
}),

// Cloudflare/Web API
extractMetadata: (request) => ({
  path: new URL(request.url).pathname,
  method: request.method,
  url: request.url,
}),
```

## Complete Example: Deno Deploy

Here's a complete minimal implementation (~60 lines):

```typescript
// runtimes/deno-deploy/index.ts
import type { Controller } from '../../core/onion-layers/presentation';
import type { RouteInput } from '../../core/onion-layers/presentation/routing';
import type { HttpResponse } from '../../core/onion-layers/presentation/interfaces/types/http';
import type { HttpException } from '../../core/exceptions';
import { createBaseProxyHandler, type PlatformProxyAdapter } from '../../core/handlers';
import type { Middleware } from '../../core/middleware/types';

// Re-export core middleware utilities
export { defineMiddleware, runMiddlewareChain } from '../../core/middleware';

const denoAdapter: PlatformProxyAdapter<Request, Response> = {
  extractRouteInfo: (request) => ({
    path: new URL(request.url).pathname,
    method: request.method,
  }),
  extractBody: async (request) => {
    if (!request.body) return undefined;
    try {
      return await request.clone().json();
    } catch {
      return undefined;
    }
  },
  extractHeaders: (request) => Object.fromEntries(request.headers.entries()),
  extractQueryParams: (request) => Object.fromEntries(new URL(request.url).searchParams),
  mapResponse: (response: HttpResponse) =>
    new Response(JSON.stringify(response.body), {
      status: response.statusCode,
      headers: { 'Content-Type': 'application/json' },
    }),
  mapExceptionToResponse: (exception: HttpException) =>
    new Response(JSON.stringify(exception.toResponse()), {
      status: exception.statusCode,
      headers: { 'Content-Type': 'application/json' },
    }),
};

export interface CreateDenoHandlerConfig<
  TController extends Controller = Controller,
  TMiddlewares extends readonly Middleware<object, object, undefined, Request>[] = readonly [],
> {
  serviceName: string;
  routes: RouteInput<TController>[];
  middlewares?: TMiddlewares;
  handleExceptions?: boolean;
}

export function createDenoHandler<
  TController extends Controller = Controller,
  TMiddlewares extends readonly Middleware<object, object, undefined, Request>[] = readonly [],
>(config: CreateDenoHandlerConfig<TController, TMiddlewares>) {
  const {
    serviceName,
    routes,
    middlewares = [] as unknown as TMiddlewares,
    handleExceptions = true,
  } = config;

  const factory = createBaseProxyHandler<Request, Response, undefined>(denoAdapter);

  return factory({
    serviceName,
    routes,
    middlewares,
    handleExceptions,
    extractMetadata: (request) => ({
      path: new URL(request.url).pathname,
      method: request.method,
      url: request.url,
    }),
  });
}
```

Usage:

```typescript
import { createDenoHandler } from './runtimes/deno-deploy';

const handler = createDenoHandler({
  serviceName: 'UserService',
  routes: [
    { metadata: { servicePath: '/users', method: 'GET' }, controller: listUsersController },
    { metadata: { servicePath: '/users/{id}', method: 'GET' }, controller: getUserController },
  ],
});

Deno.serve(handler);
```

## Testing Your Implementation

1. **Type Check**: Run `bun run build` to verify TypeScript compilation
2. **Lint**: Run `bun run lint` to check for issues
3. **Integration Test**: Create a simple handler and test with real requests

```typescript
// test/your-platform.test.ts
import { describe, it, expect } from 'bun:test';
import { createYourPlatformHandler } from '../src/runtimes/your-platform';

describe('Your Platform Handler', () => {
  it('should route requests correctly', async () => {
    const handler = createYourPlatformHandler({
      serviceName: 'TestService',
      routes: [
        {
          metadata: { servicePath: '/health', method: 'GET' },
          controller: { execute: async () => ({ statusCode: 200, body: { status: 'ok' } }) },
        },
      ],
    });

    const response = await handler(new Request('http://localhost/health'));
    expect(response.status).toBe(200);
  });
});
```

## Checklist

Before submitting a new platform:

- [ ] Implemented `PlatformProxyAdapter` with all 6 methods
- [ ] Created handler factory using `createBaseProxyHandler`
- [ ] Added platform-specific middleware type alias
- [ ] Exported public API from `index.ts`
- [ ] Added to `tsup.config.ts` for build
- [ ] Build passes (`bun run build`)
- [ ] Lint passes (`bun run lint`)
- [ ] Basic integration test works

## Questions?

For questions or issues, check:

- Existing implementations in `runtimes/aws-api-gateway-http/` and `runtimes/cloudflare-workers/`
- Core types in `core/handlers/types.ts`
- Helper utilities in `core/handlers/build-http-request.ts`
