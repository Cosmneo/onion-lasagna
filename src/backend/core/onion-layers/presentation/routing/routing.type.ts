import type { Controller } from '../interfaces/types/controller.type';

/**
 * HTTP endpoint metadata (method + path).
 */
export interface RouteMetadata {
  /**
   * The path pattern for the route (e.g., '/users/{id}').
   */
  servicePath: string;

  /**
   * The HTTP method (e.g., 'GET', 'POST', 'PUT', 'DELETE').
   */
  method: string;
}

/**
 * Input for creating a route (before pattern compilation).
 *
 * @typeParam TController - The controller type. Must implement {@link Controller}.
 */
export interface RouteInput<TController extends Controller = Controller> {
  metadata: RouteMetadata;
  controller: TController;
}

/**
 * Compiled route definition with regex pattern for matching.
 *
 * @typeParam TController - The controller type. Must implement {@link Controller}.
 */
export interface RouteDefinition<
  TController extends Controller = Controller,
> extends RouteInput<TController> {
  /**
   * Compiled regex pattern for path matching.
   */
  pattern: RegExp;

  /**
   * Parameter names extracted from placeholders in order.
   * @example '/users/{id}/orders/{orderId}' → ['id', 'orderId']
   */
  paramNames: string[];
}

/**
 * Result of route resolution containing matched route and extracted path parameters.
 *
 * @typeParam TController - The controller type. Must implement {@link Controller}.
 */
export interface ResolvedRoute<TController extends Controller = Controller> {
  route: RouteDefinition<TController>;
  pathParams: Record<string, string>;
}
