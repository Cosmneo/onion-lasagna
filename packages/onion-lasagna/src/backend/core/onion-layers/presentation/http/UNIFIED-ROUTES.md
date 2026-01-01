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
│                    Route Definition                         │
│  ┌────────────────────────────────────────────────────-─┐   │
│  │  defineRoute({                                       │   │
│  │    method: 'POST',                                   │   │
│  │    path: '/api/projects',                            │   │
│  │    request: { body: projectSchema },                 │   │
│  │    responses: { 201: { schema: projectResponse } }   │   │
│  │  })                                                  │   │
│  └─────────────────────────────────────────────────-────┘   │
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

| Without Unified Routes | With Unified Routes |
|------------------------|---------------------|
| Client types defined separately | Types inferred from schema |
| Server validation duplicated | Validation from same schema |
| OpenAPI written manually | Generated from schema |
| Three sources of truth | **One source of truth** |

---

## Schema Adapters

Schema adapters wrap validation libraries (Zod, TypeBox) to provide:
- **Runtime validation** via `validate(data)`
- **JSON Schema conversion** via `toJsonSchema()`
- **Type inference** via phantom types `_output` and `_input`

### Zod Adapter

```typescript
import { z } from 'zod';
import { zodSchema } from '@cosmneo/onion-lasagna/unified/schema/zod';

// Wrap a Zod schema
const createProjectSchema = zodSchema(z.object({
  name: z.string().min(1).max(100).describe('Project name'),
  description: z.string().optional().describe('Project description'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
}));

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
// {
//   type: 'object',
//   properties: {
//     name: { type: 'string', minLength: 1, maxLength: 100, description: 'Project name' },
//     description: { type: 'string', description: 'Project description' },
//     priority: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' }
//   },
//   required: ['name']
// }
```

### TypeBox Adapter

```typescript
import { Type } from '@sinclair/typebox';
import { typeboxSchema } from '@cosmneo/onion-lasagna/unified/schema/typebox';

const createProjectSchema = typeboxSchema(Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  description: Type.Optional(Type.String()),
  priority: Type.Union([
    Type.Literal('low'),
    Type.Literal('medium'),
    Type.Literal('high'),
  ], { default: 'medium' }),
}));
```

### Where Schemas Live

**Important**: Schemas are defined in your bounded context's infrastructure layer, not inline in route definitions:

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
import { zodSchema } from '@cosmneo/onion-lasagna/unified/schema/zod';

export const createProjectBodySchema = zodSchema(z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
}));

export const projectResponseSchema = zodSchema(z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
}));

// Infer types from schemas
export type CreateProjectBody = typeof createProjectBodySchema._output;
export type ProjectResponse = typeof projectResponseSchema._output;
```

---

## Defining Routes

A route definition captures everything about an endpoint:

```typescript
import { defineRoute } from '@cosmneo/onion-lasagna/unified/route';
import {
  createProjectBodySchema,
  projectResponseSchema,
  validationErrorSchema,
} from '../infra/schemas/project.schema';

export const createProjectRoute = defineRoute({
  // HTTP method
  method: 'POST',

  // Path with optional parameters (e.g., '/projects/:projectId')
  path: '/api/projects',

  // Request schemas
  request: {
    body: createProjectBodySchema,
    // query: queryParamsSchema,    // Optional
    // params: pathParamsSchema,    // Optional (for :param validation)
    // headers: headersSchema,      // Optional
  },

  // Response schemas (for OpenAPI documentation)
  responses: {
    201: {
      description: 'Project created successfully',
      schema: projectResponseSchema,
    },
    400: {
      description: 'Validation error',
      schema: validationErrorSchema,
    },
  },

  // Documentation metadata
  docs: {
    operationId: 'createProject',
    summary: 'Create a new project',
    description: 'Creates a new project with the given name and description.',
    tags: ['Projects'],
    deprecated: false,
  },
});
```

### Path Parameters

Path parameters are automatically extracted from the path pattern:

```typescript
const getProjectRoute = defineRoute({
  method: 'GET',
  path: '/api/projects/:projectId',  // :projectId is extracted
  request: {
    // Optional: validate path params
    params: zodSchema(z.object({
      projectId: z.string().uuid(),
    })),
  },
  responses: {
    200: { description: 'Project found', schema: projectResponseSchema },
    404: { description: 'Project not found' },
  },
  docs: {
    operationId: 'getProject',
    summary: 'Get project by ID',
    tags: ['Projects'],
  },
});

// TypeScript knows: pathParams: { projectId: string }
```

### Query Parameters

```typescript
const listProjectsRoute = defineRoute({
  method: 'GET',
  path: '/api/projects',
  request: {
    query: zodSchema(z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      search: z.string().optional(),
      status: z.enum(['active', 'archived']).optional(),
    })),
  },
  responses: {
    200: {
      description: 'List of projects',
      schema: projectListResponseSchema,
    },
  },
  docs: {
    operationId: 'listProjects',
    summary: 'List all projects',
    tags: ['Projects'],
  },
});
```

---

## Defining Routers

Group related routes into a router:

```typescript
import { defineRouter } from '@cosmneo/onion-lasagna/unified/route';

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

// Type is inferred as:
// {
//   projects: {
//     create: RouteDefinition<...>,
//     list: RouteDefinition<...>,
//     ...
//   },
//   tasks: { ... }
// }
```

---

## Output 1: Type-Safe Client

Create a fully-typed HTTP client from your router:

```typescript
import { createClient } from '@cosmneo/onion-lasagna/unified/client';
import { projectManagementRouter } from './routes';

const api = createClient(projectManagementRouter, {
  baseUrl: 'http://localhost:3000',

  // Default headers for all requests
  headers: {
    'Content-Type': 'application/json',
  },

  // Request timeout
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

// Usage - fully typed!
const project = await api.projects.create({
  body: {
    name: 'My Project',        // ✓ Required, string
    description: 'Optional',   // ✓ Optional, string
  },
});
// project is typed as ProjectResponse

const projects = await api.projects.list({
  query: {
    page: 1,
    limit: 20,
    status: 'active',  // ✓ Must be 'active' | 'archived'
  },
});

const singleProject = await api.projects.get({
  pathParams: { projectId: '123e4567-e89b-12d3-a456-426614174000' },
});
```

### Client Error Handling

```typescript
import { ClientError } from '@cosmneo/onion-lasagna/unified/client';

try {
  const project = await api.projects.get({
    pathParams: { projectId: 'invalid-id' },
  });
} catch (error) {
  if (error instanceof ClientError) {
    console.log(error.status);       // 404
    console.log(error.statusText);   // 'Not Found'
    console.log(error.body);         // Error response body
    console.log(error.isClientError); // true (4xx)
    console.log(error.isServerError); // false (5xx)
  }
}
```

---

## Output 2: Server Routes with Auto-Validation

This is where the unified system provides significant value: **automatic request validation** before your handler is called.

### How Auto-Validation Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        HTTP Request Flow                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Raw HTTP Request arrives                                             │
│     ┌─────────────────────────────────────────────────────────────────┐ │
│     │ POST /api/projects                                               │ │
│     │ Content-Type: application/json                                   │ │
│     │ Authorization: Bearer xxx                                        │ │
│     │                                                                  │ │
│     │ { "name": "", "priority": "invalid" }                           │ │
│     └─────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│  2. createServerRoutes extracts request data                            │
│     ┌─────────────────────────────────────────────────────────────────┐ │
│     │ body: { "name": "", "priority": "invalid" }                     │ │
│     │ query: {}                                                        │ │
│     │ params: {}                                                       │ │
│     │ headers: { authorization: "Bearer xxx", ... }                   │ │
│     └─────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│  3. Validate EACH part against its schema                               │
│     ┌─────────────────────────────────────────────────────────────────┐ │
│     │ body validation:                                                 │ │
│     │   ✗ name: String must contain at least 1 character(s)           │ │
│     │   ✗ priority: Invalid enum value                                │ │
│     │                                                                  │ │
│     │ query validation: (no schema defined, skip)                      │ │
│     │ params validation: (no schema defined, skip)                     │ │
│     │ headers validation: (no schema defined, skip)                    │ │
│     └─────────────────────────────────────────────────────────────────┘ │
│                              │                                           │
│                              ▼                                           │
│  4a. Validation FAILED → Return 400 immediately                        │
│     ┌─────────────────────────────────────────────────────────────────┐ │
│     │ HTTP 400 Bad Request                                             │ │
│     │ {                                                                │ │
│     │   "success": false,                                              │ │
│     │   "error": {                                                     │ │
│     │     "code": "VALIDATION_ERROR",                                  │ │
│     │     "message": "Request validation failed",                      │ │
│     │     "details": [                                                 │ │
│     │       { "path": "body.name", "message": "..." },                │ │
│     │       { "path": "body.priority", "message": "..." }             │ │
│     │     ]                                                            │ │
│     │   }                                                              │ │
│     │ }                                                                │ │
│     └─────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  4b. Validation PASSED → Call your handler with typed data             │
│     ┌─────────────────────────────────────────────────────────────────┐ │
│     │ handler(validatedRequest, context) {                            │ │
│     │   // validatedRequest.body is typed as CreateProjectBody        │ │
│     │   // validatedRequest.query is typed as ListQueryParams         │ │
│     │   // validatedRequest.pathParams is typed as { projectId: ... } │ │
│     │   // All data is GUARANTEED to match the schema                 │ │
│     │ }                                                                │ │
│     └─────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### The validateRequest Function (Detailed)

Here's exactly what happens inside `createServerRoutes`:

```typescript
// This is the internal validation logic (simplified for clarity)
function validateRequest(route: RouteDefinition, rawRequest: RawHttpRequest) {
  const errors: ValidationIssue[] = [];
  const data: ValidatedData = {};

  // 1. BODY VALIDATION
  if (route.request.body?.schema) {
    const result = route.request.body.schema.validate(rawRequest.body);

    if (result.success) {
      data.body = result.data;  // Transformed/coerced data
    } else {
      // Prefix all error paths with 'body.'
      errors.push(...result.issues.map(issue => ({
        ...issue,
        path: ['body', ...issue.path],
      })));
    }
  }

  // 2. QUERY VALIDATION
  if (route.request.query?.schema) {
    // Normalize query (handle arrays, convert types)
    const queryObj = normalizeQuery(rawRequest.query);
    const result = route.request.query.schema.validate(queryObj);

    if (result.success) {
      data.query = result.data;  // Coerced numbers, defaults applied
    } else {
      errors.push(...result.issues.map(issue => ({
        ...issue,
        path: ['query', ...issue.path],
      })));
    }
  }

  // 3. PATH PARAMS VALIDATION
  if (route.request.params?.schema) {
    const result = route.request.params.schema.validate(rawRequest.params ?? {});

    if (result.success) {
      data.pathParams = result.data;
    } else {
      errors.push(...result.issues.map(issue => ({
        ...issue,
        path: ['pathParams', ...issue.path],
      })));
    }
  } else {
    // No schema = pass through raw params
    data.pathParams = rawRequest.params ?? {};
  }

  // 4. HEADERS VALIDATION
  if (route.request.headers?.schema) {
    const headersObj = normalizeHeaders(rawRequest.headers);
    const result = route.request.headers.schema.validate(headersObj);

    if (result.success) {
      data.headers = result.data;
    } else {
      errors.push(...result.issues.map(issue => ({
        ...issue,
        path: ['headers', ...issue.path],
      })));
    }
  }

  // 5. RETURN AGGREGATED RESULT
  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data };
}
```

### Using createServerRoutes

```typescript
import { createServerRoutes } from '@cosmneo/onion-lasagna/unified/server';
import { projectManagementRouter } from './routes';

const routes = createServerRoutes(projectManagementRouter, {
  // Handler for each route (key matches router structure)
  'projects.create': {
    handler: async (req, ctx) => {
      // req.body is GUARANTEED to be valid CreateProjectBody
      // No manual validation needed!

      const project = await projectService.create({
        name: req.body.name,           // string (validated)
        description: req.body.description, // string | undefined
        priority: req.body.priority,   // 'low' | 'medium' | 'high'
        createdBy: ctx.userId,
      });

      return {
        status: 201,
        body: project,
      };
    },
    // Optional: route-specific middleware
    middleware: [requireAuth],
  },

  'projects.list': {
    handler: async (req, ctx) => {
      // req.query is validated and coerced
      // z.coerce.number() already converted strings to numbers

      const { page, limit, search, status } = req.query;
      // page: number (default 1)
      // limit: number (default 20)
      // search: string | undefined
      // status: 'active' | 'archived' | undefined

      const projects = await projectService.list({
        page,
        limit,
        search,
        status,
      });

      return {
        status: 200,
        body: projects,
      };
    },
  },

  'projects.get': {
    handler: async (req, ctx) => {
      // req.pathParams.projectId is validated UUID
      const project = await projectService.findById(req.pathParams.projectId);

      if (!project) {
        return {
          status: 404,
          body: { error: 'Project not found' },
        };
      }

      return {
        status: 200,
        body: project,
      };
    },
  },
}, {
  // Global options

  // Global middleware (runs before all handlers)
  middleware: [requestLogger, errorHandler],

  // Custom validation error response
  onValidationError: (errors) => ({
    status: 400,
    body: {
      success: false,
      code: 'VALIDATION_ERROR',
      errors: errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    },
    headers: {
      'Content-Type': 'application/json',
    },
  }),

  // Custom context factory
  createContext: (rawRequest) => ({
    requestId: crypto.randomUUID(),
    userId: extractUserId(rawRequest),
    timestamp: new Date(),
  }),
});
```

### The ValidatedRequest Type

When your handler is called, you receive a `ValidatedRequest` with fully typed properties:

```typescript
interface ValidatedRequest<TRoute extends RouteDefinition> {
  // Validated and typed body
  readonly body: TRoute['_types']['body'];

  // Validated and typed query params
  readonly query: TRoute['_types']['query'];

  // Validated and typed path params
  readonly pathParams: TRoute['_types']['pathParams'];

  // Validated and typed headers
  readonly headers: TRoute['_types']['headers'];

  // Raw request for edge cases
  readonly raw: {
    readonly method: string;
    readonly url: string;
    readonly headers: Record<string, string>;
  };
}
```

### Registering with Hono

```typescript
import { Hono } from 'hono';
import { registerHonoRoutes } from '@cosmneo/onion-lasagna/backend/frameworks/hono';

const app = new Hono();

// The routes from createServerRoutes are UnifiedRouteInput[]
// which is compatible with registerHonoRoutes
for (const route of routes) {
  const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';

  app[method](route.path, async (c) => {
    const rawRequest = {
      method: c.req.method,
      url: c.req.url,
      headers: Object.fromEntries(c.req.raw.headers),
      body: await c.req.json().catch(() => undefined),
      query: Object.fromEntries(new URL(c.req.url).searchParams),
      params: c.req.param(),
    };

    const response = await route.handler(rawRequest);

    return c.json(response.body, response.status as any);
  });
}
```

### Why Auto-Validation Matters

| Manual Validation | Auto-Validation |
|-------------------|-----------------|
| Duplicate schema definitions | Single schema definition |
| Easy to forget validation | Always validates |
| Types might not match validation | Types guaranteed to match |
| Error format inconsistent | Consistent error format |
| More code to maintain | Less code |

### What About Custom Validation?

The auto-validation handles **request shape validation**. You still handle **business logic validation** in your handler:

```typescript
'projects.create': {
  handler: async (req, ctx) => {
    // Schema validation PASSED - data is valid shape
    // But we still need business validation:

    const existingProject = await projectService.findByName(req.body.name);
    if (existingProject) {
      return {
        status: 409,
        body: { error: 'Project with this name already exists' },
      };
    }

    const userQuota = await quotaService.check(ctx.userId);
    if (userQuota.projectsRemaining <= 0) {
      return {
        status: 422,
        body: { error: 'Project quota exceeded' },
      };
    }

    // Now create the project...
  },
},
```

---

## Output 3: OpenAPI Generation

Generate a complete OpenAPI 3.1 specification:

```typescript
import { generateOpenAPI } from '@cosmneo/onion-lasagna/unified/openapi';
import { projectManagementRouter } from './routes';

const spec = generateOpenAPI(projectManagementRouter, {
  // Required: API info
  info: {
    title: 'Project Management API',
    version: '1.0.0',
    description: 'API for managing projects and tasks',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },

  // Optional: Server configurations
  servers: [
    { url: 'http://localhost:3000', description: 'Development' },
    { url: 'https://api.example.com', description: 'Production' },
  ],

  // Optional: Security schemes
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    },
    apiKey: {
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
    },
  },

  // Optional: Global security requirement
  security: [{ bearerAuth: [] }],

  // Optional: Tag descriptions
  tags: [
    { name: 'Projects', description: 'Project management operations' },
    { name: 'Tasks', description: 'Task management operations' },
  ],

  // Optional: External documentation
  externalDocs: {
    description: 'Full documentation',
    url: 'https://docs.example.com',
  },
});

// Serve the spec
app.get('/openapi.json', (c) => c.json(spec));

// Use with Swagger UI
app.get('/docs', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>API Documentation</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
        <script>
          SwaggerUIBundle({
            url: '/openapi.json',
            dom_id: '#swagger-ui',
          });
        </script>
      </body>
    </html>
  `);
});
```

### Generated Specification Example

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Project Management API",
    "version": "1.0.0"
  },
  "paths": {
    "/api/projects": {
      "post": {
        "operationId": "createProject",
        "summary": "Create a new project",
        "tags": ["Projects"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string",
                    "minLength": 1,
                    "maxLength": 100,
                    "description": "Project name"
                  },
                  "description": {
                    "type": "string",
                    "description": "Project description"
                  },
                  "priority": {
                    "type": "string",
                    "enum": ["low", "medium", "high"],
                    "default": "medium"
                  }
                },
                "required": ["name"]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Project created successfully",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "id": { "type": "string", "format": "uuid" },
                    "name": { "type": "string" },
                    "description": { "type": "string", "nullable": true },
                    "createdAt": { "type": "string", "format": "date-time" }
                  },
                  "required": ["id", "name", "createdAt"]
                }
              }
            }
          },
          "400": {
            "description": "Validation error"
          }
        }
      },
      "get": {
        "operationId": "listProjects",
        "summary": "List all projects",
        "tags": ["Projects"],
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "required": false,
            "schema": { "type": "integer", "minimum": 1, "default": 1 }
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "schema": { "type": "integer", "minimum": 1, "maximum": 100, "default": 20 }
          },
          {
            "name": "status",
            "in": "query",
            "required": false,
            "schema": { "type": "string", "enum": ["active", "archived"] }
          }
        ],
        "responses": {
          "200": {
            "description": "List of projects"
          }
        }
      }
    },
    "/api/projects/{projectId}": {
      "get": {
        "operationId": "getProject",
        "summary": "Get project by ID",
        "tags": ["Projects"],
        "parameters": [
          {
            "name": "projectId",
            "in": "path",
            "required": true,
            "schema": { "type": "string", "format": "uuid" }
          }
        ],
        "responses": {
          "200": { "description": "Project found" },
          "404": { "description": "Project not found" }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  },
  "security": [{ "bearerAuth": [] }],
  "tags": [
    { "name": "Projects", "description": "Project management operations" }
  ]
}
```

---

## Complete Example

Here's a complete example showing all three outputs:

### 1. Define Schemas (`infra/schemas/project.schema.ts`)

```typescript
import { z } from 'zod';
import { zodSchema } from '@cosmneo/onion-lasagna/unified/schema/zod';

// Request schemas
export const createProjectBodySchema = zodSchema(z.object({
  name: z.string().min(1).max(100).describe('Project name'),
  description: z.string().max(1000).optional().describe('Project description'),
}));

export const listProjectsQuerySchema = zodSchema(z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
}));

export const projectIdParamsSchema = zodSchema(z.object({
  projectId: z.string().uuid(),
}));

// Response schemas
export const projectResponseSchema = zodSchema(z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}));

export const projectListResponseSchema = zodSchema(z.object({
  items: z.array(projectResponseSchema._schema), // Reuse inner schema
  total: z.number(),
  page: z.number(),
  limit: z.number(),
}));

// Export types
export type CreateProjectBody = typeof createProjectBodySchema._output;
export type ProjectResponse = typeof projectResponseSchema._output;
```

### 2. Define Routes (`client/routes.ts`)

```typescript
import { defineRoute, defineRouter } from '@cosmneo/onion-lasagna/unified/route';
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
  docs: {
    operationId: 'createProject',
    summary: 'Create project',
    tags: ['Projects'],
  },
});

const listProjects = defineRoute({
  method: 'GET',
  path: '/api/projects',
  request: { query: listProjectsQuerySchema },
  responses: {
    200: { description: 'Success', schema: projectListResponseSchema },
  },
  docs: {
    operationId: 'listProjects',
    summary: 'List projects',
    tags: ['Projects'],
  },
});

const getProject = defineRoute({
  method: 'GET',
  path: '/api/projects/:projectId',
  request: { params: projectIdParamsSchema },
  responses: {
    200: { description: 'Found', schema: projectResponseSchema },
    404: { description: 'Not found' },
  },
  docs: {
    operationId: 'getProject',
    summary: 'Get project',
    tags: ['Projects'],
  },
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
import { createClient } from '@cosmneo/onion-lasagna/unified/client';
import { projectRouter } from './routes';

export const createProjectClient = (baseUrl: string) =>
  createClient(projectRouter, {
    baseUrl,
    headers: { 'Content-Type': 'application/json' },
  });

export type ProjectClient = ReturnType<typeof createProjectClient>;
```

### 4. Create Server Routes (`server/routes.ts`)

```typescript
import { createServerRoutes } from '@cosmneo/onion-lasagna/unified/server';
import { projectRouter } from '../client/routes';
import { projectService } from './services/project.service';

export const routes = createServerRoutes(projectRouter, {
  'projects.create': {
    handler: async (req, ctx) => {
      const project = await projectService.create(req.body);
      return { status: 201, body: project };
    },
  },
  'projects.list': {
    handler: async (req, ctx) => {
      const result = await projectService.list(req.query);
      return { status: 200, body: result };
    },
  },
  'projects.get': {
    handler: async (req, ctx) => {
      const project = await projectService.findById(req.pathParams.projectId);
      if (!project) {
        return { status: 404, body: { error: 'Not found' } };
      }
      return { status: 200, body: project };
    },
  },
});
```

### 5. Generate OpenAPI (`server/openapi.ts`)

```typescript
import { generateOpenAPI } from '@cosmneo/onion-lasagna/unified/openapi';
import { projectRouter } from '../client/routes';

export const openApiSpec = generateOpenAPI(projectRouter, {
  info: {
    title: 'Project API',
    version: '1.0.0',
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Dev' },
  ],
});
```

### 6. Wire It Up (`server/index.ts`)

```typescript
import { Hono } from 'hono';
import { routes } from './routes';
import { openApiSpec } from './openapi';

const app = new Hono();

// Register routes
for (const route of routes) {
  const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
  app[method](route.path, async (c) => {
    const response = await route.handler({
      method: c.req.method,
      url: c.req.url,
      headers: Object.fromEntries(c.req.raw.headers),
      body: await c.req.json().catch(() => undefined),
      query: Object.fromEntries(new URL(c.req.url).searchParams),
      params: c.req.param(),
    });
    return c.json(response.body, response.status as any);
  });
}

// OpenAPI endpoint
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
5. **Schema-agnostic** - Works with Zod, TypeBox, or custom adapters

The auto-validation specifically ensures:
- All incoming data is validated against schemas
- Handlers receive typed, guaranteed-valid data
- Validation errors are returned consistently
- No validation code duplication
