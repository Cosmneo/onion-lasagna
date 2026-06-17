/**
 * @fileoverview Core scheduled task definition types.
 *
 * A scheduled task definition captures all information needed for:
 * - Type-safe payload validation
 * - Server-side schedule routing and dispatching
 * - Catalog / documentation generation
 *
 * A scheduled task is the WHAT (the contract + the unit of work). It is kept
 * deliberately separate from the WHEN/HOW (the trigger binding — see
 * `ScheduleTrigger`), so the same task contract can be wired to different
 * triggers per deployment.
 *
 * @module schedule/task/types/scheduled-task-definition
 */

import type { SchemaAdapter } from '../../../http/schema/types';

// ============================================================================
// Documentation Types
// ============================================================================

/**
 * Scheduled task documentation for catalog / docs generation.
 */
export interface ScheduledTaskDocumentation {
  /** Short summary of the task. */
  readonly summary?: string;

  /** Detailed description. Supports Markdown. */
  readonly description?: string;

  /** Tags for grouping scheduled tasks. */
  readonly tags?: readonly string[];

  /** Whether this task is deprecated. @default false */
  readonly deprecated?: boolean;
}

// ============================================================================
// Scheduled Task Definition
// ============================================================================

/**
 * A fully defined scheduled task with computed types.
 * This is the output of `defineScheduledTask()`.
 *
 * NOTE: there is intentionally NO `schedule`/`cron` field here — the timing is
 * bound separately via `defineScheduleTriggers` (the WHEN/HOW). This keeps the
 * task contract free of deployment concerns.
 */
export interface ScheduledTaskDefinition<
  TType extends string = string,
  TPayload = undefined,
  TContext = undefined,
> {
  /** Task type string used for routing (e.g., 'billing.dailyReconcile'). */
  readonly type: TType;

  /** Payload validation schema. */
  readonly payload: SchemaAdapter | undefined;

  /** Context validation schema (validates schedule metadata). */
  readonly context: SchemaAdapter | undefined;

  /** Task documentation. */
  readonly docs: ScheduledTaskDocumentation;

  /**
   * Phantom types for TypeScript inference.
   * Never accessed at runtime.
   * @internal
   */
  readonly _types: {
    readonly type: TType;
    readonly payload: TPayload;
    readonly context: TContext;
  };
}

// ============================================================================
// Type Helpers
// ============================================================================

/** Infers the task type string from a task definition. */
export type InferScheduledTaskType<T> =
  T extends ScheduledTaskDefinition<infer TType, unknown, unknown> ? TType : never;

/** Infers the payload type from a task definition. */
export type InferScheduledTaskPayload<T> =
  T extends ScheduledTaskDefinition<string, infer TPayload, unknown> ? TPayload : never;

/** Infers the context type from a task definition. */
export type InferScheduledTaskContext<T> =
  T extends ScheduledTaskDefinition<string, unknown, infer TContext> ? TContext : never;
