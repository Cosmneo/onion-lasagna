/**
 * Access guard types for controller authorization.
 *
 * Provides type definitions for the authorization pattern used by
 * {@link GuardedController} and the {@link AllowRequest} decorator.
 * Guards can be synchronous or asynchronous, enabling both simple
 * checks and complex authorization logic.
 *
 * @example Synchronous guard (simple role check)
 * ```typescript
 * const adminGuard: AccessGuard<Request> = (req) => ({
 *   isAllowed: req.user?.role === 'admin',
 *   reason: 'Admin access required',
 * });
 * ```
 *
 * @example Asynchronous guard (database lookup)
 * ```typescript
 * const resourceOwnerGuard: AccessGuard<Request> = async (req) => {
 *   const resource = await db.findById(req.resourceId);
 *   return {
 *     isAllowed: resource?.ownerId === req.user?.id,
 *     reason: 'You do not own this resource',
 *   };
 * };
 * ```
 *
 * @module
 */
import type { AccessGuardResult } from './access-guard-result.type';

/**
 * Function type for authorization checks in controllers.
 *
 * An AccessGuard receives the incoming request and returns an
 * {@link AccessGuardResult} indicating whether access should be granted.
 * Guards can be synchronous or return a Promise for async operations.
 *
 * @typeParam T - The request type being guarded (defaults to `unknown`)
 * @param request - The incoming request to evaluate
 * @returns An {@link AccessGuardResult} or Promise resolving to one
 *
 * @example With GuardedController
 * ```typescript
 * const guard: AccessGuard<MyRequest> = (req) => ({
 *   isAllowed: req.authenticated,
 * });
 *
 * class MyController extends GuardedController<MyRequest, MyResponse> {
 *   constructor() {
 *     super({ accessGuard: guard, ... });
 *   }
 * }
 * ```
 *
 * @example With @AllowRequest decorator
 * ```typescript
 * @AllowRequest<Request>((req) => ({
 *   isAllowed: req.user != null,
 * }))
 * async execute(input: Request): Promise<Response> { ... }
 * ```
 */
export type AccessGuard<T = unknown> = (
  request: T,
) => AccessGuardResult | Promise<AccessGuardResult>;
