/**
 * @fileoverview Route module exports.
 *
 * This module provides route and router definition functions and types
 * for the unified system.
 *
 * @module unified/route
 *
 * @example Define a route
 * ```typescript
 * import { defineRoute } from '@cosmneo/onion-lasagna/http';
 * import { zodSchema, z } from '@cosmneo/onion-lasagna/http/schema/zod';
 *
 * const getUser = defineRoute({
 *   method: 'GET',
 *   path: '/api/users/:userId',
 *   responses: {
 *     200: {
 *       description: 'User found',
 *       schema: zodSchema(z.object({
 *         id: z.string(),
 *         name: z.string(),
 *       })),
 *     },
 *     404: { description: 'User not found' },
 *   },
 * });
 * ```
 *
 * @example Define a router
 * ```typescript
 * import { defineRouter } from '@cosmneo/onion-lasagna/http';
 *
 * const api = defineRouter({
 *   users: {
 *     get: getUserRoute,
 *     list: listUsersRoute,
 *     create: createUserRoute,
 *   },
 * });
 * ```
 */

// Export factory functions
export { defineRoute } from './define-route';
export { defineRouter, mergeRouters } from './define-router';
export type { DefineRouterOptions } from './define-router';

// Export all types
export * from './types';
