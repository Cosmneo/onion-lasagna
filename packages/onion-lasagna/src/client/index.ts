/**
 * Typed HTTP Client for onion-lasagna
 *
 * Create type-safe HTTP clients that infer types from RouteContract definitions.
 * No code generation required - types are inferred at compile-time.
 *
 * RouteContract is the single source of truth for route definitions that works
 * with both the typed HTTP client and server-side route registration.
 *
 * @example
 * ```typescript
 * import { defineRouteContract, defineRouterContract, createTypedClient } from '@cosmneo/onion-lasagna/client';
 * import type { CreateProjectRequestData, CreateProjectResponseData } from './dtos';
 *
 * // Define route contract (single source of truth)
 * const createProjectContract = defineRouteContract<
 *   '/api/projects/',
 *   'POST',
 *   CreateProjectRequestData,
 *   CreateProjectResponseData
 * >({
 *   path: '/api/projects/',
 *   method: 'POST',
 * });
 *
 * // Group into router
 * const router = defineRouterContract({
 *   projects: { create: createProjectContract },
 * });
 *
 * // Create client
 * const client = createTypedClient(router, { baseUrl: 'http://localhost:3000' });
 *
 * // Use with full type safety!
 * const project = await client.projects.create({ body: { name: 'My Project' } });
 * ```
 *
 * @example Using metadata (computes path from service/resource/endpoint)
 * ```typescript
 * import { defineRouteContractFromMetadata } from '@cosmneo/onion-lasagna/client';
 *
 * const createProjectContract = defineRouteContractFromMetadata<
 *   'POST',
 *   CreateProjectRequestData,
 *   CreateProjectResponseData
 * >({
 *   service: projectManagementServiceMetadata,
 *   resource: projectsResourceMetadata,
 *   endpoint: createProjectEndpointMetadata,
 * });
 * ```
 *
 * @packageDocumentation
 */

// Route contract definition
export {
  defineRouteContract,
  defineRouteContractFromMetadata,
} from '../shared/contracts';
export type {
  RouteContractConfig,
  ServiceMetadataForContract,
  ResourceMetadataForContract,
  EndpointMetadataForContract,
  MetadataRouteContractConfig,
} from '../shared/contracts';

// Router contract definition
export { defineRouterContract } from '../shared/contracts';

// Core types
export type {
  RouteContract,
  RouterContractConfig,
} from '../shared/contracts';
export { isRouteContract } from '../shared/contracts';

// Client factory
export { createTypedClient } from './create-typed-client';

// Types
export type {
  // HTTP methods
  HttpMethod,
  BodyMethod,
  NoBodyMethod,
  // Request/Response shapes
  RequestDataShape,
  EmptyRequestData,
  ResponseDataShape,
  ExtractResponseBody,
  // Client types
  InferClient,
  InferClientMethod,
  ConfigurableClient,
  // Configuration
  ClientConfig,
  RetryConfig,
  CacheConfig,
  ResponseContext,
  RequestContext,
} from './types';

// Client error
export { ClientError } from './types';
