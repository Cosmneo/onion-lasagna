/**
 * @fileoverview Server types for the scheduled task system.
 *
 * @module schedule/server/types
 */

import type {
  ScheduledTaskDefinition,
  ScheduleRouterConfig,
  ScheduleRouterKeys,
} from '../task/types';
import type { ScheduleResult } from '../shared/types';

// Re-export UseCasePort from HTTP — same interface, no duplication
export type { UseCasePort } from '../../http/server/types';

// ============================================================================
// Raw Schedule (from the scheduling provider)
// ============================================================================

/**
 * Schedule metadata provided by the scheduling provider.
 */
export interface ScheduleMetadata {
  /**
   * Stable idempotency key for this run.
   * - Recurring: `${triggerId}:${scheduledFor}`
   * - One-time:  the provider's timer id
   */
  readonly runId: string;

  /** ISO 8601 timestamp of when the run was due. */
  readonly scheduledFor: string;

  /** ISO 8601 timestamp of when the run actually fired. */
  readonly firedAt: string;

  /** The triggerId that produced this run (recurring runs). */
  readonly triggerId?: string;

  /** Source system / scheduler that fired the run. */
  readonly source?: string;

  /** Number of delivery attempts (1-based). */
  readonly attemptCount?: number;

  /** Timezone the trigger was evaluated in. */
  readonly timezone?: string;

  /** Additional metadata from the scheduling provider. */
  readonly [key: string]: unknown;
}

/**
 * Raw schedule run from the scheduling provider.
 * This is the input to scheduled tasks before validation.
 */
export interface RawSchedule {
  /** Task type string for routing. */
  readonly type: string;

  /** Run payload (unvalidated). */
  readonly payload: unknown;

  /** Run metadata from the scheduling provider. */
  readonly metadata: ScheduleMetadata;
}

// ============================================================================
// Validated Schedule
// ============================================================================

/**
 * A validated schedule run with typed payload.
 * This is what tasks receive after validation passes.
 */
export interface ValidatedSchedule<T extends ScheduledTaskDefinition> {
  /** Validated run payload. */
  readonly payload: T['_types']['payload'];

  /** Raw schedule object for advanced use cases. */
  readonly raw: RawSchedule;
}

/**
 * Typed schedule context based on the task definition.
 * If the task defines a context schema, this will be the validated type.
 * Otherwise, it falls back to the generic ScheduleMetadata.
 */
export type TypedScheduleContext<T extends ScheduledTaskDefinition> =
  T['_types']['context'] extends undefined ? ScheduleMetadata : T['_types']['context'];

// ============================================================================
// Task Config Types
// ============================================================================

/**
 * Task configuration using the use case pattern.
 *
 * @typeParam T - The scheduled task definition type
 * @typeParam TInput - Use case input type
 * @typeParam TOutput - Use case output type
 */
export interface BuilderScheduledTaskConfig<
  T extends ScheduledTaskDefinition,
  TInput = void,
  TOutput = void,
> {
  /**
   * Maps the validated run payload to use case input.
   * Both `schedule` and `ctx` are fully typed based on task schemas.
   */
  readonly payloadMapper: (
    schedule: ValidatedSchedule<T>,
    ctx: TypedScheduleContext<T>,
  ) => TInput;

  /** The use case to execute. */
  readonly useCase: { execute(input?: TInput): Promise<TOutput> };

  /**
   * Maps the use case output to a ScheduleResult.
   * If omitted, defaults to `{ outcome: 'completed' }`.
   */
  readonly resultMapper?: (output: TOutput) => ScheduleResult;

  /** Middleware to run before the task. */
  readonly middleware?: readonly ScheduleMiddlewareFunction[];
}

/**
 * Simple task function that directly returns a ScheduleResult.
 */
export type SimpleScheduledTaskFn<T extends ScheduledTaskDefinition> = (
  schedule: ValidatedSchedule<T>,
  ctx: TypedScheduleContext<T>,
) => Promise<ScheduleResult> | ScheduleResult;

/**
 * Configuration for a simple task (no use case).
 */
export interface SimpleScheduledTaskConfig<T extends ScheduledTaskDefinition> {
  readonly handler: SimpleScheduledTaskFn<T>;
  readonly middleware?: readonly ScheduleMiddlewareFunction[];
}

/**
 * Union of all scheduled task config types.
 * Used internally to store tasks in the builder.
 */
export type AnyScheduledTaskConfig<
  T extends ScheduledTaskDefinition,
  TInput = unknown,
  TOutput = unknown,
> = BuilderScheduledTaskConfig<T, TInput, TOutput> | SimpleScheduledTaskConfig<T>;

/**
 * Type guard to check if config is a simple scheduled task.
 */
export function isSimpleScheduledTaskConfig(
  config: AnyScheduledTaskConfig<ScheduledTaskDefinition, unknown, unknown>,
): config is SimpleScheduledTaskConfig<ScheduledTaskDefinition> {
  return 'handler' in config && typeof config.handler === 'function';
}

/**
 * Schedule middleware function type.
 */
export type ScheduleMiddlewareFunction = (
  schedule: RawSchedule,
  next: () => Promise<ScheduleResult>,
) => Promise<ScheduleResult>;

// ============================================================================
// Server Configuration
// ============================================================================

/**
 * Configuration mapping task keys to task configs.
 */
// TInput/TOutput are user-defined per task - any is required for heterogeneous configs
export type ScheduleRoutesConfig<T extends ScheduleRouterConfig> = Record<
  ScheduleRouterKeys<T>,
  BuilderScheduledTaskConfig<any, any, any>
>;

/**
 * Options for creating schedule routes.
 */
export interface CreateScheduleRoutesOptions {
  /** Global middleware to run before all tasks. */
  readonly middleware?: readonly ScheduleMiddlewareFunction[];

  /**
   * Whether to validate incoming run payloads against task schemas.
   * When enabled, invalid payloads result in a `failed` outcome.
   * @default true
   */
  readonly validatePayload?: boolean;

  /**
   * Custom error mapper to override default error-to-ScheduleResult mapping.
   * If not provided, uses the built-in `mapErrorToScheduleResult`.
   *
   * Cannot return `skipped`: that outcome is reserved for explicit pipeline
   * decisions (handler / resultMapper / middleware). Error mapping only ever
   * yields `failed` (permanent) or `retry` (transient).
   */
  readonly errorMapper?: (
    error: unknown,
  ) => Exclude<ScheduleResult, { outcome: 'skipped' }>;

  /**
   * Allow partial task configuration (not all tasks need to be wired).
   * @default false
   * @internal Used by builder pattern's buildPartial()
   */
  readonly allowPartial?: boolean;
}

// ============================================================================
// Unified Schedule Input (for scheduling adapters)
// ============================================================================

/**
 * Schedule input compatible with scheduling adapters.
 * This is the output of scheduleRoutes().build().
 */
export interface UnifiedScheduleInput {
  /** Task type string for routing. */
  readonly type: string;

  /** Task handler function. */
  readonly handler: (raw: RawSchedule) => Promise<ScheduleResult>;

  /** Task metadata for documentation. */
  readonly metadata: {
    readonly taskId?: string;
    readonly summary?: string;
    readonly description?: string;
    readonly tags?: readonly string[];
    readonly deprecated?: boolean;
  };
}
