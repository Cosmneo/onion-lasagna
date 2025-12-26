/**
 * Resource metadata.
 *
 * A "resource" is a group of endpoints inside a service (often aligned with a domain aggregate
 * or a REST-ish resource folder like `organization-membership-invite`).
 *
 * Intended use:
 * - OpenAPI tags (2nd-level grouping)
 * - stable tag naming/ordering independent of folder name changes
 */
export interface ResourceMetadata {
  // ═══════════════════════════════════════════════════════════════════════════
  // IDENTITY (required — routing, logging, code generation)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Stable identifier for the resource.
   *
   * Recommendation: kebab-case and matches its folder name.
   * Example: `organization-membership-invite`
   */
  id: string;

  /**
   * Short identifier used in logs or metrics.
   *
   * Recommendation: short kebab-case.
   * Example: `org-invite`
   */
  shortId: string;

  /**
   * Human-readable resource name.
   *
   * Example: `Organization Membership Invite`
   */
  name: string;

  /**
   * Human-readable description of the resource.
   */
  description: string;

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN (resource-specific — routing, ordering)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Resource path segment (relative to service basePath).
   *
   * Combined with service basePath and endpoint path to form the full route.
   *
   * Example: `/users`
   */
  path: string;

  /**
   * Explicit ordering for UI grouping within the service.
   *
   * Lower numbers come first.
   */
  order: number;

  // ═══════════════════════════════════════════════════════════════════════════
  // OPENAPI (required — documentation generation)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * OpenAPI-specific configuration for tag generation.
   */
  openApi: {
    /**
     * OpenAPI tag display name.
     *
     * Example: `Organization Membership Invite`
     */
    tag: string;

    /**
     * OpenAPI tag description shown in documentation.
     */
    tagDescription: string;
  };
}
