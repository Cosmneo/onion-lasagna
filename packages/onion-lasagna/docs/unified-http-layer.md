# Unified HTTP Layer

> Define once. Generate client, server, and OpenAPI from a single source of truth.

---

## Overview

```
Route Definition ──┬──► Type-Safe Client (frontend)
                   ├──► Validated Server Routes (backend)
                   └──► OpenAPI 3.1 Specification (docs)
```

**Core Benefits:**

- Single schema definition used for validation, types, and documentation
- Full TypeScript inference — no manual type annotations
- Automatic request/response validation
- Framework agnostic (Hono, Fastify, Elysia, NestJS)

---

## Quick Start

### 1. Define a Route

```typescript
import { defineRoute } from '@cosmneo/onion-lasagna/http/route';
import { zodSchema, z } from '@cosmneo/onion-lasagna/http/schema/zod';

export const createProjectRoute = defineRoute({
  method: 'POST',
  path: '/api/projects',
  request: {
    body: {
      schema: zodSchema(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
        }),
      ),
    },
  },
  responses: {
    201: {
      description: 'Project created',
      schema: zodSchema(z.object({ projectId: z.string() })),
    },
  },
  docs: {
    summary: 'Create a new project',
    tags: ['Projects'],
  },
});
```

### 2. Group Routes into a Router

```typescript
import { defineRouter } from '@cosmneo/onion-lasagna/http/route';

export const projectRouter = defineRouter({
  projects: {
    create: createProjectRoute,
    list: listProjectsRoute,
    get: getProjectRoute,
    statuses: {
      add: addStatusRoute,
      list: listStatusesRoute,
    },
    tasks: {
      add: addTaskRoute,
      list: listTasksRoute,
    },
  },
});
```

Routes are accessed via dot-notation: `'projects.create'`, `'projects.tasks.add'`.

### 3. Create Server Handlers

```typescript
import { createServerRoutes } from '@cosmneo/onion-lasagna/http/server';

export const routes = createServerRoutes(projectRouter, {
  'projects.create': {
    requestMapper: (req, ctx) => ({
      name: req.body.name,
      description: req.body.description,
      createdBy: ctx.userId,
    }),
    useCase: createProjectUseCase,
    responseMapper: (output) => ({
      status: 201 as const,
      body: { projectId: output.projectId },
    }),
  },
  // ... handlers for all routes
});
```

### 4. Register with Framework

```typescript
import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
import { registerHonoRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna/http/frameworks/hono';

const app = new Hono();

// Auth middleware
const authMiddleware = jwt({ secret: process.env.JWT_SECRET });

// Register routes
registerHonoRoutes(app, routes, {
  middlewares: [authMiddleware],
  contextExtractor: (c) => ({
    userId: c.get('jwtPayload')?.sub,
  }),
});

// Error handling
app.onError(onionErrorHandler);
```

### 5. Generate Client (Frontend)

```typescript
import { createClient } from '@cosmneo/onion-lasagna/http/client';
import { projectRouter } from '@repo/backend';

const api = createClient(projectRouter, {
  baseUrl: 'https://api.example.com',
});

// Fully typed
const result = await api.projects.create({
  body: { name: 'My Project' },
});
console.log(result.projectId); // string
```

---

## Route Definition

### Request Configuration

```typescript
defineRoute({
  method: 'POST',
  path: '/api/projects/:projectId/tasks',
  request: {
    // Request body (POST, PUT, PATCH)
    body: {
      schema: zodSchema(z.object({ title: z.string() })),
      contentType: 'application/json', // optional, default
    },

    // Query parameters
    query: {
      schema: zodSchema(z.object({
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
      })),
    },

    // Path parameters (optional - auto-extracted from path)
    params: {
      schema: zodSchema(z.object({
        projectId: z.string().uuid(),
      })),
    },

    // Required headers
    headers: {
      schema: zodSchema(z.object({
        'x-api-key': z.string(),
      })),
    },

    // Context validation (from middleware)
    context: {
      schema: zodSchema(z.object({
        userId: z.string(),
      })),
    },
  },
  responses: { ... },
});
```

### Response Configuration

```typescript
defineRoute({
  // ...
  responses: {
    200: {
      description: 'Success', // Required for OpenAPI
      schema: zodSchema(resultSchema), // Response body schema
      contentType: 'application/json', // Optional
    },
    204: {
      description: 'No content', // No schema for empty responses
    },
    404: {
      description: 'Not found',
    },
  },
});
```

### Documentation Metadata

```typescript
defineRoute({
  // ...
  docs: {
    summary: 'Short description',
    description: 'Longer markdown description',
    tags: ['Projects', 'Tasks'],
    operationId: 'createProjectTask',
    deprecated: false,
    security: [{ bearerAuth: [] }],
    externalDocs: {
      url: 'https://docs.example.com/tasks',
      description: 'Task documentation',
    },
  },
});
```

---

## Server Handlers

### Handler Structure

Each handler follows the pattern: `requestMapper → useCase → responseMapper`

```typescript
'projects.create': {
  // Map validated request to use case input
  requestMapper: (req, ctx) => ({
    name: req.body.name,
    createdBy: ctx.userId,
  }),

  // Execute business logic
  useCase: createProjectUseCase,

  // Map use case output to HTTP response
  responseMapper: (output) => ({
    status: 201 as const,
    body: { projectId: output.projectId },
    headers: { 'X-Request-Id': output.requestId }, // optional
  }),
}
```

### Validated Request Object

```typescript
interface ValidatedRequest<TRoute> {
  body: TRoute['_types']['body']; // Typed from route schema
  query: TRoute['_types']['query']; // Typed from route schema
  pathParams: TRoute['_types']['pathParams']; // Typed from route schema
  headers: TRoute['_types']['headers']; // Typed from route schema
  raw: {
    method: string;
    url: string;
    headers: Record<string, string>;
  };
}
```

### Context Typing

When a route defines a context schema, the `ctx` parameter is fully typed:

```typescript
// Route with context schema
const createRoute = defineRoute({
  request: {
    context: {
      schema: zodSchema(z.object({
        userId: z.string(),
        roles: z.array(z.string()),
      })),
    },
  },
  // ...
});

// Handler receives typed context
'projects.create': {
  requestMapper: (req, ctx) => ({
    createdBy: ctx.userId,           // string
    isAdmin: ctx.roles.includes('admin'), // string[]
  }),
}
```

### Date Serialization

Domain objects often use `Date`, but JSON responses need ISO strings:

```typescript
responseMapper: (output) => ({
  status: 200 as const,
  body: {
    ...output,
    createdAt: output.createdAt.toISOString(),
    updatedAt: output.updatedAt?.toISOString() ?? null,
  },
}),
```

---

## Framework Integration

### Hono

```typescript
import { Hono } from 'hono';
import { registerHonoRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna/http/frameworks/hono';

const app = new Hono();

registerHonoRoutes(app, routes, {
  middlewares: [authMiddleware], // Applied to all routes
  contextExtractor: (c) => ({
    // Extract context from Hono context
    userId: c.get('jwtPayload')?.sub,
    requestId: c.get('requestId'),
  }),
});

app.onError(onionErrorHandler);
```

### Fastify

```typescript
import Fastify from 'fastify';
import {
  registerFastifyRoutes,
  onionErrorHandler,
} from '@cosmneo/onion-lasagna/http/frameworks/fastify';

const app = Fastify();

registerFastifyRoutes(app, routes, {
  prefix: '/api/v1',
  contextExtractor: (request) => ({
    userId: request.user?.id,
  }),
});

app.setErrorHandler(onionErrorHandler);
```

### Elysia

```typescript
import { Elysia } from 'elysia';
import {
  registerElysiaRoutes,
  onionErrorHandler,
} from '@cosmneo/onion-lasagna/http/frameworks/elysia';

const app = new Elysia();

registerElysiaRoutes(app, routes, {
  contextExtractor: (ctx) => ({
    userId: ctx.store.userId,
  }),
});

app.onError(onionErrorHandler);
```

---

## Client Generation

### Configuration

```typescript
const api = createClient(projectRouter, {
  baseUrl: 'https://api.example.com',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  timeout: 30000,

  // Interceptors
  onRequest: (request) => {
    request.headers.set('X-Request-Id', crypto.randomUUID());
    return request;
  },
  onResponse: (response) => response,
  onError: (error) => {
    if (error.status === 401) {
      window.location.href = '/login';
    }
  },

  // Retry configuration
  retry: {
    attempts: 3,
    delay: 1000,
    retryOn: [503, 504],
  },
});
```

### Usage

```typescript
// GET with query params
const list = await api.projects.list({
  query: { page: 1, pageSize: 20 },
});

// GET with path params
const project = await api.projects.get({
  pathParams: { projectId: '123' },
});

// POST with body
const created = await api.projects.create({
  body: { name: 'New Project' },
});

// Nested routes
const task = await api.projects.tasks.add({
  pathParams: { projectId: '123' },
  body: { title: 'New Task', statusId: 'abc' },
});
```

### Error Handling

```typescript
import { ClientError } from '@cosmneo/onion-lasagna/http/client';

try {
  await api.projects.get({ pathParams: { projectId } });
} catch (error) {
  if (error instanceof ClientError) {
    if (error.status === 404) {
      // Handle not found
    }
    console.log(error.body); // Server error response
  }
}
```

---

## OpenAPI Generation

```typescript
import { generateOpenAPI } from '@cosmneo/onion-lasagna/http/openapi';

const spec = generateOpenAPI(projectRouter, {
  openapi: '3.1.0',
  info: {
    title: 'Project Management API',
    version: '1.0.0',
    description: 'API for managing projects and tasks',
  },
  servers: [
    { url: 'https://api.example.com', description: 'Production' },
    { url: 'http://localhost:3000', description: 'Development' },
  ],
  tags: [
    { name: 'Projects', description: 'Project operations' },
    { name: 'Tasks', description: 'Task operations' },
  ],
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
  },
  security: [{ bearerAuth: [] }],
});

// Serve spec
app.get('/openapi.json', (c) => c.json(spec));
```

---

## Schema Adapters

### Zod

```typescript
import { zodSchema, z } from '@cosmneo/onion-lasagna/http/schema/zod';

const schema = zodSchema(
  z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    age: z.number().int().positive().optional(),
    tags: z.array(z.string()),
  }),
);
```

### TypeBox

```typescript
import { typeboxSchema, Type } from '@cosmneo/onion-lasagna/http/schema/typebox';

const schema = typeboxSchema(
  Type.Object({
    name: Type.String({ minLength: 1, maxLength: 100 }),
    email: Type.String({ format: 'email' }),
    age: Type.Optional(Type.Integer({ minimum: 1 })),
    tags: Type.Array(Type.String()),
  }),
);
```

### Query Parameter Coercion

Use `z.coerce` for query params (they arrive as strings):

```typescript
query: {
  schema: zodSchema(
    z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      active: z.coerce.boolean().optional(),
    })
  ),
}
```

---

## Validation & Errors

### Request Validation

Validation happens automatically before handlers execute:

1. Body validated against `request.body.schema`
2. Query validated against `request.query.schema`
3. Path params validated against `request.params.schema`
4. Headers validated against `request.headers.schema`
5. Context validated against `request.context.schema`

Invalid requests return `400 Bad Request`:

```json
{
  "message": "Invalid request data",
  "errorCode": "INVALID_REQUEST",
  "errorItems": [
    { "item": "body.name", "message": "Required" },
    { "item": "query.page", "message": "Expected number, received string" }
  ]
}
```

### Context Validation

Context validation failure returns `500 Internal Server Error` (since auth middleware should have rejected invalid requests first).

### Error Mapping

| Error Type                  | HTTP Status  |
| --------------------------- | ------------ |
| `InvalidRequestError`       | 400          |
| `NotFoundError`             | 404          |
| `AccessDeniedError`         | 403          |
| `ConflictError`             | 409          |
| `UnprocessableError`        | 422          |
| `DomainError`, `InfraError` | 500 (masked) |

---

## Type Inference

The `serverRoutes()` builder pattern provides **100% type inference** for all handler parameters:

```typescript
import { serverRoutes } from '@cosmneo/onion-lasagna/http/server';

// ✅ Full type inference - NO manual annotations needed!
serverRoutes(projectManagementRouter)
  .handle('projects.create', {
    requestMapper: (req, ctx) => ({
      name: req.body.name, // ✅ Inferred from route's body schema
      createdBy: ctx.userId, // ✅ Inferred from route's context schema
    }),
    useCase: createProjectUseCase,
    responseMapper: (output) => ({
      // ✅ Inferred from useCase output type
      status: 201 as const,
      body: { projectId: output.projectId },
    }),
  })
  .build();
```

**What gets inferred:**

- `req.body` - from route's body schema
- `req.query` - from route's query schema
- `req.pathParams` - from route's params schema
- `ctx` - from route's context schema
- `output` - from the use case's return type

### Best Practices

For routers with many routes, split handlers into smaller groups to avoid TypeScript instantiation depth limits:

```typescript
// Split by domain area
function createProjectHandlers(useCases: UseCases) {
  return serverRoutes(router)
    .handle('projects.create', { ... })
    .handle('projects.list', { ... })
    .buildPartial();
}

function createTaskHandlers(useCases: UseCases) {
  return serverRoutes(router)
    .handle('projects.tasks.add', { ... })
    .handle('projects.tasks.list', { ... })
    .buildPartial();
}

// Combine
export function createAllRoutes(useCases: UseCases) {
  return [
    ...createProjectHandlers(useCases),
    ...createTaskHandlers(useCases),
  ];
}
```

### Legacy API (Deprecated)

The older `createServerRoutes()` object-based API has type inference limitations:

```typescript
// ⚠️ Legacy API - type inference incomplete
createServerRoutes(router, {
  'projects.create': {
    requestMapper: (req, ctx) => ({ ... }), // req may be 'unknown'
  },
});
```

Use `serverRoutes()` builder pattern instead for full type inference.

---

## Limitations

### Runtime Limitations

| Area                    | Limitation                                                               |
| ----------------------- | ------------------------------------------------------------------------ |
| **Frameworks**          | Hono, Fastify, Elysia, NestJS only. Express/Koa need manual integration. |
| **File Uploads**        | No built-in multipart/form-data. Handle in middleware.                   |
| **Streaming**           | HTTP request/response only. No SSE or WebSocket.                         |
| **Schema Transforms**   | Complex Zod transforms may simplify in JSON Schema.                      |
| **Response Validation** | Failures return 500, not 422.                                            |

---

## Improvement Opportunities

### Per-Route Middleware

```typescript
// Not yet supported
defineRoute({
  middleware: [requireAuth(['admin']), rateLimit(100)],
});
```

### Custom Error Schemas

```typescript
// Not yet supported
defineRoute({
  errors: {
    400: { schema: customErrorSchema },
  },
});
```

### Response Transformers

```typescript
// Not yet supported
defineRoute({
  responses: {
    200: {
      schema: projectSchema,
      transform: (data) => ({ ...data, _links: {...} }),
    },
  },
});
```

### Client Response Validation

```typescript
// Not yet supported
createClient(router, {
  validateResponses: true,
});
```

---

## Complete Example

See the reference implementation:
`my-todo-app/packages/backend/bounded-contexts/project-management/`

```
presentation/http/
├── router.ts           # Router definition (defineRouter)
├── handlers.ts         # Server handlers (createServerRoutes)
├── projects.routes.ts  # Project route definitions
├── statuses.routes.ts  # Status route definitions
└── tasks.routes.ts     # Task route definitions

apps/backend/.../index.ts  # Framework bootstrap
```
