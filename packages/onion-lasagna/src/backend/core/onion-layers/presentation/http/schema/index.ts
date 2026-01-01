/**
 * @fileoverview Schema module exports.
 *
 * This module provides schema adapters and types for the unified route system.
 * Adapters wrap validation libraries (Zod, TypeBox, etc.) with a consistent
 * interface for validation and JSON Schema generation.
 *
 * @module unified/schema
 *
 * @example Using with Zod
 * ```typescript
 * import { zodSchema, z } from '@cosmneo/onion-lasagna/unified/schema/zod';
 *
 * const userSchema = zodSchema(z.object({
 *   name: z.string(),
 *   email: z.string().email(),
 * }));
 * ```
 *
 * @example Using with TypeBox
 * ```typescript
 * import { typeboxSchema, Type } from '@cosmneo/onion-lasagna/unified/schema/typebox';
 *
 * const userSchema = typeboxSchema(Type.Object({
 *   name: Type.String(),
 *   email: Type.String({ format: 'email' }),
 * }));
 * ```
 */

// Export all types
export * from './types';

// Export adapters
export { zodSchema, z } from './adapters/zod.adapter';
export { typeboxSchema, Type } from './adapters/typebox.adapter';
