/**
 * @fileoverview Shared route contract definitions for typed client and server integration.
 *
 * This module provides the single source of truth for route definitions that work
 * with both the typed HTTP client and server-side framework registration.
 *
 * @example Client usage
 * ```typescript
 * import { defineRouterContract, createTypedClient } from '@cosmneo/onion-lasagna/client';
 * import { createProjectContract, listProjectsContract } from './contracts';
 *
 * const router = defineRouterContract({
 *   projects: {
 *     create: createProjectContract,
 *     list: listProjectsContract,
 *   },
 * });
 *
 * const api = createTypedClient(router, { baseUrl: 'http://localhost:3000' });
 * const project = await api.projects.create({ body: { name: 'My Project' } });
 * ```
 *
 * @example Server usage
 * ```typescript
 * import { createRouteFromContract } from '@cosmneo/onion-lasagna/backend/core/presentation';
 * import { createProjectContract } from './contracts';
 *
 * const routes = [
 *   createRouteFromContract({
 *     contract: createProjectContract,
 *     controller: createProjectController,
 *     requestDtoFactory: (req) => new CreateProjectRequestDto(req, validator),
 *   }),
 * ];
 *
 * registerHonoRoutes(app, routes);
 * ```
 *
 * @module shared/contracts
 */

// Route contract types
export {
  type HttpMethod,
  type BodyMethod,
  type NoBodyMethod,
  type RequestDataShape,
  type EmptyRequestData,
  type ResponseDataShape,
  type ExtractResponseBody,
  type RouteContract,
  isRouteContract,
} from './route-contract.type';

// Route contract factories
export {
  type RouteContractConfig,
  type ServiceMetadataForContract,
  type ResourceMetadataForContract,
  type EndpointMetadataForContract,
  type MetadataRouteContractConfig,
  defineRouteContract,
  defineRouteContractFromMetadata,
} from './define-route-contract';

// Router contract types and factory
export {
  type RouterContractConfig,
  isRouterContractConfig,
  defineRouterContract,
} from './router-contract.type';
