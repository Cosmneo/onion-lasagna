/**
 * @fileoverview Factory functions for creating RouteContract instances.
 *
 * Provides two ways to define route contracts:
 * 1. `defineRouteContract` - Define with explicit path
 * 2. `defineRouteContractFromMetadata` - Compute path from service/resource/endpoint metadata
 *
 * @module define-route-contract
 */

import type {
  HttpMethod,
  RequestDataShape,
  ResponseDataShape,
  RouteContract,
} from './route-contract.type';

// ═══════════════════════════════════════════════════════════════════════════════
// SIMPLE ROUTE CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for defining a route contract with explicit path.
 */
export interface RouteContractConfig<TPath extends string, TMethod extends HttpMethod> {
  /** The full route path (e.g., '/api/projects/{projectId}'). */
  path: TPath;
  /** The HTTP method for this route. */
  method: TMethod;
}

/**
 * Defines a route contract with explicit path and method.
 * Request and response types are specified via type parameters.
 *
 * @typeParam TPath - The route path literal type
 * @typeParam TMethod - The HTTP method literal type
 * @typeParam TRequest - The request data interface
 * @typeParam TResponse - The response data interface
 *
 * @example
 * ```typescript
 * import type { CreateProjectRequestData, CreateProjectResponseData } from './dtos';
 *
 * export const createProjectContract = defineRouteContract<
 *   '/api/projects/',
 *   'POST',
 *   CreateProjectRequestData,
 *   CreateProjectResponseData
 * >({
 *   path: '/api/projects/',
 *   method: 'POST',
 * });
 * ```
 */
export function defineRouteContract<
  TPath extends string,
  TMethod extends HttpMethod,
  TRequest extends RequestDataShape = RequestDataShape,
  TResponse extends ResponseDataShape = ResponseDataShape,
>(config: RouteContractConfig<TPath, TMethod>): RouteContract<TPath, TMethod, TRequest, TResponse> {
  return {
    path: config.path,
    method: config.method,
    _types: {} as { request: TRequest; response: TResponse },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// METADATA-BASED ROUTE CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Minimal service metadata required for path computation.
 */
export interface ServiceMetadataForContract {
  /** Service base path prefix (e.g., '/api/projects'). */
  basePath: string;
}

/**
 * Minimal resource metadata required for path computation.
 */
export interface ResourceMetadataForContract {
  /** Resource path segment relative to service basePath (e.g., '/tasks'). */
  path: string;
}

/**
 * Minimal endpoint metadata required for path computation.
 */
export interface EndpointMetadataForContract<TMethod extends HttpMethod = HttpMethod> {
  /** Endpoint-relative path (e.g., '/{id}' or '/'). */
  path: string;
  /** The HTTP method for this endpoint. */
  method: TMethod;
}

/**
 * Configuration for defining a route contract from metadata.
 */
export interface MetadataRouteContractConfig<TMethod extends HttpMethod> {
  /** Service metadata providing the base path. */
  service: ServiceMetadataForContract;
  /** Resource metadata providing the resource path segment. */
  resource: ResourceMetadataForContract;
  /** Endpoint metadata providing the endpoint path and method. */
  endpoint: EndpointMetadataForContract<TMethod>;
}

/**
 * Normalizes a path segment by removing leading/trailing slashes.
 */
function trimSlashes(segment: string): string {
  return segment.replace(/^\/+|\/+$/g, '');
}

/**
 * Computes the full route path from service, resource, and endpoint paths.
 * Same logic as computeRoutePath in presentation layer.
 */
function computePath(
  service: ServiceMetadataForContract,
  resource: ResourceMetadataForContract,
  endpoint: EndpointMetadataForContract,
): string {
  const segments = [service.basePath, resource.path, endpoint.path]
    .map(trimSlashes)
    .filter((s) => s.length > 0);

  if (segments.length === 0) {
    return '/';
  }

  return '/' + segments.join('/');
}

/**
 * Defines a route contract by computing the path from service/resource/endpoint metadata.
 * This ensures the client and server use the exact same path.
 *
 * @typeParam TMethod - The HTTP method literal type
 * @typeParam TRequest - The request data interface
 * @typeParam TResponse - The response data interface
 *
 * @example
 * ```typescript
 * import { projectManagementServiceMetadata } from '../service.metadata';
 * import { projectsResourceMetadata } from '../projects/route.metadata';
 * import { createProjectEndpointMetadata } from './endpoint.metadata';
 * import type { CreateProjectRequestData, CreateProjectResponseData } from './dtos';
 *
 * export const createProjectContract = defineRouteContractFromMetadata<
 *   'POST',
 *   CreateProjectRequestData,
 *   CreateProjectResponseData
 * >({
 *   service: projectManagementServiceMetadata,
 *   resource: projectsResourceMetadata,
 *   endpoint: createProjectEndpointMetadata,
 * });
 * ```
 */
export function defineRouteContractFromMetadata<
  TMethod extends HttpMethod,
  TRequest extends RequestDataShape = RequestDataShape,
  TResponse extends ResponseDataShape = ResponseDataShape,
>(
  config: MetadataRouteContractConfig<TMethod>,
): RouteContract<string, TMethod, TRequest, TResponse> {
  const path = computePath(config.service, config.resource, config.endpoint);

  return {
    path,
    method: config.endpoint.method,
    _types: {} as { request: TRequest; response: TResponse },
  };
}
