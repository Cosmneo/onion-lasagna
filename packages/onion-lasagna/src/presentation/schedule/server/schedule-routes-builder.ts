/**
 * @fileoverview Builder pattern for creating type-safe schedule routes.
 *
 * The `scheduleRoutes` function returns a builder that provides 100% type
 * inference for all task handler parameters — no manual type annotations
 * required.
 *
 * @module schedule/server/schedule-routes-builder
 */

import type {
  ScheduleRouterConfig,
  ScheduleRouterDefinition,
  GetScheduledTask,
  ScheduleRouterKeys,
  ScheduledTaskDefinition,
} from '../task/types';
import type {
  AnyScheduledTaskConfig,
  BuilderScheduledTaskConfig,
  CreateScheduleRoutesOptions,
  SimpleScheduledTaskConfig,
  SimpleScheduledTaskFn,
  UnifiedScheduleInput,
} from './types';
import { createScheduleRoutesInternal } from './create-schedule-routes';

// ============================================================================
// Builder Types
// ============================================================================

/**
 * Error type displayed when attempting to build() with missing handlers.
 * The `___missingTasks` property shows which tasks are missing.
 */
export interface MissingTasksError<TMissing extends string> {
  /**
   * This error indicates that not all scheduled tasks have been wired.
   * Use buildPartial() to build with only the defined tasks,
   * or add handlers for the missing tasks.
   */
  (options?: never): never;
  /** Scheduled tasks that are missing. */
  readonly ___missingTasks: TMissing;
}

/**
 * Builder interface for creating type-safe schedule routes.
 *
 * Each `.handle()` call captures the specific task type and provides
 * full type inference for payloadMapper and useCase.
 *
 * @typeParam T - The schedule router configuration type
 * @typeParam THandled - Union of task keys that have been wired (accumulates)
 *
 * @example
 * ```typescript
 * const routes = scheduleRoutes(billingSchedules)
 *   .handleWithUseCase('dailyReconcile', {
 *     payloadMapper: (schedule, ctx) => ({
 *       tenantId: schedule.payload.tenantId, // Fully typed!
 *       runId: ctx.runId,                    // Fully typed!
 *     }),
 *     useCase: reconcileUseCase,
 *   })
 *   .handle('monthlyInvoice', async () => {
 *     await emitInvoices();
 *     return { outcome: 'completed' as const };
 *   })
 *   .build();
 * ```
 */
export interface ScheduleRoutesBuilder<
  T extends ScheduleRouterConfig,
  THandled extends string = never,
> {
  /**
   * Register a simple handler for a scheduled task.
   * The handler receives the validated schedule and context, returns a
   * ScheduleResult directly.
   */
  handle<K extends Exclude<ScheduleRouterKeys<T>, THandled>>(
    key: K,
    handlerOrConfig:
      | SimpleScheduledTaskFn<GetScheduledTask<T, K>>
      | SimpleScheduledTaskConfig<GetScheduledTask<T, K>>,
  ): ScheduleRoutesBuilder<T, THandled | K>;

  /**
   * Register a handler using the use case pattern.
   * Follows: payloadMapper → useCase.execute() → resultMapper (or completed)
   */
  handleWithUseCase<K extends Exclude<ScheduleRouterKeys<T>, THandled>, TInput, TOutput>(
    key: K,
    config: BuilderScheduledTaskConfig<GetScheduledTask<T, K>, TInput, TOutput>,
  ): ScheduleRoutesBuilder<T, THandled | K>;

  /**
   * Build the schedule routes array for scheduling adapter registration.
   *
   * This method is only available when ALL tasks have been wired.
   * If some tasks are missing, use `buildPartial()` instead.
   */
  build: [Exclude<ScheduleRouterKeys<T>, THandled>] extends [never]
    ? (options?: CreateScheduleRoutesOptions) => UnifiedScheduleInput[]
    : MissingTasksError<Exclude<ScheduleRouterKeys<T>, THandled>>;

  /**
   * Build schedule routes for only the defined tasks.
   * No compile-time enforcement of completeness.
   */
  buildPartial(options?: CreateScheduleRoutesOptions): UnifiedScheduleInput[];
}

// ============================================================================
// Builder Implementation
// ============================================================================

/**
 * Internal builder implementation.
 *
 * Uses an immutable pattern where each handle() call returns a new
 * builder instance with the updated tasks map.
 */
class ScheduleRoutesBuilderImpl<T extends ScheduleRouterConfig, THandled extends string = never> {
  private readonly router: T | ScheduleRouterDefinition<T>;
  private readonly tasks: Map<
    string,
    AnyScheduledTaskConfig<ScheduledTaskDefinition, unknown, unknown>
  >;

  constructor(
    router: T | ScheduleRouterDefinition<T>,
    tasks?: Map<string, AnyScheduledTaskConfig<ScheduledTaskDefinition, unknown, unknown>>,
  ) {
    this.router = router;
    this.tasks = tasks ?? new Map();
  }

  handle<K extends Exclude<ScheduleRouterKeys<T>, THandled>>(
    key: K,
    handlerOrConfig:
      | SimpleScheduledTaskFn<GetScheduledTask<T, K>>
      | SimpleScheduledTaskConfig<GetScheduledTask<T, K>>,
  ): ScheduleRoutesBuilder<T, THandled | K> {
    const config: SimpleScheduledTaskConfig<ScheduledTaskDefinition> =
      typeof handlerOrConfig === 'function'
        ? { handler: handlerOrConfig as SimpleScheduledTaskFn<ScheduledTaskDefinition> }
        : (handlerOrConfig as SimpleScheduledTaskConfig<ScheduledTaskDefinition>);

    const newTasks = new Map(this.tasks);
    newTasks.set(key as string, config);

    return new ScheduleRoutesBuilderImpl<T, THandled | K>(
      this.router,
      newTasks,
    ) as unknown as ScheduleRoutesBuilder<T, THandled | K>;
  }

  handleWithUseCase<K extends Exclude<ScheduleRouterKeys<T>, THandled>, TInput, TOutput>(
    key: K,
    config: BuilderScheduledTaskConfig<GetScheduledTask<T, K>, TInput, TOutput>,
  ): ScheduleRoutesBuilder<T, THandled | K> {
    const newTasks = new Map(this.tasks);
    newTasks.set(
      key as string,
      config as BuilderScheduledTaskConfig<ScheduledTaskDefinition, unknown, unknown>,
    );

    return new ScheduleRoutesBuilderImpl<T, THandled | K>(
      this.router,
      newTasks,
    ) as unknown as ScheduleRoutesBuilder<T, THandled | K>;
  }

  build(options?: CreateScheduleRoutesOptions): UnifiedScheduleInput[] {
    return createScheduleRoutesInternal(this.router, Object.fromEntries(this.tasks), options);
  }

  buildPartial(options?: CreateScheduleRoutesOptions): UnifiedScheduleInput[] {
    return createScheduleRoutesInternal(this.router, Object.fromEntries(this.tasks), {
      ...options,
      allowPartial: true,
    });
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Creates a type-safe schedule routes builder for a schedule router.
 *
 * The builder pattern provides 100% type inference for all task parameters:
 * - `schedule.payload` is typed from the task's payload schema
 * - `ctx` is typed from the task's context schema (or ScheduleMetadata)
 * - `output` in resultMapper is typed from the use case
 *
 * @param router - Schedule router definition or schedule router config
 * @returns Builder for registering task handlers
 *
 * @example Basic usage
 * ```typescript
 * import { scheduleRoutes } from '@cosmneo/onion-lasagna/schedule/server';
 * import { billingSchedules } from './schedules/router';
 *
 * const routes = scheduleRoutes(billingSchedules)
 *   .handleWithUseCase('dailyReconcile', {
 *     payloadMapper: (schedule, ctx) => ({
 *       tenantId: schedule.payload.tenantId,
 *       runId: ctx.runId,
 *     }),
 *     useCase: reconcileUseCase,
 *   })
 *   .handle('monthlyInvoice', async () => {
 *     await emitInvoices();
 *     return { outcome: 'completed' as const };
 *   })
 *   .build();
 * ```
 */
export function scheduleRoutes<T extends ScheduleRouterConfig>(
  router: T | ScheduleRouterDefinition<T>,
): ScheduleRoutesBuilder<T, never> {
  return new ScheduleRoutesBuilderImpl(router) as unknown as ScheduleRoutesBuilder<T, never>;
}
