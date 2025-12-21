/**
 * System metadata.
 *
 * Top-level metadata for the whole API surface ("the system"), sitting above
 * individual services/resources/endpoints.
 *
 * This is intentionally stable and serializable so it can be consumed by tools
 * (OpenAPI generation, docs, code generation).
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Auth Scheme Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * API Key authentication scheme (header, query, or cookie).
 */
export interface ApiKeyAuthScheme {
  type: 'apiKey';
  in: 'header' | 'query' | 'cookie';
  /** Header/query/cookie parameter name, e.g. 'x-api-key' */
  name: string;
  description?: string;
}

/**
 * HTTP Bearer authentication scheme.
 */
export interface HttpBearerAuthScheme {
  type: 'http';
  scheme: 'bearer';
  bearerFormat?: string;
  description?: string;
}

/**
 * HTTP Basic authentication scheme.
 */
export interface HttpBasicAuthScheme {
  type: 'http';
  scheme: 'basic';
  description?: string;
}

/**
 * Union of all supported authentication schemes.
 */
export type AuthScheme = ApiKeyAuthScheme | HttpBearerAuthScheme | HttpBasicAuthScheme;

// ═══════════════════════════════════════════════════════════════════════════════
// System Metadata Type
// ═══════════════════════════════════════════════════════════════════════════════

export interface SystemMetadata {
  // ═══════════════════════════════════════════════════════════════════════════
  // IDENTITY (required — routing, logging, code generation)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Stable system identifier.
   *
   * Recommendation: kebab-case.
   * Example: `acmp-connector`
   */
  id: string;

  /**
   * Short identifier for compact displays/logging.
   *
   * Example: `acmp`
   */
  shortId: string;

  /**
   * Human-readable system name.
   *
   * Example: `ACMP Connector`
   */
  name: string;

  /**
   * Human-readable description.
   */
  description?: string;

  /**
   * System/API version (SemVer recommended).
   *
   * Example: `1.0.0`
   */
  version: string;

  // ═══════════════════════════════════════════════════════════════════════════
  // DOMAIN (system-specific — servers, auth)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Default servers for the API.
   * Used by OpenAPI generation and client configuration.
   */
  servers?: Array<{
    url: string;
    description?: string;
  }>;

  /**
   * Authentication configuration.
   */
  auth?: {
    /**
     * Whether endpoints should be considered secure by default.
     * @default true
     */
    secureByDefault?: boolean;

    /**
     * Available authentication schemes.
     *
     * Keyed by scheme name (must be unique within the system).
     * Example: `{ apiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' } }`
     */
    schemes: Record<string, AuthScheme>;

    /**
     * Default security requirements (applies to all secure endpoints).
     *
     * OpenAPI semantics:
     * - Array is OR (any requirement can satisfy)
     * - Object is AND (all schemes required together)
     *
     * Example: `[{ apiKeyAuth: [] }]`
     */
    defaultSecurity?: Array<Record<string, string[]>>;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // OPENAPI (optional — documentation generation)
  // Override pattern: openApi.xxx overrides base xxx
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * OpenAPI-specific overrides for global spec generation.
   */
  openApi?: {
    /**
     * OpenAPI info.title.
     * Overrides `name` if set.
     */
    title?: string;

    /**
     * OpenAPI info.description.
     * Overrides `description` if set.
     */
    description?: string;

    /**
     * OpenAPI info.termsOfService URL.
     */
    termsOfService?: string;

    /**
     * OpenAPI info.contact.
     */
    contact?: {
      name?: string;
      url?: string;
      email?: string;
    };

    /**
     * OpenAPI info.license.
     */
    license?: {
      name: string;
      url?: string;
    };
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utility Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extracts the scheme names (keys) from a SystemMetadata constant.
 *
 * @example
 * const systemMeta = { auth: { schemes: { apiKeyAuth: {...}, bearerAuth: {...} } } } as const;
 * type Names = SchemeNamesOf<typeof systemMeta>; // 'apiKeyAuth' | 'bearerAuth'
 */
export type SchemeNamesOf<TSystem> = TSystem extends {
  auth: { schemes: infer S };
}
  ? keyof S & string
  : never;

/**
 * Creates a typed OpenAPI security requirement array from scheme names.
 *
 * @example
 * type Req = SecurityRequirementOf<'apiKeyAuth' | 'bearerAuth'>;
 * // Array<Partial<Record<'apiKeyAuth' | 'bearerAuth', string[]>>>
 */
export type SecurityRequirementOf<TSchemeNames extends string> = Array<
  Partial<Record<TSchemeNames, string[]>>
>;

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Function
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input type for defineSystemMetadata helper (with generic auth).
 */
type SystemMetadataInput<TSchemeNames extends string> = Omit<SystemMetadata, 'auth'> & {
  auth?: {
    secureByDefault?: boolean;
    schemes: Record<TSchemeNames, AuthScheme>;
    defaultSecurity?: Array<Partial<Record<TSchemeNames, string[]>>>;
  };
};

/**
 * Defines system metadata with fully-typed `defaultSecurity`.
 *
 * Infers scheme names from the `schemes` object and validates that
 * `defaultSecurity` only references existing scheme names.
 *
 * @example
 * export const systemMetadata = defineSystemMetadata({
 *   id: 'my-api',
 *   shortId: 'api',
 *   name: 'My API',
 *   version: '1.0.0',
 *   auth: {
 *     schemes: {
 *       apiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
 *     },
 *     defaultSecurity: [{ apiKeyAuth: [] }],  // ✅ Valid
 *     // defaultSecurity: [{ typoAuth: [] }], // ❌ TypeScript error!
 *   },
 * });
 */
export function defineSystemMetadata<const TSchemeNames extends string>(
  metadata: SystemMetadataInput<TSchemeNames>,
): SystemMetadataInput<TSchemeNames> & SystemMetadata {
  return metadata as SystemMetadataInput<TSchemeNames> & SystemMetadata;
}
