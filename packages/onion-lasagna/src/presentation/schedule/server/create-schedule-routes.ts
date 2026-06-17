/**
 * @fileoverview Internal implementation for creating schedule routes with auto-validation.
 *
 * Generates scheduled task handlers from a schedule router definition.
 * Each handler automatically validates the incoming run payload and context
 * against the task's schemas.
 *
 * @module schedule/server/create-schedule-routes
 * @internal
 */

import type { SchemaAdapter, ValidationIssue } from '../../http/schema/types';
import type {
  ScheduleRouterConfig,
  ScheduleRouterDefinition,
  ScheduledTaskDefinition,
} from '../task/types';
import { isScheduleRouterDefinition, collectScheduledTasks } from '../task/types';
import { generateTaskId } from '../task/utils';
import { mapErrorToScheduleResult } from '../shared/error-mapping';
import type { ScheduleResult } from '../shared/types';
import type {
  AnyScheduledTaskConfig,
  CreateScheduleRoutesOptions,
  RawSchedule,
  ScheduleMetadata,
  UnifiedScheduleInput,
  ValidatedSchedule,
} from './types';
import { isSimpleScheduledTaskConfig } from './types';

/**
 * Internal implementation for creating schedule routes.
 * Used by the builder pattern (scheduleRoutes).
 *
 * @internal
 */
export function createScheduleRoutesInternal<T extends ScheduleRouterConfig>(
  router: T | ScheduleRouterDefinition<T>,
  tasks: Record<string, AnyScheduledTaskConfig<ScheduledTaskDefinition, unknown, unknown>>,
  options?: CreateScheduleRoutesOptions,
): UnifiedScheduleInput[] {
  const config = isScheduleRouterDefinition(router) ? router.tasks : router;
  const collectedTasks = collectScheduledTasks(config);

  const result: UnifiedScheduleInput[] = [];

  const resolvedOptions: CreateScheduleRoutesOptions = {
    ...options,
    validatePayload: options?.validatePayload ?? true,
    allowPartial: options?.allowPartial ?? false,
  };

  for (const { key, task: taskDef } of collectedTasks) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taskConfig = tasks[key] as
      | AnyScheduledTaskConfig<ScheduledTaskDefinition, any, any>
      | undefined;

    if (!taskConfig) {
      if (resolvedOptions.allowPartial) {
        continue;
      }
      throw new Error(
        `Missing handler for scheduled task "${key}". All scheduled tasks must have a handler configuration.`,
      );
    }

    result.push(createScheduledTask(key, taskDef, taskConfig, resolvedOptions));
  }

  return result;
}

/**
 * Creates a single scheduled task handler with validation and error mapping.
 */
function createScheduledTask(
  key: string,
  taskDef: ScheduledTaskDefinition,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: AnyScheduledTaskConfig<ScheduledTaskDefinition, any, any>,
  options: CreateScheduleRoutesOptions,
): UnifiedScheduleInput {
  const middleware = config.middleware ?? [];
  const globalMiddleware = options?.middleware ?? [];
  const allMiddleware = [...globalMiddleware, ...middleware];
  const shouldValidatePayload = options.validatePayload ?? true;
  const errorMapper = options.errorMapper ?? mapErrorToScheduleResult;

  return {
    type: taskDef.type,
    metadata: {
      taskId: generateTaskId(key),
      summary: taskDef.docs.summary,
      description: taskDef.docs.description,
      tags: taskDef.docs.tags as string[],
      deprecated: taskDef.docs.deprecated,
    },
    handler: async (raw: RawSchedule): Promise<ScheduleResult> => {
      try {
        // Validate context (if schema defined)
        let validatedContext: unknown = raw.metadata;
        if (taskDef.context) {
          const contextResult = validateContextData(taskDef, raw.metadata);
          if (!contextResult.success) {
            const errors = contextResult.errors ?? [];
            return {
              outcome: 'failed',
              reason: `Context validation failed: ${errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
            };
          }
          validatedContext = contextResult.data;
        }

        // Validate payload (if enabled and schema defined)
        let validatedPayload: unknown = raw.payload;
        if (shouldValidatePayload && taskDef.payload) {
          const payloadResult = validatePayloadData(taskDef, raw.payload);
          if (!payloadResult.success) {
            const errors = payloadResult.errors ?? [];
            return {
              outcome: 'failed',
              reason: `Payload validation failed: ${errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
            };
          }
          validatedPayload = payloadResult.data;
        }

        const validatedSchedule: ValidatedScheduleInternal = {
          payload: validatedPayload,
          raw,
        };

        // Execute the pipeline
        const executePipeline = async (): Promise<ScheduleResult> => {
          if (isSimpleScheduledTaskConfig(config)) {
            return config.handler(
              validatedSchedule as unknown as ValidatedSchedule<ScheduledTaskDefinition>,
              validatedContext as ScheduleMetadata,
            );
          } else {
            const { payloadMapper, useCase, resultMapper } = config;

            const input = payloadMapper(
              validatedSchedule as unknown as ValidatedSchedule<ScheduledTaskDefinition>,
              validatedContext as ScheduleMetadata,
            );

            const output = await useCase.execute(input);

            return resultMapper ? resultMapper(output) : { outcome: 'completed' };
          }
        };

        if (allMiddleware.length === 0) {
          return await executePipeline();
        }

        // Build middleware chain
        let index = 0;
        const next = async (): Promise<ScheduleResult> => {
          if (index >= allMiddleware.length) {
            return executePipeline();
          }
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- index bounds checked above
          const mw = allMiddleware[index++]!;
          return mw(raw, next);
        };

        return await next();
      } catch (error) {
        // Error mapping must NEVER yield `skipped` — that outcome is reserved
        // for explicit pipeline decisions (handler / resultMapper / middleware).
        // Defensively coerce a stray `skipped` from an untyped (JS) custom mapper.
        const mapped: ScheduleResult = errorMapper(error);
        return mapped.outcome === 'skipped'
          ? { outcome: 'failed', reason: mapped.reason }
          : mapped;
      }
    },
  };
}

// ============================================================================
// Validation Helpers
// ============================================================================

interface ValidationResultInternal {
  success: boolean;
  errors?: ValidationIssue[];
  data?: unknown;
}

/**
 * Validates run payload against the task's payload schema.
 */
function validatePayloadData(
  task: ScheduledTaskDefinition,
  payload: unknown,
): ValidationResultInternal {
  const schema = task.payload as SchemaAdapter | undefined;
  if (!schema) return { success: true, data: payload };

  const result = schema.validate(payload);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.issues.map((issue) => ({
    ...issue,
    path: ['payload', ...issue.path],
  }));

  return { success: false, errors };
}

/**
 * Validates run metadata against the task's context schema.
 */
function validateContextData(
  task: ScheduledTaskDefinition,
  metadata: ScheduleMetadata,
): ValidationResultInternal {
  const schema = task.context as SchemaAdapter | undefined;
  if (!schema) return { success: true, data: metadata };

  const result = schema.validate(metadata);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.issues.map((issue) => ({
    ...issue,
    path: ['context', ...issue.path],
  }));

  return { success: false, errors };
}

/**
 * Internal validated schedule type with unknown fields.
 * Used inside createScheduledTask where specific types are erased.
 */
interface ValidatedScheduleInternal {
  readonly payload: unknown;
  readonly raw: RawSchedule;
}
