/**
 * @fileoverview Core routing types for the presentation layer.
 *
 * This module provides framework-agnostic routing abstractions that can be
 * used with any HTTP framework (Hono, Fastify, Elysia, etc.).
 *
 * @example Basic route definition
 * ```typescript
 * import type { RouteInput } from '@cosmneo/onion-lasagna/backend/core/presentation';
 *
 * const getUserRoute: RouteInput<GetUserRequestDto, GetUserResponseDto> = {
 *   metadata: { path: '/users/{id}', method: 'GET' },
 *   controller: getUserController,
 *   requestDtoFactory: (req) => GetUserRequestDto.create(req),
 * };
 * ```
 *
 * @module routing
 */

import type { BaseDto } from '../../../global/classes/base-dto.class';
import type { Controller } from '../interfaces/types/controller.type';
import type { HttpRequest } from '../interfaces/types/http/http-request';
import type { HttpResponse } from '../interfaces/types/http/http-response';

// ═══════════════════════════════════════════════════════════════════════════════
// HTTP METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Standard HTTP methods supported by the routing system.
 *
 * Includes all methods commonly used in RESTful APIs:
 * - `GET` - Retrieve a resource
 * - `POST` - Create a new resource
 * - `PUT` - Replace a resource
 * - `PATCH` - Partially update a resource
 * - `DELETE` - Remove a resource
 * - `OPTIONS` - CORS preflight and capability discovery
 * - `HEAD` - Retrieve headers only (no body)
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE METADATA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * HTTP endpoint metadata defining the route's method and path.
 *
 * Path parameters use curly brace syntax (`{param}`) which is framework-agnostic.
 * Each framework adapter converts this to its native format:
 * - Hono/Express: `/users/:id`
 * - Fastify: `/users/:id`
 * - AWS API Gateway: `/users/{id}`
 *
 * The `path` should be the full route path (computed from service + resource + endpoint
 * using `computeRoutePath()` when needed).
 *
 * @example Simple route
 * ```typescript
 * const metadata: RouteMetadata = {
 *   path: '/health',
 *   method: 'GET',
 * };
 * ```
 *
 * @example Route with path parameters
 * ```typescript
 * const metadata: RouteMetadata = {
 *   path: '/users/{userId}/orders/{orderId}',
 *   method: 'GET',
 * };
 * ```
 */
export interface RouteMetadata {
  /**
   * Full path pattern for the route.
   *
   * Uses curly brace syntax for path parameters: `/users/{id}`
   *
   * This should be the complete path including service and resource segments.
   * Use `computeRoutePath()` to compute from service, resource, and endpoint metadata.
   *
   * @example '/users'
   * @example '/users/{id}'
   * @example '/organizations/{orgId}/members/{memberId}'
   */
  path: string;

  /**
   * The HTTP method for this route.
   *
   * Accepts either uppercase (`'GET'`) or lowercase (`'get'`) format.
   * Framework adapters normalize to lowercase for registration.
   */
  method: HttpMethod | Uppercase<HttpMethod> | Lowercase<HttpMethod>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST DTO FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Factory function that creates a validated request DTO from an HTTP request.
 *
 * This factory is called by framework adapters to transform the HTTP request
 * (body, headers, query params, path params) into a validated DTO before passing
 * to the controller.
 *
 * @typeParam TRequestDto - The validated request DTO type (must extend BaseDto)
 *
 * @example Creating from HttpRequest
 * ```typescript
 * const factory: RequestDtoFactory<CreateUserRequestDto> = (req) =>
 *   CreateUserRequestDto.create({
 *     name: req.body.name,
 *     email: req.body.email,
 *   });
 * ```
 *
 * @example With path parameters
 * ```typescript
 * const factory: RequestDtoFactory<GetUserRequestDto> = (req) =>
 *   GetUserRequestDto.create({
 *     userId: req.pathParams?.id,
 *   });
 * ```
 */
export type RequestDtoFactory<TRequestDto extends BaseDto<unknown> = BaseDto<unknown>> = (
  request: HttpRequest,
) => TRequestDto;

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE INPUT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete route definition combining metadata, controller, and request factory.
 *
 * This is the primary type used to define routes in a framework-agnostic way.
 * Framework adapters (Hono, Fastify, Elysia) accept arrays of `RouteInput` and
 * register them with the underlying framework.
 *
 * The controller receives a validated `TRequestDto` and returns a `TResponseDto`
 * wrapping an {@link HttpResponse}. Framework adapters extract `.data` from the
 * response DTO to get the actual HTTP response.
 *
 * @typeParam TRequestDto - The validated request DTO type
 * @typeParam TResponseDto - The response DTO type (wraps HttpResponse)
 *
 * @example Single route definition
 * ```typescript
 * const createUserRoute: RouteInput<CreateUserRequestDto, CreateUserResponseDto> = {
 *   metadata: { path: '/users', method: 'POST' },
 *   controller: createUserController,
 *   requestDtoFactory: (req) => CreateUserRequestDto.create(req.body),
 * };
 * ```
 *
 * @example Route array for a resource
 * ```typescript
 * const userRoutes: RouteInput[] = [
 *   {
 *     metadata: { path: '/users', method: 'GET' },
 *     controller: listUsersController,
 *     requestDtoFactory: (req) => ListUsersRequestDto.create(req.queryParams),
 *   },
 *   {
 *     metadata: { path: '/users/{id}', method: 'GET' },
 *     controller: getUserController,
 *     requestDtoFactory: (req) => GetUserRequestDto.create(req.pathParams),
 *   },
 * ];
 * ```
 *
 * @example Registering with Hono
 * ```typescript
 * import { registerHonoRoutes } from '@cosmneo/onion-lasagna/backend/frameworks/hono';
 *
 * const app = new Hono();
 * registerHonoRoutes(app, userRoutes, { prefix: '/api/v1' });
 * ```
 */
export interface RouteInput<
  TRequestDto extends BaseDto<unknown> = BaseDto<unknown>,
  TResponseDto extends BaseDto<HttpResponse> = BaseDto<HttpResponse>,
> {
  /**
   * Route metadata defining the HTTP method and path.
   */
  metadata: RouteMetadata;

  /**
   * The controller that handles requests to this route.
   *
   * Receives a validated request DTO and returns a response DTO
   * wrapping an {@link HttpResponse}.
   */
  controller: Controller<TRequestDto, TResponseDto>;

  /**
   * Factory to create a validated request DTO from the raw framework request.
   *
   * The framework adapter calls this factory to transform the raw HTTP request
   * into a validated DTO before invoking the controller.
   *
   * @throws {ObjectValidationError} When the raw request fails DTO validation
   */
  requestDtoFactory: RequestDtoFactory<TRequestDto>;
}
