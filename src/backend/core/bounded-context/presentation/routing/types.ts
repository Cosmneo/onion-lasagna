/**
 * Generic controller interface - any controller with an execute method.
 */
export interface ExecutableController {
  execute(input: unknown): Promise<unknown>;
}

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
 */
export interface RouteInput<TController extends ExecutableController = ExecutableController> {
  metadata: RouteMetadata;
  controller: TController;
}

/**
 * Compiled route definition with regex pattern for matching.
 */
export interface RouteDefinition<
  TController extends ExecutableController = ExecutableController,
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
 */
export interface ResolvedRoute<TController extends ExecutableController = ExecutableController> {
  route: RouteDefinition<TController>;
  pathParams: Record<string, string>;
}
