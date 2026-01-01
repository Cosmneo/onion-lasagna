# Route Contracts

A unified route definition system that serves as the **single source of truth** for both the typed HTTP client and server-side framework registration.

## Overview

The route contract system solves the problem of keeping client and server route definitions in sync. Instead of defining routes twice (once for the client, once for the server), you define a `RouteContract` once and use it everywhere.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RouteContract                                   │
│           (path, method, request types, response types)                 │
└─────────────────────────────────────────────────────────────────────────┘
                    │                              │
                    ▼                              ▼
        ┌─────────────────────┐        ┌─────────────────────────┐
        │   Typed HTTP Client │        │   Server Route Input    │
        │  (createTypedClient)│        │(createRouteFromContract)│
        └─────────────────────┘        └─────────────────────────┘
```

## Core Concepts

### RouteContract

The foundational interface that captures all static route information:

```typescript
interface RouteContract<TPath, TMethod, TRequest, TResponse> {
  readonly path: TPath;       // e.g., '/api/projects/{projectId}'
  readonly method: TMethod;   // 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  readonly _types: {          // Phantom types for compile-time inference
    readonly request: TRequest;
    readonly response: TResponse;
  };
}
```

The `_types` field uses phantom types - they exist only for TypeScript's type inference and have no runtime cost.

### Request/Response Data Shapes

Contracts use standardized shapes that match your existing DTO interfaces:

```typescript
// Request shape (matches your *RequestData interfaces)
interface RequestDataShape {
  pathParams?: Record<string, string>;
  queryParams?: Record<string, string | undefined>;
  body?: unknown;
}

// Response shape (matches your *ResponseData interfaces)
interface ResponseDataShape {
  statusCode: number;
  body: unknown;
}
```

## Defining Contracts

### Option 1: Explicit Path

Use `defineRouteContract` when you want to specify the path directly:

```typescript
import { defineRouteContract } from '@cosmneo/onion-lasagna/client';

// Define request/response types
interface CreateProjectRequestData {
  body: { name: string; description?: string };
}

interface CreateProjectResponseData {
  statusCode: number;
  body: { projectId: string };
}

// Create the contract
export const createProjectContract = defineRouteContract<
  '/api/projects',
  'POST',
  CreateProjectRequestData,
  CreateProjectResponseData
>({
  path: '/api/projects',
  method: 'POST',
});
```

### Option 2: From Metadata

Use `defineRouteContractFromMetadata` when you have existing route metadata objects:

```typescript
import { defineRouteContractFromMetadata } from '@cosmneo/onion-lasagna/shared/contracts';

// Your existing metadata
const serviceMetadata = { basePath: '/api' };
const resourceMetadata = { path: '/projects' };
const endpointMetadata = { path: '/', method: 'POST' as const };

export const createProjectContract = defineRouteContractFromMetadata<
  'POST',
  CreateProjectRequestData,
  CreateProjectResponseData
>({
  service: serviceMetadata,
  resource: resourceMetadata,
  endpoint: endpointMetadata,
});
// Resulting path: '/api/projects'
```

## Organizing Routes

### Router Contract

Group related contracts into a hierarchical structure using `defineRouterContract`:

```typescript
import { defineRouterContract } from '@cosmneo/onion-lasagna/client';

// Individual contracts
export const createProjectRoute = defineRouteContract<...>({...});
export const listProjectsRoute = defineRouteContract<...>({...});
export const getProjectRoute = defineRouteContract<...>({...});

// Group into a router
export const projectsRouter = defineRouterContract({
  create: createProjectRoute,
  list: listProjectsRoute,
  get: getProjectRoute,
});

// Nest routers for larger APIs
export const apiRouter = defineRouterContract({
  projects: projectsRouter,
  tasks: tasksRouter,
  users: usersRouter,
});
```

## Client Usage

### Creating a Typed Client

```typescript
import { createTypedClient } from '@cosmneo/onion-lasagna/client';
import { apiRouter } from './routes';

const api = createTypedClient(apiRouter, {
  baseUrl: 'http://localhost:3000',
});

// Fully typed API calls!
const project = await api.projects.create({
  body: { name: 'My Project' },
});
// project is typed as CreateProjectResponseData['body']

const projects = await api.projects.list({
  queryParams: { page: '1', pageSize: '10' },
});
// projects is typed as ListProjectsResponseData['body']

const singleProject = await api.projects.get({
  pathParams: { projectId: '123' },
});
```

### Runtime Configuration

```typescript
// Create client without baseUrl
const api = createTypedClient(apiRouter);

// Configure later (e.g., after getting auth token)
api.configure({
  baseUrl: 'http://localhost:3000',
  headers: { Authorization: `Bearer ${token}` },
});
```

### React Query Integration

```typescript
import { createTypedHooks } from '@cosmneo/onion-lasagna/client/react-query';

const { hooks, queryKeys } = createTypedHooks(api, apiRouter);

function ProjectList() {
  // Typed useQuery hook
  const { data, isLoading } = hooks.projects.list.useQuery({
    queryParams: { page: '1' },
  });

  // Typed useMutation hook
  const createMutation = hooks.projects.create.useMutation({
    onSuccess: () => {
      // Invalidate with typed query keys
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });
    },
  });

  return (
    <button onClick={() => createMutation.mutate({ body: { name: 'New' } })}>
      Create Project
    </button>
  );
}
```

### Vue Query Integration

```typescript
import { createTypedComposables } from '@cosmneo/onion-lasagna/client/vue-query';

const { composables, queryKeys } = createTypedComposables(api, apiRouter);

// In a Vue component:
<script setup>
import { useQueryClient } from '@tanstack/vue-query';

const queryClient = useQueryClient();

// Typed useQuery composable
const { data, isLoading } = composables.projects.list.useQuery({
  queryParams: { page: '1' },
});

// Typed useMutation composable
const { mutate } = composables.projects.create.useMutation({
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() });
  },
});
</script>

<template>
  <button @click="mutate({ body: { name: 'New' } })">
    Create Project
  </button>
</template>
```

## Server Usage

### Converting Contract to RouteInput

Use `createRouteFromContract` to bridge the contract with your server implementation:

```typescript
import { createRouteFromContract } from '@cosmneo/onion-lasagna/backend/core/presentation';
import { createProjectContract } from '../client/typed-routes';

const createProjectRoute = createRouteFromContract({
  contract: createProjectContract,
  controller: createProjectController,
  requestDtoFactory: (req) =>
    new CreateProjectRequestDto(req, createProjectRequestValidator),
});
```

### Validation with Zod/ArkType/Valibot/TypeBox

The contract system works seamlessly with all supported validators. Validation happens in the `requestDtoFactory` - this is unchanged:

```typescript
import { createZodValidator } from '@cosmneo/onion-lasagna/backend/core/validators/zod';
import { z } from 'zod';

// Define your Zod schema
const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
  }),
});

// Create the validator
const createProjectValidator = createZodValidator(createProjectSchema);

// Use in requestDtoFactory
const route = createRouteFromContract({
  contract: createProjectContract,
  controller: createProjectController,
  requestDtoFactory: (req) =>
    new CreateProjectRequestDto(req, createProjectValidator), // Validation happens here!
});
```

The same pattern works with other validators:

```typescript
// ArkType
import { createArktypeValidator } from '@cosmneo/onion-lasagna/backend/core/validators/arktype';
import { type } from 'arktype';

const schema = type({ body: { name: 'string', 'description?': 'string' } });
const validator = createArktypeValidator(schema);

// Valibot
import { createValibotValidator } from '@cosmneo/onion-lasagna/backend/core/validators/valibot';
import * as v from 'valibot';

const schema = v.object({ body: v.object({ name: v.string() }) });
const validator = createValibotValidator(schema);

// TypeBox
import { createTypeboxValidator } from '@cosmneo/onion-lasagna/backend/core/validators/typebox';
import { Type } from '@sinclair/typebox';

const schema = Type.Object({ body: Type.Object({ name: Type.String() }) });
const validator = createTypeboxValidator(schema);
```

### Registering with Frameworks

```typescript
import { registerHonoRoutes } from '@cosmneo/onion-lasagna/backend/frameworks/hono';

// Build routes from contracts
const routes = [
  createRouteFromContract({
    contract: createProjectContract,
    controller: createProjectController,
    requestDtoFactory: (req) => new CreateProjectRequestDto(req, validator),
  }),
  createRouteFromContract({
    contract: listProjectsContract,
    controller: listProjectsController,
    requestDtoFactory: (req) => new ListProjectsRequestDto(req, validator),
  }),
  // ... more routes
];

// Register with Hono
registerHonoRoutes(app, routes, { prefix: '/v1' });
```

### Batch Helper

```typescript
import { createRoutesFromContracts } from '@cosmneo/onion-lasagna/backend/core/presentation';

const routes = createRoutesFromContracts([
  { contract: createProjectContract, controller: ctrl.create, requestDtoFactory: ... },
  { contract: listProjectsContract, controller: ctrl.list, requestDtoFactory: ... },
]);
```

## Complete Example

Here's a complete example showing the full flow:

### 1. Define DTOs (shared types)

```typescript
// dtos.ts
export interface CreateProjectRequestData {
  body: {
    name: string;
    description?: string;
  };
}

export interface CreateProjectResponseData {
  statusCode: number;
  body: {
    projectId: string;
  };
}
```

### 2. Define Contract

```typescript
// contracts.ts
import { defineRouteContract, defineRouterContract } from '@cosmneo/onion-lasagna/client';
import type { CreateProjectRequestData, CreateProjectResponseData } from './dtos';

export const createProjectContract = defineRouteContract<
  '/api/projects',
  'POST',
  CreateProjectRequestData,
  CreateProjectResponseData
>({
  path: '/api/projects',
  method: 'POST',
});

export const projectsRouter = defineRouterContract({
  create: createProjectContract,
});
```

### 3. Create Client

```typescript
// client.ts
import { createTypedClient } from '@cosmneo/onion-lasagna/client';
import { projectsRouter } from './contracts';

export const api = createTypedClient(projectsRouter, {
  baseUrl: process.env.API_URL,
});

// Usage: api.create({ body: { name: 'My Project' } })
```

### 4. Create Server Routes

```typescript
// routes.ts
import { createRouteFromContract } from '@cosmneo/onion-lasagna/backend/core/presentation';
import { createProjectContract } from './contracts';

export const routes = [
  createRouteFromContract({
    contract: createProjectContract,
    controller: createProjectController,
    requestDtoFactory: (req) => new CreateProjectRequestDto(req, validator),
  }),
];
```

### 5. Register Routes

```typescript
// server.ts
import { Hono } from 'hono';
import { registerHonoRoutes, onionErrorHandler } from '@cosmneo/onion-lasagna/backend/frameworks/hono';
import { routes } from './routes';

const app = new Hono();
app.onError(onionErrorHandler);
registerHonoRoutes(app, routes);

export default app;
```

## Benefits

1. **Single Source of Truth** - Path and method defined once, used everywhere
2. **Type Safety** - Full TypeScript inference for request/response types
3. **No Runtime Overhead** - Phantom types exist only at compile time
4. **Framework Agnostic** - Works with Hono, Elysia, Fastify, NestJS
5. **Tree Shakeable** - Client bundle never imports server code
6. **React Query Ready** - First-class hooks with typed query keys

## Architecture

The client is designed as a **core + extensions** pattern:

```
┌─────────────────────────────────────────────────────────────────┐
│                     @cosmneo/onion-lasagna/client               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Core Client (no framework dependencies)                  │  │
│  │  - createTypedClient()                                    │  │
│  │  - defineRouteContract(), defineRouterContract()          │  │
│  │  - Type inference, HTTP execution, caching, retry         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  /react-query   │  │   /vue-query    │  │      /swr       │
│  (extension)    │  │  (extension)    │  │    (future)     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

Each extension:
- Has its own entry point (`client/react-query`, `client/swr`, etc.)
- Declares framework as peer dependency (tree-shakeable)
- Builds on top of the core client

## Import Paths

| What | Import From |
|------|-------------|
| `defineRouteContract`, `defineRouterContract` | `@cosmneo/onion-lasagna/client` |
| `createTypedClient` | `@cosmneo/onion-lasagna/client` |
| `createTypedHooks` (React Query) | `@cosmneo/onion-lasagna/client/react-query` |
| `createTypedComposables` (Vue Query) | `@cosmneo/onion-lasagna/client/vue-query` |
| `createRouteFromContract` | `@cosmneo/onion-lasagna/backend/core/presentation` |
| `RouteContract`, `RouterContractConfig` (types) | `@cosmneo/onion-lasagna/shared/contracts` |
