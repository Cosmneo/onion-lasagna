import type { HttpResponse } from '../../../../core/onion-layers/presentation/interfaces/types/http';
import type { HttpException } from '../exceptions';
import type { CorsConfig, ServerlessOnionConfig } from '../types';

/**
 * Options passed to response mapping functions.
 */
export interface ResponseMappingOptions {
  /**
   * CORS configuration from handler config.
   * - `CorsConfig` - Apply custom CORS
   * - `false` - Disable CORS headers
   * - `undefined` - Use default permissive CORS
   */
  cors?: CorsConfig | false;

  /**
   * The Origin header from the incoming request.
   * Used for dynamic origin matching with CORS.
   */
  requestOrigin?: string;
}

/**
 * Platform adapter interface for handler factories.
 *
 * Each runtime (AWS Lambda, Cloudflare Workers, etc.) implements this interface
 * to provide platform-specific request extraction and response mapping.
 *
 * The core handler logic uses these adapters to remain platform-agnostic.
 *
 * @typeParam TPlatformRequest - The platform's native request type
 * @typeParam TPlatformResponse - The platform's native response type
 *
 * @example AWS Lambda adapter
 * ```typescript
 * const awsAdapter: PlatformAdapter<APIGatewayProxyEventV2, APIGatewayProxyResultV2> = {
 *   extractBody: (event) => parseBody(event.body),
 *   extractHeaders: (event) => event.headers ?? {},
 *   extractQueryParams: (event) => event.queryStringParameters ?? {},
 *   mapResponse: (response, options) => ({
 *     statusCode: response.statusCode,
 *     body: JSON.stringify(response.body),
 *     headers: mapResponseHeaders(response.headers, options),
 *   }),
 *   mapExceptionToResponse: (exception, options) => ({
 *     statusCode: exception.statusCode,
 *     body: JSON.stringify(exception.toResponse()),
 *     headers: mapResponseHeaders(undefined, options),
 *   }),
 * };
 * ```
 *
 * @example Cloudflare Workers adapter
 * ```typescript
 * const cfAdapter: PlatformAdapter<Request, Response> = {
 *   extractBody: async (request) => await request.clone().json().catch(() => undefined),
 *   extractHeaders: (request) => Object.fromEntries(request.headers.entries()),
 *   extractQueryParams: (request) => Object.fromEntries(new URL(request.url).searchParams),
 *   mapResponse: (response, options) => new Response(
 *     JSON.stringify(response.body),
 *     { status: response.statusCode, headers: mapResponseHeaders(response.headers, options) },
 *   ),
 *   mapExceptionToResponse: (exception, options) => new Response(
 *     JSON.stringify(exception.toResponse()),
 *     { status: exception.statusCode, headers: mapResponseHeaders(undefined, options) },
 *   ),
 * };
 * ```
 */
export interface PlatformAdapter<TPlatformRequest, TPlatformResponse> {
  /**
   * Extracts the request body from the platform request.
   *
   * May return a Promise for platforms that require async body reading
   * (e.g., Cloudflare Workers with Web API Request).
   *
   * @returns The parsed body, or undefined if no body is present
   */
  extractBody: (request: TPlatformRequest) => unknown | Promise<unknown>;

  /**
   * Extracts request headers as a flat key-value map.
   *
   * @returns Headers as Record<string, string>
   */
  extractHeaders: (request: TPlatformRequest) => Record<string, string>;

  /**
   * Extracts query string parameters from the platform request.
   *
   * Values may be arrays for repeated parameters (e.g., `?ids=1&ids=2`).
   *
   * @returns Query parameters as Record<string, string | string[]>
   */
  extractQueryParams: (request: TPlatformRequest) => Record<string, string | string[]>;

  /**
   * Extracts the Origin header from the request.
   * Used for dynamic CORS origin matching.
   *
   * @returns The Origin header value, or undefined if not present
   */
  extractOrigin?: (request: TPlatformRequest) => string | undefined;

  /**
   * Converts an HttpResponse to the platform's native response type.
   *
   * @param response - The HttpResponse to convert
   * @param options - CORS and other response options
   */
  mapResponse: (response: HttpResponse, options?: ResponseMappingOptions) => TPlatformResponse;

  /**
   * Converts an HttpException to the platform's native response type.
   * Used by the exception handler wrapper.
   *
   * @param exception - The HttpException to convert
   * @param options - CORS and other response options
   */
  mapExceptionToResponse: (
    exception: HttpException,
    options?: ResponseMappingOptions,
  ) => TPlatformResponse;
}

/**
 * Extended adapter for proxy/router handlers.
 *
 * Extends {@link PlatformAdapter} with routing information extraction.
 * Use this for multi-route handlers that need to resolve controllers based on path/method.
 *
 * @typeParam TPlatformRequest - The platform's native request type
 * @typeParam TPlatformResponse - The platform's native response type
 *
 * @example AWS Lambda adapter
 * ```typescript
 * const awsProxyAdapter: PlatformProxyAdapter<APIGatewayProxyEventV2, APIGatewayProxyResultV2> = {
 *   extractRouteInfo: (event) => ({
 *     path: event.rawPath,
 *     method: event.requestContext.http.method,
 *   }),
 *   extractBody: (event) => parseBody(event.body),
 *   extractHeaders: (event) => event.headers ?? {},
 *   extractQueryParams: (event) => event.queryStringParameters ?? {},
 *   mapResponse: (response, options) => ({ statusCode: response.statusCode, body: JSON.stringify(response.body) }),
 *   mapExceptionToResponse: (exception, options) => ({ statusCode: exception.statusCode, body: JSON.stringify(exception.toResponse()) }),
 * };
 * ```
 *
 * @example Cloudflare Workers adapter
 * ```typescript
 * const cfProxyAdapter: PlatformProxyAdapter<Request, Response> = {
 *   extractRouteInfo: (request) => ({
 *     path: new URL(request.url).pathname,
 *     method: request.method,
 *   }),
 *   extractBody: async (request) => await request.clone().json().catch(() => undefined),
 *   extractHeaders: (request) => Object.fromEntries(request.headers.entries()),
 *   extractQueryParams: (request) => Object.fromEntries(new URL(request.url).searchParams),
 *   mapResponse: (response, options) => new Response(JSON.stringify(response.body), { status: response.statusCode }),
 *   mapExceptionToResponse: (exception, options) => new Response(JSON.stringify(exception.toResponse()), { status: exception.statusCode }),
 * };
 * ```
 */
export interface PlatformProxyAdapter<TPlatformRequest, TPlatformResponse> extends PlatformAdapter<
  TPlatformRequest,
  TPlatformResponse
> {
  /**
   * Extracts path and HTTP method from the platform request.
   * Used to resolve the correct controller from the routing map.
   */
  extractRouteInfo: (request: TPlatformRequest) => RouteInfo;
}

/**
 * Route information extracted from a platform request.
 */
export interface RouteInfo {
  path: string;
  method: string;
}

/**
 * Resolves CORS configuration from ServerlessOnionConfig.
 *
 * @param config - The serverless onion config
 * @returns CORS config, false to disable, or undefined for defaults
 */
export function resolveCorsConfig(config?: ServerlessOnionConfig): CorsConfig | false | undefined {
  if (!config) return undefined;
  return config.cors;
}
