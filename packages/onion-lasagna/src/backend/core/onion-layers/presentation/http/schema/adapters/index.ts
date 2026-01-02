/**
 * @fileoverview Schema adapter exports.
 *
 * Import adapters from the specific modules to ensure tree-shaking
 * only includes the validation libraries you actually use.
 *
 * @module unified/schema/adapters
 */

// Re-export from specific adapter files
// Users should import from '@cosmneo/onion-lasagna/http/schema/zod' etc.
// This file is for internal use only

export { zodSchema, z } from './zod.adapter';
export { typeboxSchema, Type } from './typebox.adapter';
