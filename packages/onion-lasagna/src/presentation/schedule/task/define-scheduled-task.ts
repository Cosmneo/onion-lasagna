/**
 * @fileoverview Factory function for creating scheduled task definitions.
 *
 * The `defineScheduledTask` function is the main entry point for defining
 * scheduled tasks. It mirrors `defineEventHandler` from the events layer but
 * is tailored for scheduled (recurring / one-time) work.
 *
 * NOTE: a task carries NO timing information — the WHEN/HOW is bound separately
 * via `defineScheduleTriggers` (see `ScheduleTrigger`).
 *
 * @module schedule/task/define-scheduled-task
 */

import type { SchemaAdapter, InferOutput } from '../../http/schema/types';
import type { ScheduledTaskDefinition } from './types';

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input for defineScheduledTask.
 *
 * @example Basic task with payload schema
 * ```typescript
 * defineScheduledTask({
 *   type: 'billing.dailyReconcile',
 *   payload: zodSchema(z.object({ tenantId: z.string() })),
 *   docs: { summary: 'Reconcile billing nightly', tags: ['billing'] },
 * })
 * ```
 *
 * @example With context schema
 * ```typescript
 * defineScheduledTask({
 *   type: 'reports.weeklyDigest',
 *   payload: zodSchema(reportPayloadSchema),
 *   context: zodSchema(scheduleMetadataSchema),
 * })
 * ```
 */
interface DefineScheduledTaskInput<
  TType extends string,
  TPayload extends SchemaAdapter | undefined = undefined,
  TContext extends SchemaAdapter | undefined = undefined,
> {
  /** Task type string used for routing (e.g., 'billing.dailyReconcile'). */
  readonly type: TType;

  /** Payload validation schema. */
  readonly payload?: TPayload;

  /** Context validation schema (validates schedule metadata). */
  readonly context?: TContext;

  /** Task documentation. */
  readonly docs?: {
    readonly summary?: string;
    readonly description?: string;
    readonly tags?: readonly string[];
    readonly deprecated?: boolean;
  };
}

// ============================================================================
// Return type helpers
// ============================================================================

type ResolvePayload<T> = T extends SchemaAdapter ? InferOutput<T> : undefined;
type ResolveContext<T> = T extends SchemaAdapter ? InferOutput<T> : undefined;

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Creates a scheduled task definition from the provided configuration.
 *
 * This is the main entry point for defining scheduled tasks. The resulting
 * definition can be used for type-safe task registration, payload validation,
 * and catalog generation.
 *
 * @param input - Scheduled task configuration with optional schemas
 * @returns A frozen ScheduledTaskDefinition object with full type information
 */
export function defineScheduledTask<
  TType extends string,
  TPayload extends SchemaAdapter | undefined = undefined,
  TContext extends SchemaAdapter | undefined = undefined,
>(
  input: DefineScheduledTaskInput<TType, TPayload, TContext>,
): ScheduledTaskDefinition<TType, ResolvePayload<TPayload>, ResolveContext<TContext>> {
  const definition = {
    type: input.type,
    payload: input.payload ?? undefined,
    context: input.context ?? undefined,
    docs: {
      summary: input.docs?.summary,
      description: input.docs?.description,
      tags: input.docs?.tags,
      deprecated: input.docs?.deprecated ?? false,
    },
    _types: undefined as unknown,
  };

  return Object.freeze(definition) as ScheduledTaskDefinition<
    TType,
    ResolvePayload<TPayload>,
    ResolveContext<TContext>
  >;
}
