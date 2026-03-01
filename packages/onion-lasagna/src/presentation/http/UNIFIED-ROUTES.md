# Unified Route Definition System

> **One definition → Three outputs**: Type-safe client, validated server routes, and OpenAPI specification.

## Table of Contents

1. [Overview](#overview)
2. [Schema Adapters](#schema-adapters)
3. [Defining Routes](#defining-routes)
4. [Defining Routers](#defining-routers)
5. [Output 1: Type-Safe Client](#output-1-type-safe-client)
6. [Output 2: Server Routes with Auto-Validation](#output-2-server-routes-with-auto-validation)
7. [Output 3: OpenAPI Generation](#output-3-openapi-generation)
8. [Complete Example](#complete-example)

---

## Overview

The unified route system solves a common problem: maintaining consistency between your API client types, server-side validation, and API documentation. Instead of defining the same types and validation logic in three different places, you define it once.

```
┌─────────────────────────────────────────────────────────────┐
│                    Route Definition                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  defineRoute({                                        │  │
│  │    method: 'POST',                                    │  │
│  │    path: '/api/projects',                             │  │
│  │    request: { body: projectSchema },                  │  │
│  │    responses: { 201: { schema: projectResponse } }    │  │
│  │  })                                                   │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │   Client    │    │   Server    │    │   OpenAPI   │
   │  Type-safe  │    │   Auto-     │    │    Spec     │
   │  HTTP calls │    │ validation  │    │ Generation  │
   └─────────────┘    └─────────────┘    └─────────────┘
```

### Why Use This?

| Without Unified Routes          | With Unified Routes         |
| ------------------------------- | --------------------------- |
| Client types defined separately | Types inferred from schema  |
| Server validation duplicated    | Validation from same schema |
| OpenAPI written manually        | Generated from schema       |
| Three sources of truth          | **One source of truth**     |

---

## Schema Adapters

Schema adapters wrap validation libraries to provide:

- **Runtime validation** via `validate(data)`
- **JSON Schema conversion** via `toJsonSchema()`
- **Type inference** via phantom types `_output` and `_input`

Each schema adapter is a **separate package**:

| Library | Package                          | Adapter Function  |
| ------- | -------------------------------- | ----------------- |
| Zod v4  | `@cosmneo/onion-lasagna-zod`     | `zodSchema()`     |
| Zod v3  | `@cosmneo/onion-lasagna-zod-v3`  | `zodSchema()`     |
| TypeBox | `@cosmneo/onion-lasagna-typebox` | `typeboxSchema()` |
| Valibot | `@cosmneo/onion-lasagna-valibot` | `valibotSchema()` |
| ArkType | `@cosmneo/onion-lasagna-arktype` | `arktypeSchema()` |

### Zod Adapter

```typescript
import { z } from 'zod';
import { zodSchema } from '@cosmneo/onion-lasagna-zod';

const createProjectSchema = zodSchema(
  z.object({
    name: z.string().min(1).max(100).describe('Project name'),
    description: z.string().optional().describe('Project description'),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
  }),
);

// Runtime validation
const result = createProjectSchema.validate({
  name: 'My Project',
  priority: 'high',
});

if (result.success) {
  console.log(result.data); // { name: 'My Project', priority: 'high' }
} else {
  console.log(result.issues); // Validation errors with paths
}

// JSON Schema for OpenAPI
const jsonSchema = createProjectSchema.toJsonSchema();
```

### TypeBox Adapter

```typescript
import { Type } from '@sinclair/typebox';
import { typeboxSchema } from '@cosmneo/onion-lasagna-typebox';

const createProjectSchema = typeboxSchema(
  Type.Object({
    name: Type.String({ minLength: 1, maxLength: 100 }),
    description: Type.Optional(Type.String()),
    priority: Type.Union([Type.Literal('low'), Type.Literal('medium'), Type.Literal('high')], {
      default: 'medium',
    }),
  }),
);
```

### Where Schemas Live

Schemas are defined in your bounded context's infrastructure layer, not inline in route definitions:

```
bounded-contexts/
└── project-management/
    ├── infra/
    │   └── schemas/              ← Schemas defined here
    │       ├── project.schema.ts
    │       └── task.schema.ts
    └── client/
        └── routes.ts             ← Routes reference schemas
```

```typescript
// infra/schemas/project.schema.ts
import { z } from 'zod';
import { zodSchema } from '@cosmneo/onion-lasagna-zod';

export const createProjectBodySchema = zodSchema(
  z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
  }),
);

export const projectResponseSchema = zodSchema(
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    createdAt: z.string().datetime(),
  }),
);

// Infer types from schemas
export type CreateProjectBody = typeof createProjectBodySchema._output;
export type ProjectResponse = typeof projectResponseSchema._output;
```

---

## Defining Routes

A route definition captures everything about an endpoint. The `defineRoute` function accepts `SchemaFieldInput` for each schema field — either a **bare schema** or an **object with metadata**:

```typescript
import { defineRoute } from '@cosmneo/onion-lasagna/http/route';
import {
  createProjectBodySchema,
  projectResponseSchema,
} from '../infra/schemas/project.schema';

export const createProjectRoute = defineRoute({
  method: 'POST',
  path: '/api/projects',

  // Request schemas grouped under `request`
  request: {
    // Bare schema (most common)
    body: createProjectBodySchema,

    // Or with metadata for OpenAPI
    // body: {
    //   schema: createProjectBodySchema,
    //   description: 'Project data to create',
    //   contentType: 'application/json',
    //   required: true,
    // },

    // query: queryParamsSchema,    // Optional
    // params: pathParamsSchema,    // Optional (for :param validation)
    // headers: headersSchema,      // Optional
    // context: contextSchema,      // Optional (e.g., JWT payload)
  },

  // Per-status response definitions (for OpenAPI and type inference)
  responses: {
    201: {
      description: 'Project created successfully',
      schema: projectResponseSchema,
    },
    400: { description: 'Validation error' },
  },

  // Documentation metadata (optional)
  docs: {
    summary: 'Create a new project',
    description: 'Creates a new project with the given name and description.',
    tags: ['Projects'],
    operationId: 'createProject', // Auto-generated from router key if omitted
    deprecated: false,
  },
});
```

### SchemaFieldInput

Each schema field (`body`, `query`, `params`, `headers`, `context`) accepts a `SchemaFieldInput` — either a bare `SchemaAdapter` or a `SchemaFieldConfig` object:

```typescript
// Bare schema (common case — just the adapter)
body: zodSchema(z.object({ name: z.string() }))

// With metadata (for OpenAPI enrichment)
body: {
  schema: zodSchema(z.object({ name: z.string() })),
  description: 'The user to create',     // OpenAPI description
  contentType: 'application/json',        // Content type (body only)
  required: true,                         // Whether required (body only)
}
```

Internally, the schema is extracted to `route.request.body` (the `SchemaAdapter` directly) and metadata is stored in `route._meta.body`.

### Response Type Inference

The success response type is inferred from the first 2xx status with a `schema`, cascading through `200 → 201 → 202 → 204`:

```typescript
// Response type inferred as ProjectResponse (from 201 schema)
const route = defineRoute({
  method: 'POST',
  path: '/projects',
  request: { body: createProjectBodySchema },
  responses: {
    201: { schema: projectResponseSchema, description: 'Created' },
    400: { description: 'Bad Request' },
  },
});
```

### Path Parameters

Path parameters are automatically extracted from the path pattern:

```typescript
const getProjectRoute = defineRoute({
  method: 'GET',
  path: '/api/projects/:projectId',
  request: {
    params: zodSchema(z.object({ projectId: z.string().uuid() })),
  },
  responses: {
    200: { description: 'Project found', schema: projectResponseSchema },
    404: { description: 'Project not found' },
  },
  docs: { summary: 'Get project by ID', tags: ['Projects'] },
});

// TypeScript knows: pathParams: { projectId: string }
```

### Query Parameters

```typescript
const listProjectsRoute = defineRoute({
  method: 'GET',
  path: '/api/projects',
  request: {
    query: zodSchema(
      z.object({
        page: z.coerce.number().min(1).default(1),
        limit: z.coerce.number().min(1).max(100).default(20),
        search: z.string().optional(),
        status: z.enum(['active', 'archived']).optional(),
      }),
    ),
  },
  responses: {
    200: { description: 'List of projects', schema: projectListResponseSchema },
  },
  docs: { summary: 'List all projects', tags: ['Projects'] },
});
```

### Auto-Generated operationId

When `docs.operationId` is not specified, it is auto-generated from the router key path:

```typescript
// "users.list"      → "usersList"
// "projects.create" → "projectsCreate"
// "org.members.get" → "orgMembersGet"
```

---

## Defining Routers

Group related routes into a router:

```typescript
import { defineRouter } from '@cosmneo/onion-lasagna/http/route';

export const projectManagementRouter = defineRouter({
  projects: {
    create: createProjectRoute,
    list: listProjectsRoute,
    get: getProjectRoute,
    update: updateProjectRoute,
    delete: deleteProjectRoute,
  },
  tasks: {
    create: createTaskRoute,
    list: listTasksRoute,
    get: getTaskRoute,
    update: updateTaskRoute,
  },
});
```

### Router Options

```typescript
const api = defineRouter(
  {
    list: listUsersRoute,
    get: getUserRoute,
  },
  {
    basePath: '/api/v1',
    defaults: {
      context: zodSchema(executionContextSchema), // Applied to routes without own context
      tags: ['Users'],                            // Merged into each route's docs.tags
    },
  },
);
```

### Router Composition with `mergeRouters`

Combine multiple routers (supports 2–8+ routers with deep merge):

```typescript
import { mergeRouters } from '@cosmneo/onion-lasagna/http/route';

const api = mergeRouters(
  { users: usersRouter.routes },
  { posts: postsRouter.routes },
  { comments: commentsRouter.routes },
);
// Overlapping sub-routers are deep-merged; leaf routes are overwritten.
```

---

## Output 1: Type-Safe Client

Create a fully-typed HTTP client from your router:

```typescript
import { createClient } from '@cosmneo/onion-lasagna-client';
import { projectManagementRouter } from './routes';

const api = createClient(projectManagementRouter, {
  baseUrl: 'http://localhost:3000',

  // Default headers for all requests
  headers: { 'Content-Type': 'application/json' },

  // Request timeout (ms)
  timeout: 30000,

  // Request interceptor (add auth, logging, etc.)
  onRequest: async (request) => {
    const token = await getAuthToken();
    request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },

  // Response interceptor
  onResponse: async (response) => {
    console.log(`${response.status} ${response.url}`);
    return response;
  },

  // Error handler
  onError: async (error) => {
    if (error.status === 401) {
      await refreshToken();
    }
  },

  // Retry configuration
  retry: {
    attempts: 3,
    delay: 1000,
    retryOn: [500, 502, 503, 504],
  },
});

// Usage — fully typed!
const project = await api.projects.create({
  body: {
    name: 'My Project',   // ✓ Required, string
    description: 'Desc',  // ✓ Optional, string
  },
});
// project is typed as ProjectResponse

const projects = await api.projects.list({
  query: {
    page: 1,
    limit: 20,
    status: 'active', // ✓ Must be 'active' | 'archived'
  },
});

const singleProject = await api.projects.get({
  pathParams: { projectId: '123e4567-e89b-12d3-a456-426614174000' },
});
```

### Client Error Handling

```typescript
import { ClientError } from '@cosmneo/onion-lasagna-client';

try {
  const project = await api.projects.get({
    pathParams: { projectId: 'invalid-id' },
  });
} catch (error) {
  if (error instanceof ClientError) {
    console.log(error.status);        // 404
    console.log(error.statusText);    // 'Not Found'
    console.log(error.body);          // Error response body
    console.log(error.isClientError); // true (4xx)
    console.log(error.isServerError); // false (5xx)
  }
}
```

### React Query Hooks

```typescript
import { createReactQueryHooks } from '@cosmneo/onion-lasagna-react-query';
import { projectManagementRouter } from './routes';

const { hooks, queryKeys } = createReactQueryHooks(projectManagementRouter, {
  baseUrl: '/api',
  onRequest: async (request) => {
    request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },

  // Prefix for cache key isolation
  queryKeyPrefix: 'projects-api',

  // Gate all queries on auth session readiness
  useEnabled: () => {
    const { isValid } = useValidSession();
    return isValid;
  },
});

// GET/HEAD → useQuery
const { data, isLoading } = hooks.projects.list.useQuery({ query: { page: 1 } });

// POST/PUT/PATCH/DELETE → useMutation
const { mutate } = hooks.projects.create.useMutation({
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects() }),
});

// Query keys for cache invalidation
queryKeys.projects();                              // ['projects-api', 'projects']
queryKeys.projects.list();                         // ['projects-api', 'projects', 'list']
queryKeys.projects.get({ pathParams: { id } });    // ['projects-api', 'projects', 'get', ...]
```

---

## Output 2: Server Routes with Auto-Validation

The `serverRoutes()` builder creates validated server routes from your router definition.

### Builder Pattern

```typescript
import { serverRoutes } from '@cosmneo/onion-lasagna/http/server';
import { projectManagementRouter } from './routes';

const routes = serverRoutes(projectManagementRouter)
  // Simple handler — receives validated, typed request
  .handle('projects.list', async (req, ctx) => ({
    status: 200,
    body: await projectService.list(req.query),
  }))

  // Use case pattern — requestMapper → useCase.execute() → responseMapper
  .handleWithUseCase('projects.create', {
    requestMapper: (req, ctx) => ({
      name: req.body.name,
      createdBy: ctx.userId,
    }),
    useCase: createProjectUseCase,
    responseMapper: (output) => ({
      status: 201 as const,
      body: { id: output.id },
    }),
  })

  // Simple handler with middleware
  .handle('projects.get', {
    handler: async (req) => {
      const project = await projectService.findById(req.pathParams.projectId);
      if (!project) throw new NotFoundError({ message: 'Project not found' });
      return { status: 200, body: project };
    },
    middleware: [requireAuth],
  })

  // .build() — type error if any routes are missing handlers
  .build();

// .buildPartial() — allows missing handlers (skips them)
```

### How Auto-Validation Works

```
  1. Raw HTTP Request arrives
     ┌──────────────────────────────────────────────┐
     │ POST /api/projects                           │
     │ Content-Type: application/json               │
     │ { "name": "", "priority": "invalid" }        │
     └──────────────────────────────────────────────┘
                          │
                          ▼
  2. Extract request data into RawHttpRequest
     ┌──────────────────────────────────────────────┐
     │ body: { "name": "", "priority": "invalid" }  │
     │ query: {}                                    │
     │ params: {}                                   │
     │ headers: { ... }                             │
     └──────────────────────────────────────────────┘
                          │
                          ▼
  3. Validate each part against its route schema
     ┌──────────────────────────────────────────────┐
     │ route.request.body → validate(rawBody)       │
     │   ✗ name: too short                          │
     │   ✗ priority: invalid enum value             │
     │                                              │
     │ route.request.query → (no schema, skip)      │
     │ route.request.params → (no schema, skip)     │
     │ route.request.headers → (no schema, skip)    │
     └──────────────────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
  4a. FAILED → InvalidRequestError   4b. PASSED → Call handler
      (400 Bad Request)                  with ValidatedRequest
```

Each schema field on the route (`route.request.body`, `route.request.query`, etc.) is a `SchemaAdapter` directly. The validation pipeline calls `.validate()` on each one.

### The ValidatedRequest Type

When your handler is called, you receive a `ValidatedRequest` with fully typed properties:

```typescript
interface ValidatedRequest<TRoute extends RouteDefinition> {
  readonly body: TRoute['_types']['body'];           // Validated body type
  readonly query: TRoute['_types']['query'];         // Validated query type
  readonly pathParams: TRoute['_types']['pathParams']; // Validated path params type
  readonly headers: TRoute['_types']['headers'];     // Validated headers type
  readonly raw: {
    readonly method: string;
    readonly url: string;
    readonly headers: Record<string, string>;
  };
}
```

### HandlerResponse

```typescript
interface HandlerResponse<TData = unknown> {
  readonly status: number;
  readonly body?: TData;
  readonly headers?: Record<string, string>;
}
```

### Registering with Hono

The `@cosmneo/onion-lasagna-hono` package provides `registerHonoRoutes` and `onionErrorHandler`:

```typescript
import { Hono } from 'hono';
import { registerHonoRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna-hono';

const app = new Hono();

// Global error handler (factory — call it to get the handler)
app.onError(onionErrorHandler());

// Register all routes from the builder
registerHonoRoutes(app, routes, {
  prefix: '/api/v1',          // Optional URL prefix
  contextExtractor: (c) => ({ // Optional context from Hono's Context
    requestId: c.get('requestId'),
    user: c.get('user'),
  }),
});

export default app;
```

### Why Auto-Validation Matters

| Manual Validation                | Auto-Validation           |
| -------------------------------- | ------------------------- |
| Duplicate schema definitions     | Single schema definition  |
| Easy to forget validation        | Always validates          |
| Types might not match validation | Types guaranteed to match |
| Error format inconsistent        | Consistent error format   |
| More code to maintain            | Less code                 |

### What About Custom Validation?

Auto-validation handles **request shape validation**. You still handle **business logic validation** in your handler:

```typescript
.handle('projects.create', async (req, ctx) => {
  // Schema validation PASSED — data is valid shape.
  // Business validation still needed:

  const existing = await projectService.findByName(req.body.name);
  if (existing) {
    throw new ConflictError({ message: 'Project with this name already exists' });
  }

  const project = await projectService.create(req.body);
  return { status: 201, body: project };
})
```

---

## Output 3: OpenAPI Generation

Generate a complete OpenAPI 3.1 specification:

```typescript
import { generateOpenAPI } from '@cosmneo/onion-lasagna/http/openapi';
import { projectManagementRouter } from './routes';

const spec = generateOpenAPI(projectManagementRouter, {
  info: {
    title: 'Project Management API',
    version: '1.0.0',
    description: 'API for managing projects and tasks',
    contact: { name: 'API Support', email: 'support@example.com' },
    license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
  },

  servers: [
    { url: 'http://localhost:3000', description: 'Development' },
    { url: 'https://api.example.com', description: 'Production' },
  ],

  securitySchemes: {
    bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
  },
  security: [{ bearerAuth: [] }],

  tags: [
    { name: 'Projects', description: 'Project management operations' },
    { name: 'Tasks', description: 'Task management operations' },
  ],

  externalDocs: {
    description: 'Full documentation',
    url: 'https://docs.example.com',
  },
});

// Serve the spec
app.get('/openapi.json', (c) => c.json(spec));
```

### What Gets Generated

- **Paths** from route `path` (`:param` → `{param}` conversion)
- **Operations** grouped by path, one per HTTP method
- **operationId** from `docs.operationId` or auto-generated from router key
- **Parameters** from `route.request.params` (path), `route.request.query`, `route.request.headers`
- **Request body** from `route.request.body`, with metadata from `route._meta.body` (description, contentType, required)
- **Responses** from `route.responses` (per-status descriptions and schemas)
- **Tags** collected from all routes + custom tags from config

---

## Complete Example

### 1. Define Schemas (`infra/schemas/project.schema.ts`)

```typescript
import { z } from 'zod';
import { zodSchema } from '@cosmneo/onion-lasagna-zod';

export const createProjectBodySchema = zodSchema(
  z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(1000).optional(),
  }),
);

export const listProjectsQuerySchema = zodSchema(
  z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
  }),
);

export const projectIdParamsSchema = zodSchema(
  z.object({ projectId: z.string().uuid() }),
);

export const projectResponseSchema = zodSchema(
  z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    createdAt: z.string().datetime(),
  }),
);

export const projectListResponseSchema = zodSchema(
  z.object({
    items: z.array(projectResponseSchema._schema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
);
```

### 2. Define Routes (`client/routes.ts`)

```typescript
import { defineRoute, defineRouter } from '@cosmneo/onion-lasagna/http/route';
import {
  createProjectBodySchema,
  listProjectsQuerySchema,
  projectIdParamsSchema,
  projectResponseSchema,
  projectListResponseSchema,
} from '../infra/schemas/project.schema';

const createProject = defineRoute({
  method: 'POST',
  path: '/api/projects',
  request: { body: createProjectBodySchema },
  responses: {
    201: { description: 'Created', schema: projectResponseSchema },
    400: { description: 'Validation error' },
  },
  docs: { summary: 'Create project', tags: ['Projects'] },
});

const listProjects = defineRoute({
  method: 'GET',
  path: '/api/projects',
  request: { query: listProjectsQuerySchema },
  responses: {
    200: { description: 'Success', schema: projectListResponseSchema },
  },
  docs: { summary: 'List projects', tags: ['Projects'] },
});

const getProject = defineRoute({
  method: 'GET',
  path: '/api/projects/:projectId',
  request: { params: projectIdParamsSchema },
  responses: {
    200: { description: 'Found', schema: projectResponseSchema },
    404: { description: 'Not found' },
  },
  docs: { summary: 'Get project', tags: ['Projects'] },
});

export const projectRouter = defineRouter({
  projects: {
    create: createProject,
    list: listProjects,
    get: getProject,
  },
});
```

### 3. Create Client (`client/index.ts`)

```typescript
import { createClient } from '@cosmneo/onion-lasagna-client';
import { projectRouter } from './routes';

export const createProjectClient = (baseUrl: string) =>
  createClient(projectRouter, {
    baseUrl,
    headers: { 'Content-Type': 'application/json' },
  });
```

### 4. Create Server Routes (`server/routes.ts`)

```typescript
import { serverRoutes } from '@cosmneo/onion-lasagna/http/server';
import { projectRouter } from '../client/routes';
import { projectService } from './services/project.service';

export const routes = serverRoutes(projectRouter)
  .handleWithUseCase('projects.create', {
    requestMapper: (req) => req.body,
    useCase: createProjectUseCase,
    responseMapper: (output) => ({ status: 201 as const, body: output }),
  })
  .handle('projects.list', async (req) => ({
    status: 200,
    body: await projectService.list(req.query),
  }))
  .handle('projects.get', async (req) => {
    const project = await projectService.findById(req.pathParams.projectId);
    if (!project) throw new NotFoundError({ message: 'Not found' });
    return { status: 200, body: project };
  })
  .build();
```

### 5. Generate OpenAPI (`server/openapi.ts`)

```typescript
import { generateOpenAPI } from '@cosmneo/onion-lasagna/http/openapi';
import { projectRouter } from '../client/routes';

export const openApiSpec = generateOpenAPI(projectRouter, {
  info: { title: 'Project API', version: '1.0.0' },
  servers: [{ url: 'http://localhost:3000', description: 'Dev' }],
});
```

### 6. Wire It Up (`server/index.ts`)

```typescript
import { Hono } from 'hono';
import { registerHonoRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna-hono';
import { routes } from './routes';
import { openApiSpec } from './openapi';

const app = new Hono();

app.onError(onionErrorHandler());
registerHonoRoutes(app, routes);

app.get('/openapi.json', (c) => c.json(openApiSpec));

export default app;
```

---

## Summary

The unified route system provides:

1. **Single source of truth** - Define once, use everywhere
2. **Type safety** - Full TypeScript inference across client and server
3. **Auto-validation** - Request validation before handlers, no manual checks
4. **OpenAPI generation** - Documentation from the same schemas
5. **Schema-agnostic** - Works with Zod, TypeBox, Valibot, ArkType, or custom adapters
6. **Auto operationId** - Generated from router key path when not specified
7. **Router defaults** - Apply context schemas and tags to all child routes
8. **Flexible field input** - Bare schemas or `{ schema, description?, contentType? }` objects
