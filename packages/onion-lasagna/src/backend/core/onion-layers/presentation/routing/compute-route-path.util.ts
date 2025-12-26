import type { HttpEndpointMetadata } from '../interfaces/types/metadata/http-endpoint-metadata.type';
import type { ResourceMetadata } from '../interfaces/types/metadata/resource-metadata.type';
import type { ServiceMetadata } from '../interfaces/types/metadata/service-metadata.type';

/**
 * Normalizes a path segment by removing leading/trailing slashes.
 */
function trimSlashes(segment: string): string {
  return segment.replace(/^\/+|\/+$/g, '');
}

/**
 * Computes the full route path from service, resource, and endpoint metadata.
 *
 * Handles path normalization:
 * - Ensures leading slash
 * - Joins segments with single slashes
 * - Removes trailing slash (except for root)
 *
 * @example
 * ```typescript
 * computeRoutePath(
 *   { basePath: '/user-service' },
 *   { path: '/users' },
 *   { path: '/{id}' }
 * ); // => '/user-service/users/{id}'
 * ```
 */
export function computeRoutePath(
  service: Pick<ServiceMetadata, 'basePath'>,
  resource: Pick<ResourceMetadata, 'path'>,
  endpoint: Pick<HttpEndpointMetadata, 'path'>,
): string {
  const segments = [service.basePath, resource.path, endpoint.path]
    .map(trimSlashes)
    .filter((s) => s.length > 0);

  if (segments.length === 0) {
    return '/';
  }

  return '/' + segments.join('/');
}
