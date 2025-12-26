import type { SchemeNamesOf, SecurityRequirementOf } from './system-metadata.type';

/**
 * Allowed HTTP methods for endpoint metadata.
 */
export type HttpEndpointMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Allowed HTTP success status codes.
 */
export type HttpSuccessStatus = 200 | 201 | 202 | 204;

/**
 * OpenAPI-specific fields for endpoint metadata (loosely typed).
 */
export interface HttpEndpointOpenApi {
  /**
   * OpenAPI operation summary.
   * Overrides `description` for the summary field if set.
   */
  summary?: string;

  /**
   * OpenAPI operation description (detailed).
   * Overrides `description` for the description field if set.
   */
  description?: string;

  /**
   * Explicit OpenAPI operationId.
   * Defaults to endpoint `name` if not set.
   */
  operationId?: string;

  /**
   * Override resource tag(s) for this endpoint.
   * Defaults to resource's openApi.tag or name if not set.
   */
  tags?: string[];

  /**
   * Mark endpoint as deprecated in OpenAPI documentation.
   * @default false
   */
  deprecated?: boolean;

  /**
   * HTTP success status code for OpenAPI documentation.
   *
   * @default Derived from HTTP method:
   * - GET: 200
   * - POST: 201
   * - PUT: 200
   * - PATCH: 200
   * - DELETE: 204
   */
  successStatus?: HttpSuccessStatus;

  /**
   * Explicit OpenAPI `security` requirements for this endpoint.
   *
   * OpenAPI semantics:
   * - The array is OR (any requirement can satisfy).
   * - Each object is AND (all schemes in the object are required together).
   *
   * Examples:
   * - Public endpoint (overrides any global security): `[]`
   * - Require api key: `[ { apiKeyAuth: [] } ]`
   * - Allow either api key OR bearer: `[ { apiKeyAuth: [] }, { bearerAuth: [] } ]`
   */
  security?: Record<string, string[]>[];
}

/**
 * OpenAPI-specific fields for endpoint metadata (strongly typed security).
 */
export interface HttpEndpointOpenApiFor<TSystem> extends Omit<HttpEndpointOpenApi, 'security'> {
  /**
   * Explicit OpenAPI `security` requirements for this endpoint.
   * Scheme names are validated against the system metadata at compile time.
   */
  security?: SecurityRequirementOf<SchemeNamesOf<TSystem>>;
}

/**
 * HTTP endpoint metadata.
 *
 * Describes an HTTP endpoint in a stable, serializable way.
 *
 * Intended use:
 * - documentation (OpenAPI generation)
 * - HTTP client generation
 * - consistent endpoint identification (id/shortId)
 */
export interface HttpEndpointMetadata {
  // ═══════════════════════════════════════════════════════════════════════════
  // IDENTITY (required — routing, logging, code generation)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Stable endpoint identifier.
   *
   * Recommendation: kebab-case.
   * Example: `get-user-by-id`
   */
  id: string;

  /**
   * Short endpoint identifier.
   *
   * Useful for logs/metrics.
   * Example: `gubi`
   */
  shortId: string;

  /**
   * Stable endpoint name used in code.
   *
   * Recommendation: camelCase.
   * Example: `getUserById`
   */
  name: string;

  /**
   * Human-readable description.
   *
   * Used as default for OpenAPI summary/description.
   */
  description: string;

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN (endpoint-specific — routing)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Endpoint-relative path (without service or resource path).
   *
   * Combined with service basePath and resource path to form the full route.
   * Use `computeRoutePath()` to compute the full path when needed.
   *
   * Example: `/{id}` or `/` for collection endpoints
   */
  path: string;

  /**
   * HTTP method.
   */
  method: HttpEndpointMethod;

  // ═══════════════════════════════════════════════════════════════════════════
  // OPENAPI (optional — documentation generation)
  // Override pattern: openApi.xxx overrides base xxx
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * OpenAPI-specific overrides for this endpoint.
   */
  openApi?: HttpEndpointOpenApi;
}

/**
 * HTTP endpoint metadata with strongly-typed `openApi.security`.
 *
 * Use this to get compile-time validation of security scheme names
 * against a SystemMetadata constant.
 *
 * @example
 * import type { HttpEndpointMetadataFor } from '@cosmneo/org-lib-backend-common-kit';
 * import { systemMetadata } from '@/contracts/system-metadata';
 *
 * export const getUserHttpMetadata: HttpEndpointMetadataFor<typeof systemMetadata> = {
 *   id: 'get-user',
 *   // ...
 *   openApi: {
 *     security: [{ apiKeyAuth: [] }],  // ✅ Compile-time checked!
 *   },
 * };
 */
export interface HttpEndpointMetadataFor<TSystem> extends Omit<HttpEndpointMetadata, 'openApi'> {
  /**
   * OpenAPI-specific overrides for this endpoint (with typed security).
   */
  openApi?: HttpEndpointOpenApiFor<TSystem>;
}
