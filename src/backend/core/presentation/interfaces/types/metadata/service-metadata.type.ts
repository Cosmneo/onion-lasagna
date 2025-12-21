/**
 * Service metadata.
 *
 * Describes a service (bounded context / API surface) in a stable, serializable way.
 *
 * Intended use:
 * - building OpenAPI specs (grouping, base paths)
 * - generating clients/docs
 * - consistent identification across repos
 */
export interface ServiceMetadata {
  // ═══════════════════════════════════════════════════════════════════════════
  // IDENTITY (required — routing, logging, code generation)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Stable identifier for the service.
   *
   * Recommendation: kebab-case and unique across the system.
   * Example: `user-service`
   */
  id: string;

  /**
   * Short identifier used in logs, URLs, or UI labels.
   *
   * Recommendation: short kebab-case.
   * Example: `user`
   */
  shortId: string;

  /**
   * Human-readable service name.
   *
   * Example: `User Service`
   */
  name: string;

  /**
   * Human-readable description of the service.
   */
  description: string;

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN (service-specific — routing)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Service base path prefix used to namespace HTTP routes.
   *
   * Example: `/user-service`
   */
  basePath: string;

  // ═══════════════════════════════════════════════════════════════════════════
  // OPENAPI (required — documentation generation)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * OpenAPI-specific configuration for per-service spec generation.
   */
  openApi: {
    /**
     * OpenAPI info.title for per-service spec.
     *
     * Example: `User Service API`
     */
    title: string;

    /**
     * OpenAPI info.description for per-service spec.
     * If not set, uses the service's `description`.
     */
    description?: string;
  };
}
