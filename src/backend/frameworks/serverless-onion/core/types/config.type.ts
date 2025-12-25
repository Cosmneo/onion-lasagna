/**
 * CORS (Cross-Origin Resource Sharing) configuration.
 *
 * Configures the CORS headers included in HTTP responses.
 * All options are optional; omitted options use sensible defaults.
 *
 * @example Basic configuration
 * ```typescript
 * const cors: CorsConfig = {
 *   origin: 'https://myapp.com',
 *   credentials: true,
 * };
 * ```
 *
 * @example Multiple origins
 * ```typescript
 * const cors: CorsConfig = {
 *   origin: ['https://app.example.com', 'https://admin.example.com'],
 *   methods: ['GET', 'POST', 'PUT', 'DELETE'],
 * };
 * ```
 *
 * @example Disable CORS entirely
 * ```typescript
 * const config: ServerlessOnionConfig = {
 *   cors: false, // No CORS headers will be added
 * };
 * ```
 */
export interface CorsConfig {
  /**
   * The Access-Control-Allow-Origin header value.
   *
   * - `'*'` - Allow all origins (default)
   * - `string` - Allow a specific origin
   * - `string[]` - Allow multiple origins (will match against request origin)
   *
   * @default '*'
   */
  origin?: '*' | string | string[];

  /**
   * The Access-Control-Allow-Methods header value.
   *
   * @default ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
   */
  methods?: string[];

  /**
   * The Access-Control-Allow-Headers header value.
   *
   * @default ['Content-Type', 'Authorization']
   */
  allowHeaders?: string[];

  /**
   * The Access-Control-Expose-Headers header value.
   * Headers that the browser should expose to the frontend JavaScript code.
   *
   * @default undefined (not set)
   */
  exposeHeaders?: string[];

  /**
   * Whether to include Access-Control-Allow-Credentials: true.
   *
   * **Note:** When `credentials` is true, `origin` cannot be '*'.
   * If origin is '*' and credentials is true, origin will be set to
   * the request's Origin header.
   *
   * @default false
   */
  credentials?: boolean;

  /**
   * The Access-Control-Max-Age header value in seconds.
   * How long the preflight request can be cached.
   *
   * @default 86400 (24 hours)
   */
  maxAge?: number;
}

/**
 * Serverless-onion framework configuration.
 *
 * Provides a unified configuration interface for all framework features.
 * Pass this to handler factories to customize behavior.
 *
 * @example
 * ```typescript
 * export const handler = createLambdaHandler({
 *   controller: myController,
 *   config: {
 *     cors: {
 *       origin: 'https://myapp.com',
 *       credentials: true,
 *     },
 *   },
 * });
 * ```
 *
 * @example Disable CORS
 * ```typescript
 * export const handler = createLambdaHandler({
 *   controller: myController,
 *   config: {
 *     cors: false,
 *   },
 * });
 * ```
 */
export interface ServerlessOnionConfig {
  /**
   * CORS configuration.
   *
   * - `CorsConfig` - Configure CORS headers
   * - `false` - Disable CORS headers entirely
   * - `undefined` - Use default CORS (allow all origins)
   *
   * @default undefined (uses default permissive CORS)
   */
  cors?: CorsConfig | false;
}

/**
 * Default CORS methods.
 */
export const DEFAULT_CORS_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'] as const;

/**
 * Default CORS allowed headers.
 */
export const DEFAULT_CORS_ALLOW_HEADERS = ['Content-Type', 'Authorization'] as const;

/**
 * Default CORS max age in seconds (24 hours).
 */
export const DEFAULT_CORS_MAX_AGE = 86400;
