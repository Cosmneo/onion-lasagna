/**
 * @fileoverview Bridge utility to create RouteInput from RouteContract.
 *
 * This module provides the `createRouteFromContract` function that converts
 * a shared RouteContract into a RouteInput for server-side route registration.
 *
 * @example
 * ```typescript
 * import { createRouteFromContract } from '@cosmneo/onion-lasagna/backend/core/presentation';
 * import { createProjectContract } from '../contracts';
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
 * @module create-route-from-contract
 */

import type { RouteContract } from '../../../../../shared/contracts';
import type { BaseDto } from '../../../global/classes/base-dto.class';
import type { Controller } from '../interfaces/types/controller.type';
import type { HttpResponse } from '../interfaces/types/http/http-response';
import type { RequestDtoFactory, RouteInput } from './routing.type';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE INPUT FROM CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for creating a RouteInput from a RouteContract.
 *
 * @typeParam TRequest - The protocol-specific request type (e.g., HttpRequest)
 * @typeParam TContract - The RouteContract type
 * @typeParam TRequestDto - The validated request DTO type
 * @typeParam TResponseDto - The response DTO type
 */
export interface RouteInputFromContract<
  TRequest,
  TContract extends RouteContract,
  TRequestDto extends BaseDto<unknown> = BaseDto<unknown>,
  TResponseDto extends BaseDto<HttpResponse> = BaseDto<HttpResponse>,
> {
  /**
   * The route contract providing path, method, and type inference.
   * This is the single source of truth for route definition.
   */
  contract: TContract;

  /**
   * The controller that handles requests to this route.
   */
  controller: Controller<TRequestDto, TResponseDto>;

  /**
   * Factory to create a validated request DTO from the raw protocol request.
   */
  requestDtoFactory: RequestDtoFactory<TRequest, TRequestDto>;
}

/**
 * Creates a RouteInput from a RouteContract and implementation details.
 *
 * This bridges the shared contract (types) with the server-side implementation
 * (controller, validator, DTO factory), producing a RouteInput that can be
 * registered with any framework adapter.
 *
 * @typeParam TRequest - The protocol-specific request type
 * @typeParam TContract - The RouteContract type
 * @typeParam TRequestDto - The validated request DTO type
 * @typeParam TResponseDto - The response DTO type
 *
 * @param input - Configuration containing contract and implementation
 * @returns A RouteInput ready for framework registration
 *
 * @example Basic usage
 * ```typescript
 * const createProjectRoute = createRouteFromContract({
 *   contract: createProjectContract,
 *   controller: createProjectController,
 *   requestDtoFactory: (req) =>
 *     new CreateProjectRequestDto(
 *       req as CreateProjectRequestData,
 *       createProjectRequestValidator,
 *     ),
 * });
 *
 * registerHonoRoutes(app, [createProjectRoute]);
 * ```
 *
 * @example Building routes array
 * ```typescript
 * export function createProjectManagementRoutes(
 *   controllers: ProjectManagementControllers,
 * ): RouteInput<HttpRequest>[] {
 *   return [
 *     createRouteFromContract({
 *       contract: createProjectContract,
 *       controller: controllers.createProjectController,
 *       requestDtoFactory: (req) =>
 *         new CreateProjectRequestDto(req, createProjectRequestValidator),
 *     }),
 *     createRouteFromContract({
 *       contract: listProjectsContract,
 *       controller: controllers.listProjectsController,
 *       requestDtoFactory: (req) =>
 *         new ListProjectsRequestDto(req, listProjectsRequestValidator),
 *     }),
 *     // ... more routes
 *   ];
 * }
 * ```
 */
export function createRouteFromContract<
  TRequest,
  TContract extends RouteContract,
  TRequestDto extends BaseDto<unknown>,
  TResponseDto extends BaseDto<HttpResponse>,
>(
  input: RouteInputFromContract<TRequest, TContract, TRequestDto, TResponseDto>,
): RouteInput<TRequest, TRequestDto, TResponseDto> {
  return {
    metadata: {
      path: input.contract.path,
      method: input.contract.method,
    },
    controller: input.controller,
    requestDtoFactory: input.requestDtoFactory,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH HELPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates multiple RouteInputs from RouteContracts.
 *
 * A convenience wrapper for creating multiple routes at once.
 *
 * @param inputs - Array of RouteInputFromContract configurations
 * @returns Array of RouteInputs ready for framework registration
 *
 * @example
 * ```typescript
 * const routes = createRoutesFromContracts([
 *   { contract: createProjectContract, controller: ctrl.create, requestDtoFactory: ... },
 *   { contract: listProjectsContract, controller: ctrl.list, requestDtoFactory: ... },
 * ]);
 * ```
 */
export function createRoutesFromContracts<TRequest>(
  inputs: RouteInputFromContract<TRequest, RouteContract, BaseDto<unknown>, BaseDto<HttpResponse>>[],
): RouteInput<TRequest>[] {
  return inputs.map((input) => createRouteFromContract(input));
}
